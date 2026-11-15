import { PostConfirmationTriggerHandler } from 'aws-lambda';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { welcomeEmail, resolveLang } from './email-templates.js';

const ses = new SESv2Client({ region: process.env.REGION ?? 'us-east-1' });
const SENDER = 'info@tlaloc.space';

/**
 * ponytail: fire-and-forget welcome; swallow SES errors so sign-up confirmation never fails.
 */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  const email = event.request.userAttributes.email;
  if (!email) return event;
  const lang = resolveLang(event.request.userAttributes.locale);
  const { subject, body } = welcomeEmail(email, lang);
  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: SENDER,
        Destination: { ToAddresses: [email] },
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: { Html: { Data: body } },
          },
        },
      }),
    );
  } catch {
    /* logged by Lambda runtime; do not block sign-up */
  }
  return event;
};
