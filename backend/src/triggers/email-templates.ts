export type Lang = 'en' | 'es';

const ASSET_BASE =
  process.env.TLALOC_ASSET_BASE_URL ?? 'https://dev.d25pn0dlq8jiih.amplifyapp.com';
const SITE_URL = process.env.TLALOC_SITE_URL ?? 'https://tlaloc.space';
const LOGO_URL = `${ASSET_BASE}/tlaloc-mascot.png`;

// Cognito's auto-generated sign-up / reset codes expire after 24h; this value
// is not configurable, so the copy must match it.
const CODE_TTL_HOURS = 24;

const COLORS = {
  noche: '#0B1033',
  jade: '#1FC8B4',
  hueso: '#F4F0E6',
  piedra: '#9AA3C7',
  ink: '#1a1f36',
  muted: '#6b7280',
};

const FONT_STACK = "'Chakra Petch','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Normalize a Cognito `locale` attribute (e.g. "es-SV") to a supported Lang; default English. */
export function resolveLang(locale: string | undefined): Lang {
  return locale?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

const RIGHTS: Record<Lang, string> = {
  en: '© 2026 Tlaloc. All rights reserved.',
  es: '© 2026 Tlaloc. Todos los derechos reservados.',
};

function shell(opts: {
  preheader: string;
  codeLabel?: string;
  code?: string;
  blocks: string;
  cta?: { url: string; label: string };
  footerNote?: string;
  lang: Lang;
}): string {
  const codeRow = opts.code
    ? `<tr>
         <td align="center" style="padding:32px 32px 8px;">
           <div style="color:${COLORS.muted};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:8px;">${opts.codeLabel ?? ''}</div>
           <div style="background:${COLORS.hueso};border:1px solid #e5e2d8;border-radius:14px;padding:18px;color:${COLORS.noche};font-size:34px;font-weight:700;letter-spacing:0.3em;">${opts.code}</div>
         </td>
       </tr>`
    : '';

  const ctaRow = opts.cta
    ? `<tr>
         <td align="center" style="padding:8px 32px 24px;">
           <a href="${opts.cta.url}" style="display:inline-block;background:${COLORS.jade};color:${COLORS.noche};text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:999px;">${opts.cta.label}</a>
         </td>
       </tr>`
    : '';

  const footerRow = opts.footerNote
    ? `<tr><td align="center" style="padding:8px 32px 28px;color:${COLORS.muted};font-size:12px;line-height:1.6;">${opts.footerNote}</td></tr>`
    : '';

  return `<!doctype html>
<html lang="${opts.lang}">
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
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">
            <tr>
              <td align="center" style="background:${COLORS.noche};padding:32px 24px 24px;">
                <img src="${LOGO_URL}" width="108" height="108" alt="Tlaloc" style="display:block;border:0;border-radius:20px;" />
                <div style="color:${COLORS.hueso};font-size:28px;font-weight:700;letter-spacing:0.02em;margin-top:12px;">Tlaloc</div>
              </td>
            </tr>
            ${codeRow}
            <tr>
              <td align="center" style="padding:24px 32px 8px;color:${COLORS.ink};font-size:15px;line-height:1.6;text-align:center;">
                ${opts.blocks}
              </td>
            </tr>
            ${ctaRow}
            ${footerRow}
            <tr>
              <td align="center" style="background:${COLORS.noche};padding:18px 24px;color:${COLORS.piedra};font-size:11px;text-align:center;">
                ${RIGHTS[opts.lang]}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const confirmCopy: Record<Lang, { subject: string; preheader: string; codeLabel: string; body: string; note: string }> = {
  en: {
    subject: 'Your Tlaloc confirmation code',
    preheader: 'Confirm your Tlaloc account',
    codeLabel: 'Confirmation code',
    body: `<p style="margin:0;"><strong>Confirm your account.</strong> Use this code to confirm your Tlaloc account. It expires in ${CODE_TTL_HOURS} hours.</p>`,
    note: `If you didn't create this account, you can ignore this email.`,
  },
  es: {
    subject: 'Tu código de confirmación de Tlaloc',
    preheader: 'Confirma tu cuenta de Tlaloc',
    codeLabel: 'Código de confirmación',
    body: `<p style="margin:0;"><strong>Confirma tu cuenta.</strong> Usa este código para confirmar tu cuenta de Tlaloc. Expira en ${CODE_TTL_HOURS} horas.</p>`,
    note: 'Si no creaste esta cuenta, puedes ignorar este correo.',
  },
};

export function confirmationEmail(code: string, lang: Lang = 'en'): { subject: string; body: string } {
  const c = confirmCopy[lang];
  return {
    subject: c.subject,
    body: shell({ lang, preheader: c.preheader, code, codeLabel: c.codeLabel, blocks: c.body, footerNote: c.note }),
  };
}

const resetCopy: Record<Lang, { subject: string; preheader: string; codeLabel: string; body: string; note: string }> = {
  en: {
    subject: 'Your Tlaloc password reset code',
    preheader: 'Reset your Tlaloc password',
    codeLabel: 'Reset code',
    body: `<p style="margin:0;"><strong>Reset your password.</strong> Use this code to reset your Tlaloc password. It expires in ${CODE_TTL_HOURS} hours.</p>`,
    note: `If you didn't request this, you can ignore this email.`,
  },
  es: {
    subject: 'Tu código para restablecer la contraseña de Tlaloc',
    preheader: 'Restablece tu contraseña de Tlaloc',
    codeLabel: 'Código para restablecer',
    body: `<p style="margin:0;"><strong>Restablece tu contraseña.</strong> Usa este código para restablecer tu contraseña de Tlaloc. Expira en ${CODE_TTL_HOURS} horas.</p>`,
    note: 'Si no solicitaste esto, puedes ignorar este correo.',
  },
};

export function passwordResetEmail(code: string, lang: Lang = 'en'): { subject: string; body: string } {
  const c = resetCopy[lang];
  return {
    subject: c.subject,
    body: shell({ lang, preheader: c.preheader, code, codeLabel: c.codeLabel, blocks: c.body, footerNote: c.note }),
  };
}

const welcomeCopy: Record<Lang, { subject: string; preheader: string; blocks: string; cta: string }> = {
  en: {
    subject: 'Welcome to Tlaloc!',
    preheader: 'Turning NASA Earth science into local food resilience',
    cta: 'Explore Tlaloc',
    blocks: `
      <h2 style="margin:0 0 10px;font-size:20px;color:${COLORS.noche};">Welcome to Tlaloc!</h2>
      <p style="margin:0 0 12px;">Tlaloc is an agricultural decision-support app for smallholder farmers in El Salvador. It combines NASA climate data (NASA POWER), weather forecasts and farmers' own field records to answer one key question: <strong>which crop is better suited to my land and the conditions ahead?</strong></p>
      <p style="margin:0;">Its initial focus is maize, beans, sorghum and sugar cane. Tlaloc turns the historical archive into dry, typical and wet scenarios so you can compare crop suitability, and connects that context to your parcel boundaries, cultivation history, water availability and your planting, irrigation, fertilization and harvest records. Our impact is local: more informed decisions and stronger food resilience (SDG 2: Zero Hunger).</p>`,
  },
  es: {
    subject: '¡Bienvenido a Tlaloc!',
    preheader: 'Convertimos la ciencia de la Tierra de la NASA en resiliencia alimentaria local',
    cta: 'Explora Tlaloc',
    blocks: `
      <h2 style="margin:0 0 10px;font-size:20px;color:${COLORS.noche};">¡Bienvenido a Tlaloc!</h2>
      <p style="margin:0 0 12px;">Tlaloc es una aplicación de apoyo a la decisión agrícola para pequeños productores de El Salvador. Combina datos climáticos de la NASA (NASA POWER), pronósticos del tiempo y los registros del propio agricultor para responder una pregunta clave: <strong>¿qué cultivo se adapta mejor a mi terreno y a las condiciones que vienen?</strong></p>
      <p style="margin:0;">Su enfoque inicial son maíz, frijol, sorgo y caña de azúcar. Tlaloc traduce el archivo histórico en escenarios seco, típico y húmedo para comparar la aptitud de cada cultivo, y conecta ese contexto con los límites de tu parcela, tu historial de cultivo, la disponibilidad de agua y tus registros de siembra, riego, fertilización y cosecha. Nuestro impacto es local: decisiones más informadas y mayor resiliencia alimentaria (ODS 2: Hambre Cero).</p>`,
  },
};

export function welcomeEmail(_email: string, lang: Lang = 'en'): { subject: string; body: string } {
  const c = welcomeCopy[lang];
  return {
    subject: c.subject,
    body: shell({ lang, preheader: c.preheader, blocks: c.blocks, cta: { url: SITE_URL, label: c.cta } }),
  };
}
