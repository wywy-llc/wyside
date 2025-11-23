import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import path from 'path';

async function getGmailClient() {
  const keyFile = path.join(process.cwd(), 'secrets/service-account.json');
  const auth = new GoogleAuth({
    keyFile,
    scopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
  });
  return google.gmail({ version: 'v1', auth });
}

interface SendEmailArgs {
  to: string;
  subject: string;
  body: string;
}

export async function gmailSendEmail(args: SendEmailArgs) {
  try {
    const { to, subject, body } = args;
    if (!to || !subject || !body)
      throw new Error('to, subject, and body are required');

    // Note: Service Accounts cannot easily send email on behalf of users without Domain-Wide Delegation.
    // This tool might fail if the SA is not properly configured or if we are not using impersonation.
    // However, for "wyside" context, we assume the user might be using their own credentials or an SA with proper setup.
    // If using SA without impersonation, the "from" address is the SA email.

    // Construct raw email
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const gmail = await getGmailClient();
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      content: [{ type: 'text', text: `Email sent. ID: ${res.data.id}` }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }\nNote: Sending email via Service Account requires 'me' to be the SA email or using impersonation (which requires Domain-Wide Delegation).`,
        },
      ],
      isError: true,
    };
  }
}

export async function gmailListLabels() {
  try {
    const gmail = await getGmailClient();
    const res = await gmail.users.labels.list({ userId: 'me' });
    const labels = res.data.labels;

    if (!labels || labels.length === 0) {
      return { content: [{ type: 'text', text: 'No labels found.' }] };
    }

    const list = labels
      .map(l => `- ${l.name} (${l.type}) [ID: ${l.id}]`)
      .join('\n');
    return { content: [{ type: 'text', text: `Labels:\n${list}` }] };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
