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
  CfnOutput,
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
  public readonly plotsTable: dynamodb.Table;
  public readonly mediaBucket: s3.Bucket;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly assetsBaseUrl: string;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    // dev only — non-prod envs DESTROY (and auto-empty the bucket) so `cdk destroy`
    // tears the whole stack down for a hackathon; prod keeps RETAIN to prevent data loss.
    const isProd = props.baseConfig.env === "prod";
    const removalPolicy = isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    this.profilesTable = new dynamodb.Table(this, "ProfilesTable", {
      tableName: dataConfig.profilesTableName,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy,
    });

    // Saved land plots per user (signed-in accounts): userId partition, plotId sort key.
    this.plotsTable = new dynamodb.Table(this, "PlotsTable", {
      tableName: dataConfig.plotsTableName,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "plotId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy,
    });

    this.mediaBucket = new s3.Bucket(this, "MediaBucket", {
      bucketName: dataConfig.mediaBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy,
      autoDeleteObjects: !isProd,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });

    // Email logo is served from the Amplify-hosted frontend, which is itself S3 behind
    // CloudFront, so clients always load it. Per-env base URL (dev app domain / custom domain).
    this.assetsBaseUrl = dataConfig.assetBaseUrl;
    new CfnOutput(this, "AssetsBaseUrl", { value: this.assetsBaseUrl });

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: dataConfig.userPoolName,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      // ponytail: Cognito sends confirm/reset mail via its default sender until the SES
      // domain is verified; set SES_READY=true and redeploy to route them from the
      // configured info@ sender. Avoids a deploy failure when the domain isn't verified yet.
      email:
        process.env.SES_READY === "true"
          ? cognito.UserPoolEmail.withSES({
              fromEmail: dataConfig.sesSender,
              fromName: "Tlaloc",
              sesVerifiedDomain: dataConfig.sesDomain,
            })
          : undefined,
      removalPolicy,
    });

    this.userPoolClient = this.userPool.addClient("WebClient", {
      userPoolClientName: dataConfig.userPoolClientName,
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
    });

    // The SES domain identity is an account+region-global singleton shared across envs
    // (same domain). Only the dev stack creates/owns it with Easy DKIM (records pasted into
    // Namecheap); other envs reference it by its deterministic ARN so their deploys don't
    // collide on the already-existing identity.
    // ponytail: dev owns the SES identity — if dev is ever destroyed, re-create the identity
    // before relying on prod email. Move to a dedicated shared stack if that becomes a problem.
    const sesIdentityArn = this.formatArn({
      service: "ses",
      resource: "identity",
      resourceName: dataConfig.sesDomain,
    });
    if (props.baseConfig.env === "dev") {
      new ses.EmailIdentity(this, "DomainIdentity", {
        identity: ses.Identity.domain(dataConfig.sesDomain),
      });
    }

    this.addCognitoTriggers(sesIdentityArn, this.assetsBaseUrl);
  }

  // ponytail: these trigger lambdas are stateless, but they live in this stateful stack
  // because they're pool-coupled — native userPool.addTrigger() is cycle-free only within
  // one stack, and co-locating them makes DataStack's deploy self-contained (the pool,
  // the trigger functions, and their invoke permissions are created atomically, so Cognito
  // can validate trigger existence at pool-create time). Splitting them out reintroduces a
  // cross-stack deploy-order failure.
  private addCognitoTriggers(sesIdentityArn: string, assetsBaseUrl: string): void {
    const base = (name: string, entry: string) =>
      new nodejs.NodejsFunction(this, name, {
        functionName: buildName(name),
        entry: path.join(triggerDir, entry),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        logGroup: new logs.LogGroup(this, `${name}-logs`, {
          logGroupName: `/aws/lambda/${buildName(name)}`,
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        tracing: lambda.Tracing.ACTIVE,
        bundling: { minify: true, externalModules: triggerBundlingExternals },
      });

    const customMessage = base("custom-message", "custom-message.ts");
    const postConfirmation = base("post-confirmation", "post-confirmation.ts");

    customMessage.addEnvironment("TLALOC_ASSET_BASE_URL", assetsBaseUrl);
    postConfirmation.addEnvironment("TLALOC_ASSET_BASE_URL", assetsBaseUrl);

    // SESv2's SendEmail has no CDK grant method on this grantee; the EmailIdentity's
    // grantSendEmail isn't reachable here, so scope a PolicyStatement to the one identity ARN.
    postConfirmation.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail"],
        resources: [sesIdentityArn],
      }),
    );

    this.userPool.addTrigger(cognito.UserPoolOperation.CUSTOM_MESSAGE, customMessage);
    this.userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmation);
  }
}
