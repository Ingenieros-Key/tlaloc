import { Stack, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  aws_cognito as cognito,
  aws_ses as ses,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs,
  aws_logs as logs,
  aws_iam as iam,
} from "aws-cdk-lib";
import * as path from "path";
import { DataStackProps } from "@stack-types/data.types";
import { dataConfig } from "@config/data.config";
import { buildName } from "@utils/name-builder";

const triggerDir = path.join(__dirname, "../../../backend/src/triggers");

// ponytail: Nest's optional transports are behind try/catch dynamic imports esbuild still
// walks; these triggers don't import Nest, but the externals list is shared with the API
// Lambda's bundling for consistency and is harmless when the modules aren't referenced.
const triggerBundlingExternals = [
  "@nestjs/websockets/socket-module",
  "@nestjs/microservices/microservices-module",
  "@nestjs/websockets",
  "@nestjs/microservices",
  "@nestjs/platform-socket.io",
  "cache-manager",
];

/** Stateful stack: DynamoDB profiles table, media bucket, Cognito user pool, SES domain identity. */
export class DataStack extends Stack {
  public readonly profilesTable: dynamodb.Table;
  public readonly mediaBucket: s3.Bucket;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    this.profilesTable = new dynamodb.Table(this, "ProfilesTable", {
      tableName: dataConfig.profilesTableName,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.mediaBucket = new s3.Bucket(this, "MediaBucket", {
      bucketName: dataConfig.mediaBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: dataConfig.userPoolName,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: { minLength: 8, requireDigits: true, requireLowercase: true, requireUppercase: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.userPoolClient = this.userPool.addClient("WebClient", {
      userPoolClientName: dataConfig.userPoolClientName,
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
    });

    // ponytail: SES identity created with Easy DKIM; CNAME records are an output
    // to paste into Namecheap. Flip to Route53 auto-records if DNS ever moves.
    new ses.EmailIdentity(this, "DomainIdentity", {
      identity: ses.Identity.domain(dataConfig.sesDomain),
    });

    this.addCognitoTriggers();
  }

  // ponytail: these trigger lambdas are stateless, but they live in this stateful stack
  // because they're pool-coupled — native userPool.addTrigger() is cycle-free only within
  // one stack, and co-locating them makes DataStack's deploy self-contained (the pool,
  // the trigger functions, and their invoke permissions are created atomically, so Cognito
  // can validate trigger existence at pool-create time). Splitting them out reintroduces a
  // cross-stack deploy-order failure.
  private addCognitoTriggers(): void {
    const base = (name: string, entry: string) =>
      new nodejs.NodejsFunction(this, name, {
        functionName: buildName(name),
        entry: path.join(triggerDir, entry),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        logRetention: logs.RetentionDays.TWO_WEEKS,
        tracing: lambda.Tracing.ACTIVE,
        bundling: { minify: true, externalModules: triggerBundlingExternals },
      });

    const customMessage = base("custom-message", "custom-message.ts");
    const postConfirmation = base("post-confirmation", "post-confirmation.ts");

    // SESv2's SendEmail has no CDK grant method on this grantee; the EmailIdentity's
    // grantSendEmail isn't reachable here, so scope a PolicyStatement to identity ARNs.
    postConfirmation.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail"],
        resources: [`arn:aws:ses:${this.region}:${this.account}:identity/*`],
      }),
    );

    this.userPool.addTrigger(cognito.UserPoolOperation.CUSTOM_MESSAGE, customMessage);
    this.userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmation);
  }
}
