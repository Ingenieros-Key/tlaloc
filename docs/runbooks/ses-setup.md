# SES setup — tlaloc.space (region us-east-1)

Goal: send confirmation-code, password-reset, and welcome emails from `info@tlaloc.space`.
Everything below is **us-east-1** (same region as the stacks). DNS is manual at Namecheap.

Two clocks run in parallel — start **Phase A now** (it takes ~24h to approve), do Phase B meanwhile.

---

## Phase A — Request production access (start the 24h clock NOW)

SES starts in **sandbox**: you can only email verified addresses. Sign-ups to real users need
production access. This is an **account+region** request — you can submit it before the domain is
even verified.

**Console:** SES → (region us-east-1) → Account dashboard → **Request production access**.
- Mail type: **Transactional**
- Website URL: `https://tlaloc.space`
- Use case: "Transactional auth emails for the Tlaloc web app (NASA Space Apps 2026): email
  confirmation codes, password resets, and welcome emails. Recipients are users who signed up."
- Compliance: confirm you only email people who opted in and you handle bounces/complaints.

**Or CLI:**
```bash
aws sesv2 put-account-details \
  --region us-east-1 \
  --production-access-enabled \
  --mail-type TRANSACTIONAL \
  --website-url https://tlaloc.space \
  --contact-language EN \
  --use-case-description "Transactional auth emails for the Tlaloc web app: email confirmation codes, password resets, welcome emails. Recipients are users who signed up." \
  --additional-contact-email-addresses info@tlaloc.space
```
Approval usually lands within 24h by email.

> While waiting (sandbox), you can still test end-to-end by verifying your OWN test email as a
> recipient: `aws sesv2 create-email-identity --region us-east-1 --email-identity you@example.com`
> then click the link AWS emails you. Sandbox can only send TO such verified addresses.

---

## Phase B — Verify the domain `tlaloc.space`

The domain identity + Easy DKIM is created by our CDK **DataStack**, so deploy that first (keeps
IaC authoritative — don't hand-create the identity in the console or CDK will later conflict).

### 1. Bootstrap + deploy the data stack (creates the SES identity)
```bash
# one-time per account/region
ENV=dev pnpm --filter infra exec cdk bootstrap aws://<ACCOUNT_ID>/us-east-1
# creates DynamoDB/S3/Cognito/SES identity + triggers
ENV=dev pnpm --filter infra exec cdk deploy tlaloc-dev-data --require-approval never
```

### 2. Read the 3 Easy-DKIM CNAME records
```bash
aws sesv2 get-email-identity --region us-east-1 --email-identity tlaloc.space \
  --query 'DkimAttributes.Tokens' --output text
```
Each token `T` becomes one CNAME:
- **Host:** `T._domainkey`   (Namecheap appends `.tlaloc.space`)
- **Type:** CNAME
- **Value:** `T.dkim.amazonses.com`

### 3. Add the 3 CNAMEs at Namecheap
Namecheap → Domain List → `tlaloc.space` → **Manage** → **Advanced DNS** → Host Records →
**Add New Record** ×3 (CNAME). Host = `T._domainkey`, Value = `T.dkim.amazonses.com`, TTL Automatic.
Save. (Do NOT type the full domain in Host — Namecheap appends it.)

### 4. Wait for verification (minutes–hours)
```bash
aws sesv2 get-email-identity --region us-east-1 --email-identity tlaloc.space \
  --query '{dkim:DkimAttributes.Status, sending:VerifiedForSendingStatus}'
```
Wait for `dkim: SUCCESS` and `sending: true`. Once the **domain** verifies, every address
`@tlaloc.space` (including `info@tlaloc.space`) can send — no per-address verification needed.

---

## Phase C — Route Cognito's confirm/reset mail through SES

Until now Cognito sends confirm/reset mail from its own default sender. After the domain is
verified (Phase B) **and** production access is granted (Phase A), flip the gate and redeploy so
those emails come from `info@tlaloc.space`:

```bash
ENV=dev SES_READY=true pnpm --filter infra exec cdk deploy tlaloc-dev-data --require-approval never
```
This sets the pool's `UserPoolEmail.withSES({ fromEmail: info@tlaloc.space })`. The welcome email
(PostConfirmation trigger) already sends via SES directly once Phase A+B are done.

> If you deploy with `SES_READY=true` **before** the domain is verified, Cognito rejects the pool
> update ("email identity not verified"). Order matters: B verifies → then C.

---

## Quick checklist
- [ ] Phase A submitted (24h clock started)
- [ ] `cdk deploy tlaloc-dev-data` done → SES identity exists
- [ ] 3 DKIM CNAMEs added at Namecheap
- [ ] `dkim: SUCCESS`, `sending: true`
- [ ] Production access granted (email from AWS)
- [ ] Redeploy with `SES_READY=true`
- [ ] Test: sign up a real address → receive confirmation code from info@tlaloc.space

## Notes
- Email template copy (confirm/reset/welcome) is still shell with `TODO` markers in
  `backend/src/triggers/email-templates.ts` — write real copy anytime, no infra change needed.
- Optional later: custom MAIL FROM subdomain (e.g. `mail.tlaloc.space`) for stricter SPF/DMARC
  alignment — skipped for the hackathon.
