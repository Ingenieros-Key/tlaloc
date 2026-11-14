# Tlaloc — Infra + Backend Shell Design

**Date:** 2026-11-14
**Context:** NASA Space Apps 2026 — "Adapting Farms with NASA Data". Hackathon MVP.
**Domain:** tlaloc.space (DNS at Namecheap). API at `api.tlaloc.space`.

## Goal

Stand up a serverless AWS backend shell + CDK infra + minimal frontend shell so
services can be added later without re-plumbing. No product logic yet — only the
scaffold: auth, profile, file storage, email hooks, custom API domain.

## Stack decisions (locked)

| Concern | Choice | Why |
|---|---|---|
| IaC | AWS CDK (TypeScript) | Per team best practices + name builder |
| Compute | Single NestJS monolith on one Lambda | New services = Nest modules, one deploy artifact |
| API | API Gateway **REST (v1)** + `{proxy+}` | Only v1 gives native Cognito authorizer **and** API keys/usage plans |
| Auth | Cognito user pool, JWT authorizer | Custom sign-in page via Amplify Auth lib |
| Service tier | API-key usage plan | Separate machine/public tier, distinct from JWT |
| Data | DynamoDB on-demand (PAY_PER_REQUEST) | Pennies at low volume, zero capacity ops |
| File storage | S3 + presigned upload URLs | Profile media |
| Email | SES (`info@tlaloc.space`) | Confirmation code, password reset, welcome |
| DNS | **Namecheap (manual records)** | Route53 not free; paste cert/SES records by hand |
| Region | `us-east-1` | Simplest for Amplify/ACM |
| Repo | pnpm workspaces monorepo | infra / backend / frontend |
| Env | `dev` + `prod` via `ENV` var | Name builder makes prod a flag flip |
| Frontend | Next.js on Amplify (shell only) | Wire hosting later |

## Cost posture

Everything inside free tier or ~$0 at hackathon volume. Known non-free item:
none chosen (Namecheap avoids Route53's $0.50/mo). ACM certs free. Lambda/API
GW/Dynamo/S3/Cognito/SES/Amplify all free-tier-covered at this scale.

## Repo layout

```
tlaloc/
  package.json            # pnpm workspace root
  pnpm-workspace.yaml
  infra/                  # CDK app
    bin/app.ts
    lib/
      config/             # env config + name builder
      stacks/
        stateful-stack.ts
        stateless-stack.ts
    cdk.json
  backend/                # NestJS monolith
    src/
      main.ts             # local server
      lambda.ts           # serverless handler
      app.module.ts
      modules/
        health/           # proves wiring day 1
        profiles/         # Cognito-linked profile + S3 presign
      common/             # dynamo client, s3 client, config, jwt guard
    package.json
  frontend/               # Next.js shell
    ...
  docs/superpowers/specs/
```

## CDK stacks (stateful / stateless split)

**StatefulStack** — `RETAIN` on destroy:
- DynamoDB `tlaloc-${env}-profiles` — PK `userId` (Cognito sub), PAY_PER_REQUEST
- S3 bucket `tlaloc-${env}-media` — private, presigned access only
- Cognito user pool + app client (custom UI, no hosted UI)
- SES domain identity for `tlaloc.space` + `info@tlaloc.space` sender

**StatelessStack**:
- One Lambda packaging the Nest monolith
- REST API Gateway, `{proxy+}` → Lambda
- Cognito JWT authorizer on user routes
- API-key + usage plan (service tier)
- Custom domain `api.tlaloc.space` + ACM cert (DNS-validated via Namecheap, manual paste)
- Cognito triggers: `CustomMessage` Lambda (confirm code + reset), `PostConfirmation` Lambda (welcome email)

### Name builder

`tlaloc-${env}-${resource}` from a single helper in `infra/lib/config/`. `env`
read from CDK context / `ENV` var, default `dev`. Prod = `ENV=prod cdk deploy`.

## Backend modules (shells, no logic)

- **health** — `GET /health` returns ok. Proves Lambda + API GW + domain wiring.
- **profiles** — CRUD shell for a profile linked to Cognito `sub`. `GET /profiles/me`,
  `PUT /profiles/me`, `POST /profiles/me/avatar` (returns S3 presigned PUT URL).
  Personal info fields + avatar key. Backs future "plot of land" / world explore.
- **common** — DynamoDB doc client, S3 client, env/name config, JWT guard reading
  Cognito claims from API GW authorizer context.

## Auth flow

1. Next frontend uses Amplify Auth (Cognito) with a custom sign-in/sign-up page.
2. Sign-up → Cognito sends confirmation code via SES (CustomMessage trigger,
   template shelled empty).
3. Confirm → PostConfirmation trigger sends welcome email via SES (shelled).
4. Password reset → CustomMessage trigger (shelled).
5. API calls carry Cognito JWT; API GW Cognito authorizer validates; Lambda reads
   `sub` from authorizer context to scope data.
6. Service tier: API key in header, validated by usage plan (no JWT).

## Email templates

Three SES/Cognito email bodies left as empty template functions with TODO markers:
confirmation code, password reset, welcome. Copy written later.

## Explicitly out of scope (fill when defined)

- Real DynamoDB schema beyond `profiles` (plots, world-data tables)
- Actual farm/NASA-data endpoints and business logic
- Email template copy
- Amplify hosting pipeline wiring (frontend deploy)
- Multi-account / CI-CD

## Known risks / actions

- **SES sandbox**: must request SES production access (~24h) before sign-ups can
  email non-verified users. Request on day 1.
- **Manual DNS**: cert + SES verification require pasting records into Namecheap;
  `cdk deploy` of the custom domain / cert will wait on validation. Provision cert
  as an early, separate step; paste records; then deploy the rest.
