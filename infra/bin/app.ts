#!/usr/bin/env node
import { App, Aspects, Tags } from "aws-cdk-lib";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import { baseConfig } from "@config/base.config";
import { DataStack } from "@stacks/data.stack";
import { ServicesStack } from "@stacks/services.stack";

const app = new App();
const env = { region: baseConfig.region };

const data = new DataStack(app, `${baseConfig.appPrefix}-data`, { baseConfig, env });
const services = new ServicesStack(app, `${baseConfig.appPrefix}-services`, {
  baseConfig,
  env,
  profilesTable: data.profilesTable,
  plotsTable: data.plotsTable,
  notificationsTable: data.notificationsTable,
  mediaBucket: data.mediaBucket,
  userPool: data.userPool,
  userPoolClient: data.userPoolClient,
});
services.addStackDependency(data);

// Apply tags via CDK's built-in Tag aspect (one well-behaved aspect) rather than a custom
// IAspect that calls Tags.of().add() inside visit() — the latter registers nested aspects each
// pass and, as the construct tree grows, never stabilizes (PossibleInfiniteLoopDetected).
Tags.of(app).add("tenant", baseConfig.tenant);
Tags.of(app).add("environment", baseConfig.env);
Tags.of(app).add("service", baseConfig.tenant);

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

NagSuppressions.addStackSuppressions(data, [
  { id: "AwsSolutions-S1", reason: "Media bucket access logging is out of scope for this hackathon MVP; the bucket already blocks public access and enforces SSL." },
  { id: "AwsSolutions-COG8", reason: "Cognito advanced security / Plus feature plan is a paid add-on, out of scope for this hackathon MVP." },
  { id: "AwsSolutions-COG2", reason: "MFA enrollment flows are out of scope for this hackathon MVP; revisit before production." },
  { id: "AwsSolutions-L1", reason: "Lambda runtimes are pinned to Node.js 22 LTS to match the backend's build target; bumping runtimes is a cross-cutting decision out of scope for this task." },
  { id: "AwsSolutions-IAM4", reason: "AWSLambdaBasicExecutionRole is CDK's default managed policy granting the Cognito trigger functions CloudWatch Logs write access." },
  {
    id: "AwsSolutions-IAM5",
    reason: "X-Ray's PutTraceSegments/PutTelemetryRecords actions have no resource-level permissions; CDK's Tracing.ACTIVE grant is necessarily Resource::*.",
    appliesTo: ["Resource::*"],
  },
]);

NagSuppressions.addStackSuppressions(services, [
  { id: "AwsSolutions-IAM4", reason: "CDK-managed Lambda basic-execution + API Gateway CloudWatch-logs-push roles use AWS managed policies." },
  { id: "AwsSolutions-APIG4", reason: "{proxy+} is Cognito-authorized; /health is intentionally public." },
  { id: "AwsSolutions-COG4", reason: "/health is a public liveness probe by design." },
  { id: "AwsSolutions-APIG2", reason: "Request validation handled inside NestJS (class-validator), not at API GW." },
  { id: "AwsSolutions-APIG3", reason: "WAFv2 is out of scope for this hackathon MVP; revisit before production-facing traffic." },
  { id: "AwsSolutions-L1", reason: "Lambda runtimes are pinned to Node.js 22 LTS to match the backend's build target; bumping runtimes is a cross-cutting decision out of scope for this task." },
  {
    id: "AwsSolutions-IAM5",
    reason: "grantReadWrite(mediaBucket) is CDK's standard least-privilege grant, scoped to this app's own bucket ARN/objects; X-Ray's tracing actions have no resource-level permissions.",
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
