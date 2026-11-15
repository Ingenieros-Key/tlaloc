#!/usr/bin/env bash
# Deploy a Tlaloc environment: CDK stacks + trigger the Amplify branch build.
#
#   scripts/deploy.sh [dev|prod] [--infra-only|--frontend-only]
#
# No env arg -> prompts. Discovers the Amplify app + branch via AWS CLI so you
# don't hardcode IDs. SES_READY=true is always set so the Cognito SES email
# config is preserved (without it, cdk strips EmailConfiguration).
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENVIRONMENT="${1:-}"
MODE="${2:-all}"
case "$MODE" in --infra-only) MODE=infra;; --frontend-only) MODE=frontend;; *) MODE=all;; esac

if [[ -z "$ENVIRONMENT" ]]; then
  read -rp "Environment to deploy [dev/prod]: " ENVIRONMENT
fi
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Env must be 'dev' or 'prod' (got '$ENVIRONMENT')." >&2
  exit 1
fi
if [[ "$ENVIRONMENT" == "prod" ]]; then
  read -rp "Deploy to PROD. Type 'prod' to confirm: " c
  [[ "$c" == "prod" ]] || { echo "Aborted."; exit 1; }
fi

echo "==> Environment: $ENVIRONMENT  (region $REGION, mode $MODE)"

if [[ "$MODE" == "all" || "$MODE" == "infra" ]]; then
  echo "==> CDK deploy (data + services)"
  ( cd "$ROOT/infra" && SES_READY=true pnpm exec cdk deploy \
      "tlaloc-$ENVIRONMENT-data" "tlaloc-$ENVIRONMENT-services" \
      --require-approval never )

  echo "==> Stack outputs (frontend NEXT_PUBLIC_* values):"
  aws cloudformation describe-stacks --region "$REGION" \
    --stack-name "tlaloc-$ENVIRONMENT-services" \
    --query "Stacks[0].Outputs" --output table || true
fi

if [[ "$MODE" == "all" || "$MODE" == "frontend" ]]; then
  echo "==> Discovering Amplify app 'tlaloc'"
  APP_ID="$(aws amplify list-apps --region "$REGION" \
    --query "apps[?name=='tlaloc'].appId | [0]" --output text)"
  if [[ -z "$APP_ID" || "$APP_ID" == "None" ]]; then
    echo "No Amplify app named 'tlaloc' found." >&2
    exit 1
  fi
  echo "    appId=$APP_ID branch=$ENVIRONMENT"
  echo "==> Triggering Amplify build on branch '$ENVIRONMENT'"
  JOB="$(aws amplify start-job --app-id "$APP_ID" --branch-name "$ENVIRONMENT" \
    --job-type RELEASE --region "$REGION" --query "jobSummary.jobId" --output text)"
  echo "    started job $JOB"
  echo "    watch: https://$ENVIRONMENT.$(aws amplify get-app --app-id "$APP_ID" --region "$REGION" --query 'app.defaultDomain' --output text)"
fi

echo "==> Done."
