/**
 * Send a rendered email template to yourself to preview formatting.
 *
 *   pnpm --filter backend email:test -- --to you@example.com --template welcome
 *
 * --template: confirm | reset | welcome (default: welcome)
 * --to:       recipient (required; must be SES-verified if the account is in sandbox)
 * --from:     sender (default info@tlaloc.space; must be a verified identity)
 *
 * Uses your local AWS credentials (region us-east-1 by default).
 */
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import {
  confirmationEmail,
  passwordResetEmail,
  welcomeEmail,
} from '../src/triggers/email-templates.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const to = arg('to');
const template = (arg('template') ?? 'welcome') as 'confirm' | 'reset' | 'welcome';
const from = arg('from') ?? 'info@tlaloc.space';
const region = process.env.REGION ?? 'us-east-1';

if (!to) {
  console.error('Missing --to <email>');
  process.exit(1);
}

const rendered =
  template === 'confirm'
    ? confirmationEmail('123456')
    : template === 'reset'
      ? passwordResetEmail('123456')
      : welcomeEmail(to);

const ses = new SESv2Client({ region });

await ses.send(
  new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: rendered.subject },
        Body: { Html: { Data: rendered.body } },
      },
    },
  }),
);

console.log(`Sent "${template}" email to ${to} from ${from} (region ${region}).`);
