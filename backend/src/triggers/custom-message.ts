import { CustomMessageTriggerHandler } from 'aws-lambda';
import { confirmationEmail, passwordResetEmail, resolveLang } from './email-templates.js';

export const handler: CustomMessageTriggerHandler = async (event) => {
  const code = event.request.codeParameter;
  const lang = resolveLang(event.request.userAttributes?.locale);
  if (
    event.triggerSource === 'CustomMessage_SignUp' ||
    event.triggerSource === 'CustomMessage_ResendCode'
  ) {
    const { subject, body } = confirmationEmail(code, lang);
    event.response.emailSubject = subject;
    event.response.emailMessage = body;
  } else if (event.triggerSource === 'CustomMessage_ForgotPassword') {
    const { subject, body } = passwordResetEmail(code, lang);
    event.response.emailSubject = subject;
    event.response.emailMessage = body;
  }
  return event;
};
