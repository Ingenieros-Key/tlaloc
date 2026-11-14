import { StackProps } from "aws-cdk-lib";
import {
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  aws_cognito as cognito,
} from "aws-cdk-lib";
import { BaseConfig } from "@stack-types/base.types";

export type ServicesStackProps = StackProps & {
  readonly baseConfig: BaseConfig;
  readonly profilesTable: dynamodb.Table;
  readonly mediaBucket: s3.Bucket;
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
};

export type ServicesConfig = {
  readonly lambdaMemoryMb: number;
  readonly lambdaTimeoutSec: number;
  readonly logRetentionDays: number;
  readonly apiDomainName: string;
  readonly apiCertArn?: string;
};
