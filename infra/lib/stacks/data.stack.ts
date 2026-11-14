import { Stack, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  aws_cognito as cognito,
  aws_ses as ses,
} from "aws-cdk-lib";
import { DataStackProps } from "@stack-types/data.types";
import { dataConfig } from "@config/data.config";

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
      userPoolClientName: dataConfig.userPoolName + "-web",
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
    });

    // ponytail: SES identity created with Easy DKIM; CNAME records are an output
    // to paste into Namecheap. Flip to Route53 auto-records if DNS ever moves.
    new ses.EmailIdentity(this, "DomainIdentity", {
      identity: ses.Identity.domain(dataConfig.sesDomain),
    });
  }
}
