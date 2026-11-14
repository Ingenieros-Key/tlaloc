import { StackProps } from "aws-cdk-lib";
import { BaseConfig } from "@stack-types/base.types";

export type DataStackProps = StackProps & {
  readonly baseConfig: BaseConfig;
};

export type DataConfig = {
  readonly profilesTableName: string;
  readonly mediaBucketName: string;
  readonly userPoolName: string;
  readonly sesDomain: string;
  readonly sesSender: string;
};
