import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { dynamoDoc } from '../common/aws/dynamo.client.js';
import { reminderEmail, resolveLang, ReminderType } from './email-templates.js';

const region = process.env.REGION ?? 'us-east-1';
const ses = new SESv2Client({ region });

const SENDER = 'info@tlaloc.space';
const TABLE = process.env.NOTIFICATIONS_TABLE as string;

const TYPES: readonly ReminderType[] = ['rotation', 'irrigation'];

type Prefs = {
  userId: string;
  email?: string;
  locale?: string;
  rotation?: boolean;
  irrigation?: boolean;
};

/**
 * Scheduled (daily) reminder fan-out: scan notification prefs and email each user the
 * reminder types they've enabled. Recipient email + locale are stamped onto the record
 * when the user saves prefs (email from the Cognito auth claims, locale from the UI),
 * so no per-user Cognito lookup is needed. Per-user errors are swallowed so one bad
 * record never blocks the rest.
 * ponytail: single Scan page (fine for a hackathon-scale user base); add
 * ExclusiveStartKey pagination if prefs ever exceed one 1MB scan page.
 */
export const handler = async (): Promise<void> => {
  const scan = await dynamoDoc.send(new ScanCommand({ TableName: TABLE }));
  const all = (scan.Items ?? []) as Prefs[];

  for (const prefs of all) {
    const enabled = TYPES.filter((t) => prefs[t]);
    if (enabled.length === 0 || !prefs.email) continue;

    const lang = resolveLang(prefs.locale);
    try {
      for (const type of enabled) {
        const { subject, body } = reminderEmail(type, lang);
        await ses.send(
          new SendEmailCommand({
            FromEmailAddress: SENDER,
            Destination: { ToAddresses: [prefs.email] },
            Content: {
              Simple: {
                Subject: { Data: subject },
                Body: { Html: { Data: body } },
              },
            },
          }),
        );
      }
    } catch {
      /* logged by Lambda runtime; skip this user and continue */
    }
  }
};
