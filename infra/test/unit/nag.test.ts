import { describe, it, expect } from "vitest";
import { App, Aspects } from "aws-cdk-lib";
import { Annotations, Match } from "aws-cdk-lib/assertions";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import { DataStack } from "@stacks/data.stack";
import { ServicesStack } from "@stacks/services.stack";
import { baseConfig } from "@config/base.config";

describe("cdk-nag", () => {
  const app = new App();
  const env = { region: "us-east-1" };
  const data = new DataStack(app, "D", { baseConfig, env });
  const svc = new ServicesStack(app, "S", {
    baseConfig,
    env,
    profilesTable: data.profilesTable,
    plotsTable: data.plotsTable,
    notificationsTable: data.notificationsTable,
    mediaBucket: data.mediaBucket,
    userPool: data.userPool,
    userPoolClient: data.userPoolClient,
  });
  svc.addStackDependency(data);
  NagSuppressions.addStackSuppressions(data, [
    { id: "AwsSolutions-S1", reason: "media bucket access logging out of scope for hackathon MVP" },
    { id: "AwsSolutions-COG8", reason: "Cognito Plus feature plan is a paid add-on, out of scope" },
    { id: "AwsSolutions-COG2", reason: "MFA enrollment flows are out of scope for this hackathon MVP" },
    { id: "AwsSolutions-L1", reason: "pinned to Node.js 22 LTS intentionally" },
    { id: "AwsSolutions-IAM4", reason: "managed basic-exec roles for the Cognito trigger functions" },
    {
      id: "AwsSolutions-IAM5",
      reason: "X-Ray tracing actions have no resource-level permissions",
      appliesTo: ["Resource::*"],
    },
  ]);
  NagSuppressions.addStackSuppressions(svc, [
    { id: "AwsSolutions-IAM4", reason: "managed basic-exec + API GW CloudWatch-logs-push roles" },
    { id: "AwsSolutions-APIG4", reason: "proxy is cognito-authed; health public" },
    { id: "AwsSolutions-COG4", reason: "health public by design" },
    { id: "AwsSolutions-APIG2", reason: "validation in nest" },
    { id: "AwsSolutions-APIG3", reason: "WAFv2 is out of scope for this hackathon MVP" },
    { id: "AwsSolutions-L1", reason: "pinned to Node.js 22 LTS intentionally" },
    {
      id: "AwsSolutions-IAM5",
      reason: "grantReadWrite is CDK's scoped least-privilege grant on this bucket; X-Ray has no resource-level perms",
      appliesTo: [
        "Resource::*",
        "Action::s3:GetObject*",
        "Action::s3:GetBucket*",
        "Action::s3:List*",
        "Action::s3:DeleteObject*",
        "Action::s3:Abort*",
        { regex: "/^Resource::.*MediaBucket.*$/" },
      ],
    },
  ]);
  Aspects.of(app).add(new AwsSolutionsChecks());

  it("has no unsuppressed errors on data stack", () => {
    const errors = Annotations.fromStack(data).findError("*", Match.stringLikeRegexp("AwsSolutions-.*"));
    expect(errors).toHaveLength(0);
  });

  it("has no unsuppressed errors on services stack", () => {
    const errors = Annotations.fromStack(svc).findError("*", Match.stringLikeRegexp("AwsSolutions-.*"));
    expect(errors).toHaveLength(0);
  });
});
