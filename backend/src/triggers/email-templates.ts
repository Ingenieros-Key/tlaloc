const ASSET_BASE = process.env.TLALOC_ASSET_BASE_URL ?? 'https://tlaloc.space';
const LOGO_URL = `${ASSET_BASE}/tlaloc-icon.png`;

// Cognito's auto-generated sign-up / reset codes expire after 24h; this value
// is not configurable, so the copy must match it.
const CODE_TTL_HOURS = 24;

const COLORS = {
  noche: '#0B1033',
  jade: '#1FC8B4',
  maiz: '#F6B93B',
  hueso: '#F4F0E6',
  piedra: '#9AA3C7',
  ink: '#1a1f36',
  muted: '#6b7280',
};

const FONT_STACK =
  "'Chakra Petch','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function shell(opts: {
  preheader: string;
  code: string;
  codeLabel: string;
  blocks: string;
  footerNote: string;
}): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;700&display=swap');</style>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.noche};font-family:${FONT_STACK};">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.noche};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;">
            <tr>
              <td align="center" style="background:${COLORS.noche};padding:32px 24px 24px;">
                <img src="${LOGO_URL}" width="72" height="72" alt="Tlaloc" style="display:block;border:0;border-radius:16px;" />
                <div style="color:${COLORS.hueso};font-size:28px;font-weight:700;letter-spacing:0.02em;margin-top:12px;">Tlaloc</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <div style="text-align:center;color:${COLORS.muted};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:8px;">${opts.codeLabel}</div>
                <div style="text-align:center;background:${COLORS.hueso};border:1px solid #e5e2d8;border-radius:14px;padding:18px;color:${COLORS.noche};font-size:34px;font-weight:700;letter-spacing:0.3em;">${opts.code}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px;color:${COLORS.ink};font-size:15px;line-height:1.6;">
                ${opts.blocks}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 28px;color:${COLORS.muted};font-size:12px;line-height:1.6;">
                ${opts.footerNote}
              </td>
            </tr>
            <tr>
              <td align="center" style="background:${COLORS.noche};padding:18px 24px;color:${COLORS.piedra};font-size:11px;">
                © 2026 Tlaloc. Todos los derechos reservados · All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function confirmationEmail(code: string): {
  subject: string;
  body: string;
} {
  const blocks = `
    <p style="margin:0 0 12px;"><strong>Confirma tu cuenta.</strong> Usa este código para confirmar tu cuenta de Tlaloc. Expira en ${CODE_TTL_HOURS} horas.</p>
    <p style="margin:0;"><strong>Confirm your account.</strong> Use this code to confirm your Tlaloc account. It expires in ${CODE_TTL_HOURS} hours.</p>`;
  const footerNote = `
    <p style="margin:0 0 6px;">Si no creaste esta cuenta, puedes ignorar este correo.</p>
    <p style="margin:0;">If you didn't create this account, you can ignore this email.</p>`;
  return {
    subject: 'Tu código de confirmación de Tlaloc · Your Tlaloc confirmation code',
    body: shell({
      preheader: 'Confirma tu cuenta de Tlaloc · Confirm your Tlaloc account',
      code,
      codeLabel: 'Código de confirmación · Confirmation code',
      blocks,
      footerNote,
    }),
  };
}

export function passwordResetEmail(code: string): {
  subject: string;
  body: string;
} {
  const blocks = `
    <p style="margin:0 0 12px;"><strong>Restablece tu contraseña.</strong> Usa este código para restablecer tu contraseña de Tlaloc. Expira en ${CODE_TTL_HOURS} horas.</p>
    <p style="margin:0;"><strong>Reset your password.</strong> Use this code to reset your Tlaloc password. It expires in ${CODE_TTL_HOURS} hours.</p>`;
  const footerNote = `
    <p style="margin:0 0 6px;">Si no solicitaste esto, puedes ignorar este correo.</p>
    <p style="margin:0;">If you didn't request this, you can ignore this email.</p>`;
  return {
    subject: 'Tu código para restablecer la contraseña · Your Tlaloc password reset code',
    body: shell({
      preheader: 'Restablece tu contraseña de Tlaloc · Reset your Tlaloc password',
      code,
      codeLabel: 'Código para restablecer · Reset code',
      blocks,
      footerNote,
    }),
  };
}

export function welcomeEmail(email: string): { subject: string; body: string } {
  return { subject: 'Welcome to Tlaloc', body: `Welcome, ${email}.` };
}
