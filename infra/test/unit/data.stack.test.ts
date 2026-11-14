import { describe, it, expect } from "vitest";
import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { DataStack } from "@stacks/data.stack";
import { baseConfig } from "@config/base.config";

describe("DataStack", () => {
  const app = new App();
  const stack = new DataStack(app, "DataTest", { baseConfig, env: { region: "us-east-1" } });
  const t = Template.fromStack(stack);

  it("creates one on-demand DynamoDB table with RETAIN", () => {
    t.hasResourceProperties("AWS::DynamoDB::Table", { BillingMode: "PAY_PER_REQUEST" });
    t.hasResource("AWS::DynamoDB::Table", { DeletionPolicy: "Retain" });
  });

  it("creates a private encrypted S3 bucket with RETAIN", () => {
    t.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true,
      },
    });
    t.hasResource("AWS::S3::Bucket", { DeletionPolicy: "Retain" });
  });

  it("creates a Cognito user pool and client with RETAIN", () => {
    t.resourceCountIs("AWS::Cognito::UserPool", 1);
    t.resourceCountIs("AWS::Cognito::UserPoolClient", 1);
    t.hasResource("AWS::Cognito::UserPool", { DeletionPolicy: "Retain" });
  });

  it("co-locates both Cognito trigger lambdas with LambdaConfig on the pool", () => {
    t.hasResourceProperties("AWS::Cognito::UserPool", {
      LambdaConfig: {
        CustomMessage: { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
        PostConfirmation: { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
      },
    });
    t.resourceCountIs("AWS::Lambda::Permission", 2);
    t.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Architectures: ["arm64"],
    });
  });

  it("matches snapshot", () => {
    expect(t.toJSON()).toMatchSnapshot();
  });
});
