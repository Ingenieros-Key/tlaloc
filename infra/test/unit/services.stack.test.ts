import { describe, it, expect } from "vitest";
import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { DataStack } from "@stacks/data.stack";
import { ServicesStack } from "@stacks/services.stack";
import { baseConfig } from "@config/base.config";

describe("ServicesStack", () => {
  const app = new App();
  const data = new DataStack(app, "D", { baseConfig, env: { region: "us-east-1" } });
  const svc = new ServicesStack(app, "S", {
    baseConfig,
    env: { region: "us-east-1" },
    profilesTable: data.profilesTable,
    plotsTable: data.plotsTable,
    mediaBucket: data.mediaBucket,
    userPool: data.userPool,
    userPoolClient: data.userPoolClient,
  });
  const t = Template.fromStack(svc);

  it("creates the api lambda on arm64/node22", () => {
    t.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Architectures: ["arm64"],
    });
  });

  it("wires a Cognito authorizer", () => {
    t.resourceCountIs("AWS::ApiGateway::Authorizer", 1);
  });

  it("creates an api key + usage plan", () => {
    t.resourceCountIs("AWS::ApiGateway::ApiKey", 1);
    t.resourceCountIs("AWS::ApiGateway::UsagePlan", 1);
  });

  it("matches snapshot", () => {
    expect(t.toJSON()).toMatchSnapshot();
  });
});
