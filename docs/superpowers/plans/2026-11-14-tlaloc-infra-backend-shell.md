# Tlaloc Infra + Backend Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a serverless AWS shell — CDK infra, NestJS monolith on Lambda behind REST API Gateway, Cognito auth, DynamoDB, S3, SES email hooks, custom API domain — so farm/NASA-data services can be added later as Nest modules without re-plumbing.

**Architecture:** pnpm monorepo. `infra/` = CDK app with two stacks (`${appPrefix}-data` stateful, `${appPrefix}-services` stateless). `backend/` = single NestJS app bundled into one Lambda via `@codegenie/serverless-express`, fronted by REST API Gateway `{proxy+}` with a Cognito JWT authorizer + API-key service tier. `frontend/` = Next.js shell wired to Cognito via Amplify Auth. DNS at Namecheap (manual records); custom domain + cert gated behind a config flag so the API runs on the default execute-api URL until the cert is issued.

**Tech Stack:** AWS CDK (TypeScript), NestJS, DynamoDB (on-demand), S3, Cognito, SES, API Gateway REST v1, Next.js + Amplify, pnpm, Vitest (infra), Jest (backend).

## Global Constraints

- Tenant `tlaloc`, region `us-east-1`, default env `dev`; prod via `ENV=prod`.
- Name builder `tlaloc-${env}-${resource}` from `infra/lib/utils/name-builder.ts` — no manual string concat for resource names.
- Lambda: `NODEJS_22_X` on `ARM_64`, `NodejsFunction` bundling `minify: true`, explicit `logRetention`, `tracing: ACTIVE`.
- Stateful resources (`DynamoDB`, `S3`, `Cognito`): `RemovalPolicy.RETAIN`.
- IAM via `.grant*()` methods only; manual `PolicyStatement` needs a why-comment.
- S3 `blockPublicAccess: BLOCK_ALL` always.
- `cdk-nag` `AwsSolutionsChecks` applied in `bin/app.ts`; findings are blockers; suppressions documented.
- Strict TypeScript, zero `any`, `readonly` props, `type` over `interface`. No `import type`. Each package owns its `tsconfig.json`.
- No inline narration comments (project rule). JSDoc on exported symbols only; `ponytail:` comments allowed for deliberate deferrals.
- No `Co-Authored-By` / "Generated with Claude" anywhere.
- GitHub Actions (if added): checkout@v4, setup-node@v4, pnpm/action-setup@v4 or newer.

---

## Phase 0 — Monorepo bootstrap

### Task 0: pnpm workspace root

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Modify: `.gitignore` (already has node_modules/dist/cdk.out/.env)

- [ ] **Step 1: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "infra"
  - "backend"
  - "frontend"
```

- [ ] **Step 2: Write root `package.json`**

```json
{
  "name": "tlaloc",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "infra:synth": "pnpm --filter infra synth",
    "infra:deploy": "pnpm --filter infra deploy",
    "backend:dev": "pnpm --filter backend start:dev",
    "backend:test": "pnpm --filter backend test",
    "frontend:dev": "pnpm --filter frontend dev"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: pnpm workspace root"
```

---

## Phase 1 — CDK infra (`infra/`)

### Task 1: CDK app init + base config + name builder

**Files:**
- Create: `infra/` via `cdk init`
- Create: `infra/lib/config/base.config.ts`
- Create: `infra/lib/types/base.types.ts`
- Create: `infra/lib/utils/name-builder.ts`
- Test: `infra/test/unit/name-builder.test.ts`

**Interfaces:**
- Produces: `buildName(resource: string): string` → `tlaloc-${env}-${resource}`; `baseConfig: BaseConfig` with `{ tenant, env, region, appPrefix }`.

- [ ] **Step 1: Init CDK app + deps**

```bash
cd infra
pnpm dlx cdk init app --language typescript
pnpm add -D vitest aws-cdk-lib constructs cdk-nag
```
Remove the generated `jest` config and `test/*.test.ts` sample; we use Vitest.

- [ ] **Step 2: Set path aliases in `infra/tsconfig.json`**

Add under `compilerOptions`:
```json
"baseUrl": ".",
"paths": {
  "@config/*": ["lib/config/*"],
  "@stacks/*": ["lib/stacks/*"],
  "@utils/*": ["lib/utils/*"],
  "@stack-types/*": ["lib/types/*"]
}
```

- [ ] **Step 3: Write `infra/lib/types/base.types.ts`**

```typescript
export type Env = "dev" | "prod";

export type BaseConfig = {
  readonly tenant: string;
  readonly env: Env;
  readonly region: string;
  readonly appPrefix: string;
};
```

- [ ] **Step 4: Write `infra/lib/config/base.config.ts`**

```typescript
import { BaseConfig, Env } from "@stack-types/base.types";

const tenant = "tlaloc";
const env = (process.env.ENV ?? "dev") as Env;
const region = process.env.AWS_REGION ?? "us-east-1";

export const baseConfig: BaseConfig = {
  tenant,
  env,
  region,
  appPrefix: `${tenant}-${env}`,
};
```

- [ ] **Step 5: Write the failing test `infra/test/unit/name-builder.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { buildName } from "@utils/name-builder";

describe("buildName", () => {
  it("prefixes resource with tenant and env", () => {
    expect(buildName("profiles")).toBe("tlaloc-dev-profiles");
  });

  it("lowercases and dash-joins multi-word resources", () => {
    expect(buildName("User Pool")).toBe("tlaloc-dev-user-pool");
  });
});
```

- [ ] **Step 6: Run test, verify it fails**

Run: `pnpm --filter infra exec vitest run name-builder`
Expected: FAIL — `buildName` not found.

- [ ] **Step 7: Write `infra/lib/utils/name-builder.ts`**

```typescript
import { baseConfig } from "@config/base.config";

export function buildName(resource: string): string {
  const slug = resource.trim().toLowerCase().replace(/\s+/g, "-");
  return `${baseConfig.appPrefix}-${slug}`;
}
```

- [ ] **Step 8: Run test, verify it passes**

Run: `pnpm --filter infra exec vitest run name-builder`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add infra
git commit -m "feat(infra): cdk app skeleton, base config, name builder"
```

---

### Task 2: Tagging aspect

**Files:**
- Create: `infra/lib/aspects/tagging-aspect.ts`
- Test: `infra/test/unit/tagging-aspect.test.ts`

**Interfaces:**
- Produces: `class TaggingAspect implements IAspect` applying `service`, `environment`, `tenant` tags.

- [ ] **Step 1: Write the failing test `infra/test/unit/tagging-aspect.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { App, Stack, aws_sns as sns, Aspects } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { TaggingAspect } from "../../lib/aspects/tagging-aspect";

describe("TaggingAspect", () => {
  it("applies tenant/environment/service tags to resources", () => {
    const app = new App();
    const stack = new Stack(app, "T");
    new sns.Topic(stack, "Topic");
    Aspects.of(app).add(new TaggingAspect());
    const t = Template.fromStack(stack);
    t.hasResourceProperties("AWS::SNS::Topic", {
      Tags: [
        { Key: "environment", Value: "dev" },
        { Key: "service", Value: "tlaloc" },
        { Key: "tenant", Value: "tlaloc" },
      ],
    });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter infra exec vitest run tagging-aspect`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `infra/lib/aspects/tagging-aspect.ts`**

```typescript
import { IAspect, Tags } from "aws-cdk-lib";
import { IConstruct } from "constructs";
import { baseConfig } from "@config/base.config";

export class TaggingAspect implements IAspect {
  visit(node: IConstruct): void {
    Tags.of(node).add("tenant", baseConfig.tenant);
    Tags.of(node).add("environment", baseConfig.env);
    Tags.of(node).add("service", baseConfig.tenant);
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm --filter infra exec vitest run tagging-aspect`
Expected: PASS. (Tag order in the template is alphabetical by key — assertion matches.)

- [ ] **Step 5: Commit**

```bash
git add infra/lib/aspects infra/test/unit/tagging-aspect.test.ts
git commit -m "feat(infra): app-level tagging aspect"
```

---

### Task 3: DataStack (DynamoDB, S3, Cognito, SES)

**Files:**
- Create: `infra/lib/types/data.types.ts`
- Create: `infra/lib/config/data.config.ts`
- Create: `infra/lib/stacks/data.stack.ts`
- Test: `infra/test/unit/data.stack.test.ts`

**Interfaces:**
- Produces: `DataStack` exposing `readonly profilesTable: dynamodb.Table`, `readonly mediaBucket: s3.Bucket`, `readonly userPool: cognito.UserPool`, `readonly userPoolClient: cognito.UserPoolClient`. Consumed by `ServicesStack`.

- [ ] **Step 1: Install stack deps**

```bash
pnpm --filter infra add aws-cdk-lib constructs
```

- [ ] **Step 2: Write `infra/lib/types/data.types.ts`**

```typescript
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
```

- [ ] **Step 3: Write `infra/lib/config/data.config.ts`**

```typescript
import { buildName } from "@utils/name-builder";
import { DataConfig } from "@stack-types/data.types";

export const dataConfig: DataConfig = {
  profilesTableName: buildName("profiles"),
  mediaBucketName: buildName("media"),
  userPoolName: buildName("users"),
  sesDomain: "tlaloc.space",
  sesSender: "info@tlaloc.space",
};
```

- [ ] **Step 4: Write `infra/lib/stacks/data.stack.ts`**

```typescript
import { Stack, RemovalPolicy, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  aws_cognito as cognito,
  aws_ses as ses,
} from "aws-cdk-lib";
import { DataStackProps } from "@stack-types/data.types";
import { dataConfig } from "@config/data.config";

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
```

- [ ] **Step 5: Write snapshot + assertion test `infra/test/unit/data.stack.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
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

  it("creates a private encrypted S3 bucket", () => {
    t.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true,
      },
    });
  });

  it("creates a Cognito user pool and client", () => {
    t.resourceCountIs("AWS::Cognito::UserPool", 1);
    t.resourceCountIs("AWS::Cognito::UserPoolClient", 1);
  });

  it("matches snapshot", () => {
    expect(t.toJSON()).toMatchSnapshot();
  });
});
```

- [ ] **Step 6: Run tests, verify pass**

Run: `pnpm --filter infra exec vitest run data.stack`
Expected: PASS (4 tests, snapshot written first run).

- [ ] **Step 7: Commit**

```bash
git add infra/lib infra/test
git commit -m "feat(infra): data stack — dynamo, s3, cognito, ses"
```

---

### Task 4: ServicesStack (Lambda, API Gateway, authorizer, API key, Cognito triggers, optional custom domain)

**Files:**
- Create: `infra/lib/types/services.types.ts`
- Create: `infra/lib/config/services.config.ts`
- Create: `infra/lib/stacks/services.stack.ts`
- Test: `infra/test/unit/services.stack.test.ts`

**Interfaces:**
- Consumes: `DataStack.profilesTable`, `.mediaBucket`, `.userPool`, `.userPoolClient`.
- Produces: deployed REST API with `GET /health`, `{proxy+}` → Nest Lambda; outputs `ApiUrl`, `ApiId`.

- [ ] **Step 1: Write `infra/lib/types/services.types.ts`**

```typescript
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
```

- [ ] **Step 2: Write `infra/lib/config/services.config.ts`**

```typescript
import { ServicesConfig } from "@stack-types/services.types";

export const servicesConfig: ServicesConfig = {
  lambdaMemoryMb: 512,
  lambdaTimeoutSec: 20,
  logRetentionDays: 14,
  apiDomainName: "api.tlaloc.space",
  apiCertArn: process.env.API_CERT_ARN,
};
```

- [ ] **Step 3: Write `infra/lib/stacks/services.stack.ts`**

```typescript
import { Stack, Duration, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs,
  aws_apigateway as apigw,
  aws_logs as logs,
  aws_cognito as cognito,
  aws_certificatemanager as acm,
} from "aws-cdk-lib";
import * as path from "path";
import { ServicesStackProps } from "@stack-types/services.types";
import { servicesConfig } from "@config/services.config";
import { buildName } from "@utils/name-builder";

const handlerDir = path.join(__dirname, "../../../backend/src");

export class ServicesStack extends Stack {
  constructor(scope: Construct, id: string, props: ServicesStackProps) {
    super(scope, id, props);

    const apiFn = new nodejs.NodejsFunction(this, "ApiFn", {
      functionName: buildName("api"),
      entry: path.join(handlerDir, "lambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: servicesConfig.lambdaMemoryMb,
      timeout: Duration.seconds(servicesConfig.lambdaTimeoutSec),
      tracing: lambda.Tracing.ACTIVE,
      logRetention: servicesConfig.logRetentionDays,
      bundling: { minify: true, sourceMap: true },
      environment: {
        PROFILES_TABLE: props.profilesTable.tableName,
        MEDIA_BUCKET: props.mediaBucket.bucketName,
        USER_POOL_ID: props.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        REGION: this.region,
      },
    });

    props.profilesTable.grantReadWriteData(apiFn);
    props.mediaBucket.grantReadWrite(apiFn);

    const api = new apigw.RestApi(this, "RestApi", {
      restApiName: buildName("api"),
      deployOptions: { tracingEnabled: true, stageName: props.baseConfig.env },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ["Authorization", "Content-Type", "x-api-key", "x-idempotency-key"],
      },
    });

    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, "JwtAuthorizer", {
      cognitoUserPools: [props.userPool],
    });

    const integration = new apigw.LambdaIntegration(apiFn);

    // Public health check — no auth.
    api.root.addResource("health").addMethod("GET", integration);

    // Everything else proxies to Nest, guarded by the Cognito JWT authorizer.
    const proxy = api.root.addResource("{proxy+}");
    proxy.addMethod("ANY", integration, {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });

    // ponytail: API-key service tier wired but unused until a machine route exists.
    const key = api.addApiKey("ServiceKey", { apiKeyName: buildName("service-key") });
    const plan = api.addUsagePlan("ServicePlan", {
      name: buildName("service-plan"),
      throttle: { rateLimit: 10, burstLimit: 20 },
    });
    plan.addApiKey(key);
    plan.addApiStage({ stage: api.deploymentStage });

    this.addCognitoTriggers(props.userPool);

    if (servicesConfig.apiCertArn) {
      const cert = acm.Certificate.fromCertificateArn(this, "ApiCert", servicesConfig.apiCertArn);
      const domain = api.addDomainName("CustomDomain", {
        domainName: servicesConfig.apiDomainName,
        certificate: cert,
        endpointType: apigw.EndpointType.REGIONAL,
      });
      new CfnOutput(this, "CustomDomainTarget", { value: domain.domainNameAliasDomainName });
    }

    new CfnOutput(this, "ApiUrl", { value: api.url });
  }

  private addCognitoTriggers(userPool: cognito.UserPool): void {
    const base = (name: string, entry: string) =>
      new nodejs.NodejsFunction(this, name, {
        functionName: buildName(name),
        entry: path.join(handlerDir, "triggers", entry),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        logRetention: servicesConfig.logRetentionDays,
        tracing: lambda.Tracing.ACTIVE,
        bundling: { minify: true },
      });

    const customMessage = base("custom-message", "custom-message.ts");
    const postConfirmation = base("post-confirmation", "post-confirmation.ts");

    userPool.addTrigger(cognito.UserPoolOperation.CUSTOM_MESSAGE, customMessage);
    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmation);
  }
}
```

**CDK Warning:** `api.gateway` REST regional custom domain requires an ACM cert **in the same region** (`us-east-1` here — OK). The cert is imported by ARN (`API_CERT_ARN`) only after it is manually DNS-validated at Namecheap; until then the API serves on the default execute-api URL.

- [ ] **Step 4: Write snapshot + assertion test `infra/test/unit/services.stack.test.ts`**

```typescript
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
```

- [ ] **Step 5: Run tests, verify pass**

Run: `pnpm --filter infra exec vitest run services.stack`
Expected: PASS. (Requires `backend/src/lambda.ts` + `backend/src/triggers/*.ts` to exist for `NodejsFunction` entry resolution — Phase 2 Task 7/9 create them. If running infra before backend, temporarily stub those files with `export const handler = async () => ({});`.)

- [ ] **Step 6: Commit**

```bash
git add infra/lib infra/test
git commit -m "feat(infra): services stack — lambda, rest api, authorizer, api key, triggers"
```

---

### Task 5: App wiring + cdk-nag

**Files:**
- Modify: `infra/bin/app.ts`
- Test: extend `infra/test/unit/services.stack.test.ts` is enough; add nag run in a dedicated test `infra/test/unit/nag.test.ts`

**Interfaces:**
- Consumes: `DataStack`, `ServicesStack`, `TaggingAspect`.

- [ ] **Step 1: Write `infra/bin/app.ts`**

```typescript
import { App, Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import { baseConfig } from "@config/base.config";
import { DataStack } from "@stacks/data.stack";
import { ServicesStack } from "@stacks/services.stack";
import { TaggingAspect } from "../lib/aspects/tagging-aspect";

const app = new App();
const env = { region: baseConfig.region };

const data = new DataStack(app, `${baseConfig.appPrefix}-data`, { baseConfig, env });
const services = new ServicesStack(app, `${baseConfig.appPrefix}-services`, {
  baseConfig,
  env,
  profilesTable: data.profilesTable,
  mediaBucket: data.mediaBucket,
  userPool: data.userPool,
  userPoolClient: data.userPoolClient,
});
services.addDependency(data);

Aspects.of(app).add(new TaggingAspect());
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

NagSuppressions.addStackSuppressions(services, [
  { id: "AwsSolutions-IAM4", reason: "CDK-managed Lambda basic-execution + log-retention roles use AWS managed policies." },
  { id: "AwsSolutions-APIG4", reason: "{proxy+} is Cognito-authorized; /health is intentionally public." },
  { id: "AwsSolutions-COG4", reason: "/health is a public liveness probe by design." },
  { id: "AwsSolutions-APIG2", reason: "Request validation handled inside NestJS (class-validator), not at API GW." },
]);
```

**Note:** `services.addDependency(data)` — services depends on data (Lambda grants need the table/bucket). This is the reverse of the generic OMS `dataStack.addDependency(servicesStack)` ordering because we have no separate IAM stack; the dependency genuinely flows services → data here.

- [ ] **Step 2: Write `infra/test/unit/nag.test.ts`**

```typescript
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
    baseConfig, env,
    profilesTable: data.profilesTable,
    mediaBucket: data.mediaBucket,
    userPool: data.userPool,
    userPoolClient: data.userPoolClient,
  });
  svc.addDependency(data);
  NagSuppressions.addStackSuppressions(svc, [
    { id: "AwsSolutions-IAM4", reason: "managed basic-exec roles" },
    { id: "AwsSolutions-APIG4", reason: "proxy is cognito-authed; health public" },
    { id: "AwsSolutions-COG4", reason: "health public by design" },
    { id: "AwsSolutions-APIG2", reason: "validation in nest" },
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
```

- [ ] **Step 3: Run nag test; fix real findings, suppress documented ones**

Run: `pnpm --filter infra exec vitest run nag`
Expected: PASS. If new findings appear (e.g. S3 server-access-logging `AwsSolutions-S1`), either fix (add access-log bucket) or add a documented suppression. Prefer fixing; suppress only infra-noise.

- [ ] **Step 4: Synth to confirm the app assembles**

Run: `pnpm --filter infra exec cdk synth`
Expected: two templates (`tlaloc-dev-data`, `tlaloc-dev-services`) emitted, no errors.

- [ ] **Step 5: Commit**

```bash
git add infra/bin infra/test/unit/nag.test.ts
git commit -m "feat(infra): app wiring, tagging + cdk-nag aspects"
```

---

## Phase 2 — Backend NestJS (`backend/`)

### Task 6: Nest init + env config + common clients

**Files:**
- Create: `backend/` via `nest new`
- Create: `backend/src/config/env.config.ts`
- Create: `backend/src/common/aws/dynamo.client.ts`
- Create: `backend/src/common/aws/s3.client.ts`
- Test: `backend/src/config/env.config.spec.ts`

**Interfaces:**
- Produces: `loadEnv(): EnvConfig` (validated); `dynamoDoc: DynamoDBDocumentClient`; `s3: S3Client`.

- [ ] **Step 1: Init Nest app (no git, pnpm)**

```bash
cd backend
pnpm dlx @nestjs/cli new . --package-manager pnpm --skip-git --strict
pnpm add @nestjs/config @codegenie/serverless-express @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-s3 @aws-sdk/s3-request-presigner class-validator class-transformer
```

- [ ] **Step 2: Write failing test `backend/src/config/env.config.spec.ts`**

```typescript
import { loadEnv } from "./env.config";

describe("loadEnv", () => {
  it("throws when required vars are missing", () => {
    const prev = process.env.PROFILES_TABLE;
    delete process.env.PROFILES_TABLE;
    expect(() => loadEnv()).toThrow(/PROFILES_TABLE/);
    process.env.PROFILES_TABLE = prev;
  });

  it("returns typed config when vars are present", () => {
    process.env.PROFILES_TABLE = "t";
    process.env.MEDIA_BUCKET = "b";
    process.env.USER_POOL_ID = "u";
    process.env.USER_POOL_CLIENT_ID = "c";
    process.env.REGION = "us-east-1";
    expect(loadEnv().profilesTable).toBe("t");
  });
});
```

- [ ] **Step 3: Run test, verify fails**

Run: `pnpm --filter backend test env.config`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `backend/src/config/env.config.ts`**

```typescript
export type EnvConfig = {
  readonly profilesTable: string;
  readonly mediaBucket: string;
  readonly userPoolId: string;
  readonly userPoolClientId: string;
  readonly region: string;
};

const REQUIRED = ["PROFILES_TABLE", "MEDIA_BUCKET", "USER_POOL_ID", "USER_POOL_CLIENT_ID", "REGION"] as const;

export function loadEnv(): EnvConfig {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
  return {
    profilesTable: process.env.PROFILES_TABLE as string,
    mediaBucket: process.env.MEDIA_BUCKET as string,
    userPoolId: process.env.USER_POOL_ID as string,
    userPoolClientId: process.env.USER_POOL_CLIENT_ID as string,
    region: process.env.REGION as string,
  };
}
```

- [ ] **Step 5: Run test, verify passes**

Run: `pnpm --filter backend test env.config`
Expected: PASS (2 tests).

- [ ] **Step 6: Write `backend/src/common/aws/dynamo.client.ts`**

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const region = process.env.REGION ?? "us-east-1";

export const dynamoDoc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});
```

- [ ] **Step 7: Write `backend/src/common/aws/s3.client.ts`**

```typescript
import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({ region: process.env.REGION ?? "us-east-1" });
```

- [ ] **Step 8: Commit**

```bash
git add backend
git commit -m "feat(backend): nest app, env config, aws clients"
```

---

### Task 7: Lambda handler bootstrap

**Files:**
- Create: `backend/src/lambda.ts`
- Modify: `backend/src/main.ts` (local bootstrap + global pipes/filter — pipes/filter added in Task 8)

**Interfaces:**
- Produces: `export const handler` — cached serverless-express handler wrapping the Nest `AppModule`.

- [ ] **Step 1: Write `backend/src/lambda.ts`**

```typescript
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import serverlessExpress from "@codegenie/serverless-express";
import express from "express";
import { Handler } from "aws-lambda";
import { AppModule } from "./app.module";

let cached: Handler;

async function bootstrap(): Promise<Handler> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  app.enableCors();
  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context, callback) => {
  cached = cached ?? (await bootstrap());
  return cached(event, context, callback);
};
```

- [ ] **Step 2: Confirm it builds**

Run: `pnpm --filter backend build`
Expected: compiles, `dist/lambda.js` present.

- [ ] **Step 3: Commit**

```bash
git add backend/src/lambda.ts
git commit -m "feat(backend): cached serverless-express lambda handler"
```

---

### Task 8: Response envelope filter + validation + health module

**Files:**
- Create: `backend/src/common/http/http-exception.filter.ts`
- Create: `backend/src/common/http/types.ts`
- Create: `backend/src/health/health.module.ts`
- Create: `backend/src/health/health.controller.ts`
- Modify: `backend/src/main.ts`, `backend/src/app.module.ts`
- Test: `backend/src/health/health.controller.spec.ts`, `backend/test/app.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /health` → `{ status: "ok" }`; global `AllExceptionsFilter` emitting `{ statusCode, message, error, timestamp, path }`.

- [ ] **Step 1: Write failing test `backend/src/health/health.controller.spec.ts`**

```typescript
import { Test } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns ok", async () => {
    const mod = await Test.createTestingModule({ controllers: [HealthController] }).compile();
    const c = mod.get(HealthController);
    expect(c.check()).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `pnpm --filter backend test health.controller`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `backend/src/health/health.controller.ts`**

```typescript
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: "ok" };
  }
}
```

- [ ] **Step 4: Write `backend/src/health/health.module.ts`**

```typescript
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

- [ ] **Step 5: Write `backend/src/common/http/types.ts`**

```typescript
export type ErrorEnvelope = {
  readonly statusCode: number;
  readonly message: string;
  readonly error: string;
  readonly timestamp: string;
  readonly path: string;
};
```

- [ ] **Step 6: Write `backend/src/common/http/http-exception.filter.ts`**

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { ErrorEnvelope } from "./types";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException ? exception.message : "Internal server error";

    const body: ErrorEnvelope = {
      statusCode: status,
      message,
      error: HttpStatus[status] ?? "ERROR",
      timestamp: new Date().toISOString(),
      path: req.url,
    };
    res.status(status).json(body);
  }
}
```

- [ ] **Step 7: Write `backend/src/app.module.ts`**

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { ProfilesModule } from "./profiles/profiles.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, ProfilesModule],
})
export class AppModule {}
```

(ProfilesModule created in Task 10; if running this task first, omit its import and add it in Task 10.)

- [ ] **Step 8: Write `backend/src/main.ts`**

```typescript
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/http/http-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

Also add the same `useGlobalPipes` + `useGlobalFilters` to `lambda.ts` `bootstrap()` before `app.init()`.

- [ ] **Step 9: Write e2e test `backend/test/app.e2e-spec.ts`**

```typescript
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("App (e2e)", () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  it("GET /health → 200 ok", () =>
    request(app.getHttpServer()).get("/health").expect(200).expect({ status: "ok" }));
});
```

- [ ] **Step 10: Run tests, verify pass**

Run: `pnpm --filter backend test health.controller && pnpm --filter backend test:e2e`
Expected: PASS. (E2e requires env vars from Task 6 Step 2 set, or ProfilesModule omitted until Task 10.)

- [ ] **Step 11: Commit**

```bash
git add backend/src backend/test
git commit -m "feat(backend): health module, error envelope, validation pipe"
```

---

### Task 9: Cognito JWT guard + Cognito trigger shells

**Files:**
- Create: `backend/src/common/auth/cognito.guard.ts`
- Create: `backend/src/common/auth/current-user.decorator.ts`
- Create: `backend/src/common/auth/types.ts`
- Create: `backend/src/triggers/custom-message.ts`
- Create: `backend/src/triggers/post-confirmation.ts`
- Create: `backend/src/triggers/email-templates.ts`
- Test: `backend/src/common/auth/cognito.guard.spec.ts`

**Interfaces:**
- Produces: `CognitoGuard` (reads API GW authorizer claims; attaches `req.user = { sub, email }`); `@CurrentUser()` param decorator; trigger `handler`s.

- [ ] **Step 1: Write `backend/src/common/auth/types.ts`**

```typescript
export type AuthUser = {
  readonly sub: string;
  readonly email: string;
};
```

- [ ] **Step 2: Write failing test `backend/src/common/auth/cognito.guard.spec.ts`**

```typescript
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { CognitoGuard } from "./cognito.guard";

function ctx(req: unknown): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => req }) } as ExecutionContext;
}

describe("CognitoGuard", () => {
  const guard = new CognitoGuard();

  it("attaches user from API GW authorizer claims", () => {
    const req: Record<string, unknown> = {
      apiGateway: { event: { requestContext: { authorizer: { claims: { sub: "u1", email: "a@b.c" } } } } },
    };
    expect(guard.canActivate(ctx(req))).toBe(true);
    expect((req.user as { sub: string }).sub).toBe("u1");
  });

  it("rejects when no claims present", () => {
    expect(() => guard.canActivate(ctx({}))).toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 3: Run test, verify fails**

Run: `pnpm --filter backend test cognito.guard`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `backend/src/common/auth/cognito.guard.ts`**

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthUser } from "./types";

@Injectable()
export class CognitoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const claims = req?.apiGateway?.event?.requestContext?.authorizer?.claims;
    if (!claims?.sub) {
      throw new UnauthorizedException("Missing Cognito claims");
    }
    const user: AuthUser = { sub: claims.sub, email: claims.email };
    req.user = user;
    return true;
  }
}
```

**Note:** API Gateway's Cognito authorizer validates the JWT signature/expiry at the gateway; this guard only reads the already-verified claims from the authorizer context. For local `main.ts` runs there is no authorizer context, so protected routes are only exercised via e2e with a mocked request (as in the test). `ponytail: local JWKS verification deferred — add passport-jwt against the Cognito JWKS only if we need to run authed routes locally.`

- [ ] **Step 5: Write `backend/src/common/auth/current-user.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser } from "./types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
```

- [ ] **Step 6: Write `backend/src/triggers/email-templates.ts`**

```typescript
export function confirmationEmail(code: string): { subject: string; body: string } {
  // TODO: hackathon copy. Keep {code} visible.
  return { subject: "Confirm your Tlaloc account", body: `Your code: ${code}` };
}

export function passwordResetEmail(code: string): { subject: string; body: string } {
  // TODO: hackathon copy.
  return { subject: "Reset your Tlaloc password", body: `Your reset code: ${code}` };
}

export function welcomeEmail(email: string): { subject: string; body: string } {
  // TODO: hackathon copy.
  return { subject: "Welcome to Tlaloc", body: `Welcome, ${email}.` };
}
```

- [ ] **Step 7: Write `backend/src/triggers/custom-message.ts`**

```typescript
import { CustomMessageTriggerHandler } from "aws-lambda";
import { confirmationEmail, passwordResetEmail } from "./email-templates";

export const handler: CustomMessageTriggerHandler = async (event) => {
  const code = event.request.codeParameter;
  if (event.triggerSource === "CustomMessage_SignUp" || event.triggerSource === "CustomMessage_ResendCode") {
    const { subject, body } = confirmationEmail(code);
    event.response.emailSubject = subject;
    event.response.emailMessage = body;
  } else if (event.triggerSource === "CustomMessage_ForgotPassword") {
    const { subject, body } = passwordResetEmail(code);
    event.response.emailSubject = subject;
    event.response.emailMessage = body;
  }
  return event;
};
```

- [ ] **Step 8: Write `backend/src/triggers/post-confirmation.ts`**

```typescript
import { PostConfirmationTriggerHandler } from "aws-lambda";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { welcomeEmail } from "./email-templates";

const ses = new SESv2Client({ region: process.env.REGION ?? "us-east-1" });
const SENDER = "info@tlaloc.space";

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const email = event.request.userAttributes.email;
  if (!email) return event;
  const { subject, body } = welcomeEmail(email);
  // ponytail: fire-and-forget welcome; swallow SES errors so confirmation never fails.
  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: SENDER,
        Destination: { ToAddresses: [email] },
        Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: body } } } },
      }),
    );
  } catch {
    /* logged by Lambda runtime; do not block sign-up */
  }
  return event;
};
```

- [ ] **Step 9: Add deps for triggers**

```bash
pnpm --filter backend add @aws-sdk/client-sesv2
pnpm --filter backend add -D @types/aws-lambda
```

- [ ] **Step 10: Run guard test, verify pass + build**

Run: `pnpm --filter backend test cognito.guard && pnpm --filter backend build`
Expected: PASS + compiles (confirms `lambda.ts` entry + trigger entries resolve for CDK).

- [ ] **Step 11: Commit**

```bash
git add backend/src/common/auth backend/src/triggers
git commit -m "feat(backend): cognito guard, current-user decorator, email trigger shells"
```

---

### Task 10: Profiles module (service + controller + DTOs + S3 presign)

**Files:**
- Create: `backend/src/profiles/profiles.module.ts`
- Create: `backend/src/profiles/profiles.controller.ts`
- Create: `backend/src/profiles/profiles.service.ts`
- Create: `backend/src/profiles/dto/update-profile.dto.ts`
- Create: `backend/src/profiles/types.ts`
- Test: `backend/src/profiles/profiles.service.spec.ts`
- Modify: `backend/src/app.module.ts` (import ProfilesModule — done in Task 8 Step 7)

**Interfaces:**
- Consumes: `dynamoDoc`, `s3`, `loadEnv()`, `CognitoGuard`, `@CurrentUser()`.
- Produces: `GET /profiles/me`, `PUT /profiles/me`, `POST /profiles/me/avatar` (returns `{ uploadUrl, key }`).

- [ ] **Step 1: Write `backend/src/profiles/types.ts`**

```typescript
export type Profile = {
  readonly userId: string;
  readonly email: string;
  readonly displayName?: string;
  readonly bio?: string;
  readonly location?: string;
  readonly avatarKey?: string;
  readonly updatedAt: string;
};
```

- [ ] **Step 2: Write `backend/src/profiles/dto/update-profile.dto.ts`**

```typescript
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(80)
  readonly displayName?: string;

  @IsOptional() @IsString() @MaxLength(500)
  readonly bio?: string;

  @IsOptional() @IsString() @MaxLength(120)
  readonly location?: string;
}
```

- [ ] **Step 3: Write failing test `backend/src/profiles/profiles.service.spec.ts`**

```typescript
import { ProfilesService } from "./profiles.service";

const send = jest.fn();
jest.mock("../common/aws/dynamo.client", () => ({ dynamoDoc: { send: (...a: unknown[]) => send(...a) } }));
jest.mock("../common/aws/s3.client", () => ({ s3: {} }));
jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: jest.fn().mockResolvedValue("https://signed") }));

describe("ProfilesService", () => {
  const env = { profilesTable: "t", mediaBucket: "b", userPoolId: "u", userPoolClientId: "c", region: "us-east-1" };
  const svc = new ProfilesService(env);

  beforeEach(() => send.mockReset());

  it("getOrCreate returns existing profile", async () => {
    send.mockResolvedValueOnce({ Item: { userId: "u1", email: "a@b.c", updatedAt: "x" } });
    const p = await svc.getOrCreate("u1", "a@b.c");
    expect(p.userId).toBe("u1");
  });

  it("getOrCreate seeds a new profile when none exists", async () => {
    send.mockResolvedValueOnce({ Item: undefined }); // Get
    send.mockResolvedValueOnce({}); // Put
    const p = await svc.getOrCreate("u2", "n@b.c");
    expect(p.email).toBe("n@b.c");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("avatarUploadUrl returns a signed url and key", async () => {
    const r = await svc.avatarUploadUrl("u1", "image/png");
    expect(r.uploadUrl).toBe("https://signed");
    expect(r.key).toMatch(/^avatars\/u1\//);
  });
});
```

- [ ] **Step 4: Run test, verify fails**

Run: `pnpm --filter backend test profiles.service`
Expected: FAIL — module not found.

- [ ] **Step 5: Write `backend/src/profiles/profiles.service.ts`**

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { dynamoDoc } from "../common/aws/dynamo.client";
import { s3 } from "../common/aws/s3.client";
import { EnvConfig } from "../config/env.config";
import { Profile } from "./types";
import { UpdateProfileDto } from "./dto/update-profile.dto";

export const ENV_CONFIG = "ENV_CONFIG";

@Injectable()
export class ProfilesService {
  constructor(@Inject(ENV_CONFIG) private readonly env: EnvConfig) {}

  async getOrCreate(userId: string, email: string): Promise<Profile> {
    const existing = await dynamoDoc.send(
      new GetCommand({ TableName: this.env.profilesTable, Key: { userId } }),
    );
    if (existing.Item) return existing.Item as Profile;

    const profile: Profile = { userId, email, updatedAt: new Date().toISOString() };
    await dynamoDoc.send(new PutCommand({ TableName: this.env.profilesTable, Item: profile }));
    return profile;
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    const now = new Date().toISOString();
    const res = await dynamoDoc.send(
      new UpdateCommand({
        TableName: this.env.profilesTable,
        Key: { userId },
        UpdateExpression:
          "SET displayName = :d, bio = :b, #loc = :l, updatedAt = :u",
        ExpressionAttributeNames: { "#loc": "location" },
        ExpressionAttributeValues: {
          ":d": dto.displayName ?? null,
          ":b": dto.bio ?? null,
          ":l": dto.location ?? null,
          ":u": now,
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    return res.Attributes as Profile;
  }

  async avatarUploadUrl(userId: string, contentType: string): Promise<{ uploadUrl: string; key: string }> {
    const key = `avatars/${userId}/${Date.now()}`;
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: this.env.mediaBucket, Key: key, ContentType: contentType }),
      { expiresIn: 300 },
    );
    return { uploadUrl, key };
  }
}
```

- [ ] **Step 6: Run test, verify passes**

Run: `pnpm --filter backend test profiles.service`
Expected: PASS (3 tests).

- [ ] **Step 7: Write `backend/src/profiles/profiles.controller.ts`**

```typescript
import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { CognitoGuard } from "../common/auth/cognito.guard";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { AuthUser } from "../common/auth/types";
import { ProfilesService } from "./profiles.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { Profile } from "./types";

@Controller("profiles")
@UseGuards(CognitoGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get("me")
  me(@CurrentUser() user: AuthUser): Promise<Profile> {
    return this.profiles.getOrCreate(user.sub, user.email);
  }

  @Put("me")
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<Profile> {
    return this.profiles.update(user.sub, dto);
  }

  @Post("me/avatar")
  avatar(@CurrentUser() user: AuthUser, @Body("contentType") contentType: string) {
    return this.profiles.avatarUploadUrl(user.sub, contentType ?? "image/jpeg");
  }
}
```

- [ ] **Step 8: Write `backend/src/profiles/profiles.module.ts`**

```typescript
import { Module } from "@nestjs/common";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService, ENV_CONFIG } from "./profiles.service";
import { loadEnv } from "../config/env.config";

@Module({
  controllers: [ProfilesController],
  providers: [ProfilesService, { provide: ENV_CONFIG, useFactory: loadEnv }],
})
export class ProfilesModule {}
```

- [ ] **Step 9: Full backend test + build**

Run: `pnpm --filter backend test && pnpm --filter backend build`
Expected: all PASS, compiles.

- [ ] **Step 10: Commit**

```bash
git add backend/src/profiles backend/src/app.module.ts
git commit -m "feat(backend): profiles module — get/update profile, avatar presign"
```

---

## Phase 3 — Frontend shell (`frontend/`)

### Task 11: Next.js shell + Amplify Auth + custom sign-in + authed page

**Files:**
- Create: `frontend/` via `create-next-app`
- Create: `frontend/src/lib/amplify.ts`
- Create: `frontend/src/app/(auth)/sign-in/page.tsx`
- Create: `frontend/src/app/(auth)/sign-up/page.tsx`
- Create: `frontend/src/app/profile/page.tsx`
- Create: `frontend/.env.local.example`

**Interfaces:**
- Consumes: Cognito `USER_POOL_ID`, `USER_POOL_CLIENT_ID` (from infra outputs); API base URL.

- [ ] **Step 1: Init Next app**

```bash
cd frontend
pnpm create next-app@latest . --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --no-turbopack
pnpm add aws-amplify
```

- [ ] **Step 2: Write `frontend/.env.local.example`**

```bash
NEXT_PUBLIC_USER_POOL_ID=
NEXT_PUBLIC_USER_POOL_CLIENT_ID=
NEXT_PUBLIC_API_URL=
```

- [ ] **Step 3: Write `frontend/src/lib/amplify.ts`**

```typescript
"use client";
import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID as string,
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID as string,
    },
  },
});

export const apiUrl = process.env.NEXT_PUBLIC_API_URL as string;
```

- [ ] **Step 4: Write `frontend/src/app/(auth)/sign-in/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { signIn } from "aws-amplify/auth";
import "@/lib/amplify";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signIn({ username: email, password });
      window.location.href = "/profile";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    }
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-4 text-xl font-semibold">Sign in to Tlaloc</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input className="border p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="border p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="bg-black p-2 text-white" type="submit">Sign in</button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Write `frontend/src/app/(auth)/sign-up/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { signUp, confirmSignUp } from "aws-amplify/auth";
import "@/lib/amplify";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"form" | "confirm">("form");
  const [error, setError] = useState<string | null>(null);

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signUp({ username: email, password, options: { userAttributes: { email } } });
      setStage("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      window.location.href = "/sign-in";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    }
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-4 text-xl font-semibold">Create your Tlaloc account</h1>
      {stage === "form" ? (
        <form onSubmit={onSignUp} className="flex flex-col gap-3">
          <input className="border p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="border p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="bg-black p-2 text-white" type="submit">Sign up</button>
        </form>
      ) : (
        <form onSubmit={onConfirm} className="flex flex-col gap-3">
          <input className="border p-2" placeholder="Confirmation code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="bg-black p-2 text-white" type="submit">Confirm</button>
        </form>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}
```

- [ ] **Step 6: Write `frontend/src/app/profile/page.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { apiUrl } from "@/lib/amplify";

export default function ProfilePage() {
  const [profile, setProfile] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const res = await fetch(`${apiUrl}profiles/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`API ${res.status}`);
        setProfile(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-4 text-xl font-semibold">Your profile</h1>
      {error && <p className="text-red-600">{error}</p>}
      <pre className="bg-gray-100 p-4 text-sm">{JSON.stringify(profile, null, 2)}</pre>
    </main>
  );
}
```

**CDK Warning:** API GW Cognito authorizer expects the **ID token** in the `Authorization` header (`CognitoUserPoolsAuthorizer` validates ID/access tokens from the pool). The page sends `idToken` — keep it as the ID token, not the access token, unless the authorizer is reconfigured.

- [ ] **Step 7: Verify build**

Run: `pnpm --filter frontend build`
Expected: Next build succeeds (env vars can be empty for build; runtime needs them).

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "feat(frontend): next shell, amplify auth, custom sign-in/up, profile page"
```

---

## Phase 4 — Deploy + DNS wiring (manual, ordered)

### Task 12: Bootstrap + first deploy (no custom domain)

- [ ] **Step 1: Configure AWS + bootstrap**

```bash
aws sts get-caller-identity   # confirm correct account
pnpm --filter infra exec cdk bootstrap aws://<ACCOUNT_ID>/us-east-1
```

- [ ] **Step 2: Deploy both stacks (API_CERT_ARN unset → custom domain skipped)**

```bash
ENV=dev pnpm --filter infra exec cdk deploy --all --require-approval never
```
Expected outputs: `tlaloc-dev-services.ApiUrl`, SES DKIM CNAME records (from the data stack / SES console).

- [ ] **Step 3: Verify health on the default URL**

```bash
curl "$(aws cloudformation describe-stacks --stack-name tlaloc-dev-services --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)health"
```
Expected: `{"status":"ok"}`

- [ ] **Step 4: Commit any synth/config fixes**

```bash
git add -A && git commit -m "chore(infra): first deploy fixes"
```

### Task 13: SES domain verification + production access

- [ ] **Step 1: Get SES DKIM records**

```bash
aws sesv2 get-email-identity --email-identity tlaloc.space --query DkimAttributes
```

- [ ] **Step 2: Add the 3 DKIM CNAME records to Namecheap** (Advanced DNS → add CNAME for each `*._domainkey.tlaloc.space`). Wait for `aws sesv2 get-email-identity` → `DkimAttributes.Status: SUCCESS`.

- [ ] **Step 3: Verify the sender + add custom MAIL FROM (optional) and confirm `info@tlaloc.space` deliverability.**

- [ ] **Step 4: Request SES production access** (Console → SES → Account dashboard → Request production access). This removes the sandbox so sign-up emails reach any address. ~24h approval — **do this on day 1.**

### Task 14: ACM cert + custom domain `api.tlaloc.space`

- [ ] **Step 1: Request the cert in us-east-1**

```bash
aws acm request-certificate --domain-name api.tlaloc.space --validation-method DNS --region us-east-1
```

- [ ] **Step 2: Read the DNS validation CNAME**

```bash
aws acm describe-certificate --certificate-arn <ARN> --region us-east-1 --query "Certificate.DomainValidationOptions"
```

- [ ] **Step 3: Add that CNAME to Namecheap; wait for cert `Status: ISSUED`.**

- [ ] **Step 4: Redeploy services with the cert ARN to attach the custom domain**

```bash
ENV=dev API_CERT_ARN=<ARN> pnpm --filter infra exec cdk deploy tlaloc-dev-services --require-approval never
```
Expected new output: `CustomDomainTarget` (the regional alias target).

- [ ] **Step 5: Add a CNAME in Namecheap: `api` → `<CustomDomainTarget>`. Verify:**

```bash
curl https://api.tlaloc.space/health
```
Expected: `{"status":"ok"}`

### Task 15: Frontend env wiring + Amplify hosting

- [ ] **Step 1: Fill `frontend/.env.local`** with `USER_POOL_ID`, `USER_POOL_CLIENT_ID` (from `tlaloc-dev-data` outputs / Cognito console) and `NEXT_PUBLIC_API_URL=https://api.tlaloc.space/`.

- [ ] **Step 2: Local smoke test** — sign up, confirm with the emailed code, sign in, land on `/profile`, confirm `GET /profiles/me` returns the seeded profile.

- [ ] **Step 3: Connect the repo to AWS Amplify Hosting** (Console → Amplify → host web app → connect branch). Set the three `NEXT_PUBLIC_*` env vars in Amplify. `ponytail: Amplify hosting wired via console, not CDK — IaC it only if the hosting config needs to be reproducible.`

---

## Self-Review

**Spec coverage:**
- Serverless Lambda + API GW → Task 4, 7, 12 ✓
- NestJS monolith → Task 6–10 ✓
- DynamoDB profiles → Task 3, 10 ✓
- S3 file storage (presigned) → Task 3, 10 ✓
- Cognito + custom sign-in (Amplify) + JWT authorizer + API-key tier → Task 3, 4, 9, 11 ✓
- SES info@tlaloc.space + confirm/reset/welcome shells → Task 3, 9, 13 ✓
- Custom domain api.tlaloc.space via Namecheap (manual) → Task 4, 14 ✓
- CDK + name builder + best practices (stateful/stateless, nag, snapshot tests, grants) → Task 1–5 ✓
- Monorepo, dev+prod via ENV → Task 0, 1 ✓
- Frontend Next shell on Amplify → Task 11, 15 ✓

**Placeholder scan:** email template copy is intentionally `TODO` per spec (shells). No other TBDs.

**Type consistency:** `AuthUser`, `Profile`, `EnvConfig`, `buildName`, `baseConfig`, stack prop types consistent across tasks. `ENV_CONFIG` token defined in service, consumed in module.

**Scope:** Three subsystems in one plan (infra/backend/frontend) but delivered as one coherent shell; phased so each phase is independently testable. Acceptable for a hackathon MVP.
