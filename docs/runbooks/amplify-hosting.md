# Host the frontend on AWS Amplify (monorepo, console)

The frontend is a Next.js app at `frontend/` inside a pnpm workspace. Amplify Hosting supports
monorepos via an **app root**. A ready build spec lives at repo root: `amplify.yml`
(`appRoot: frontend`, pnpm via corepack).

## Prerequisite — the repo must be on a Git provider

Amplify console hosting connects to GitHub/GitLab/Bitbucket. This repo currently has no remote.
Push it first:
```bash
# create an empty repo on GitHub (gh or the web UI), then:
git remote add origin git@github.com:<you>/tlaloc.git   # or https
git push -u origin main
git push origin dev prod
```

## 1. Create the Amplify app

1. AWS Console → **Amplify** (region **us-east-1**) → **Create new app** → **Host web app**.
2. Pick your Git provider, authorize, select the **tlaloc** repo and the **main** branch
   (connect `dev`/`prod` branches later for per-env sites).
3. Amplify detects the monorepo. When asked, set **Monorepo / app root** = `frontend`.
   (If it doesn't prompt, it will pick up `appRoot: frontend` from the committed `amplify.yml`.)
4. Build settings: it should auto-load the repo's `amplify.yml`. If it shows a default spec
   instead, paste the contents of `amplify.yml` from the repo root.

## 2. Set environment variables (from the backend deploy outputs)

Amplify app → **Hosting → Environment variables** → add (these are the `tlaloc-dev-*` outputs):
```
NEXT_PUBLIC_USER_POOL_ID        = <UserPool id>
NEXT_PUBLIC_USER_POOL_CLIENT_ID = <UserPool web client id>
NEXT_PUBLIC_API_URL             = https://api.tlaloc.space/   (or the execute-api URL until the custom domain is live — keep the trailing slash)
```
Get them any time with:
```bash
aws cognito-idp list-user-pools --max-results 10 --region us-east-1
aws cloudformation describe-stacks --stack-name tlaloc-dev-services --region us-east-1 \
  --query "Stacks[0].Outputs" --output table
```
`NEXT_PUBLIC_*` vars are baked at **build** time — after changing them, **redeploy** the branch.

## 3. Deploy

Save & deploy. Amplify builds `frontend` and hosts it at `https://main.<appid>.amplifyapp.com`.

## 4. (Optional) Custom domain `tlaloc.space` for the frontend

Amplify → **Hosting → Custom domains** → add `tlaloc.space`. Amplify issues its own ACM cert and
shows CNAME/ANAME records → add them at Namecheap. (The under-construction `landing/` page can stay
as a separate simple host or be replaced by this Amplify app when ready.)

## Notes
- Per-env branches: connect `dev` and `prod` as separate Amplify branches, each with its own
  `NEXT_PUBLIC_*` env values pointing at that env's Cognito pool + API.
- Next SSR: Amplify's Next.js runtime handles it; our pages are client-rendered so a static build
  works too — no extra config needed.
