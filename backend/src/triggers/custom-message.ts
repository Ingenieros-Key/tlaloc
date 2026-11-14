import { CustomMessageTriggerHandler } from 'aws-lambda';
import { confirmationEmail, passwordResetEmail } from './email-templates.js';

export const handler: CustomMessageTriggerHandler = async (event) => {
  const code = event.request.codeParameter;
  if (
    event.triggerSource === 'CustomMessage_SignUp' ||
    event.triggerSource === 'CustomMessage_ResendCode'
  ) {
    const { subject, body } = confirmationEmail(code);
    event.response.emailSubject = subject;
    event.response.emailMessage = body;
  } else if (event.triggerSource === 'CustomMessage_ForgotPassword') {
    const { subject, body } = passwordResetEmail(code);
    event.response.emailSubject = subject;
    event.response.emailMessage = body;
  }
  return event;
};
