import { describe, it, expect } from "vitest";
import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { DataStack } from "@stacks/data.stack";
import { baseConfig } from "@config/base.config";

describe("DataStack", () => {
  const app = new App();
  const stack = new DataStack(app, "DataTest", { baseConfig, env: { region: "us-east-1" } });
  const t = Template.fromStack(stack);

  it("creates one on-demand DynamoDB table, DESTROY in dev", () => {
    t.hasResourceProperties("AWS::DynamoDB::Table", { BillingMode: "PAY_PER_REQUEST" });
    t.hasResource("AWS::DynamoDB::Table", { DeletionPolicy: "Delete" });
  });

  it("creates a private encrypted S3 bucket, auto-deleted in dev", () => {
    t.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true,
      },
    });
    t.hasResource("AWS::S3::Bucket", { DeletionPolicy: "Delete" });
    t.resourceCountIs("Custom::S3AutoDeleteObjects", 1);
  });

  it("creates a Cognito user pool and client, DESTROY in dev", () => {
    t.resourceCountIs("AWS::Cognito::UserPool", 1);
    t.resourceCountIs("AWS::Cognito::UserPoolClient", 1);
    t.hasResource("AWS::Cognito::UserPool", { DeletionPolicy: "Delete" });
  });

  it("RETAINs stateful resources in prod", () => {
    const prodApp = new App();
    const prodStack = new DataStack(prodApp, "DataProd", {
      baseConfig: { ...baseConfig, env: "prod" },
      env: { region: "us-east-1" },
    });
    const p = Template.fromStack(prodStack);
    p.hasResource("AWS::DynamoDB::Table", { DeletionPolicy: "Retain" });
    p.hasResource("AWS::S3::Bucket", { DeletionPolicy: "Retain" });
    p.hasResource("AWS::Cognito::UserPool", { DeletionPolicy: "Retain" });
    p.resourceCountIs("Custom::S3AutoDeleteObjects", 0);
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
