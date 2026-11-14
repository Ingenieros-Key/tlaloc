export function confirmationEmail(code: string): {
  subject: string;
  body: string;
} {
  // TODO: hackathon copy. Keep {code} visible.
  return { subject: 'Confirm your Tlaloc account', body: `Your code: ${code}` };
}

export function passwordResetEmail(code: string): {
  subject: string;
  body: string;
} {
  // TODO: hackathon copy.
  return {
    subject: 'Reset your Tlaloc password',
    body: `Your reset code: ${code}`,
  };
}

export function welcomeEmail(email: string): { subject: string; body: string } {
  // TODO: hackathon copy.
  return { subject: 'Welcome to Tlaloc', body: `Welcome, ${email}.` };
}
