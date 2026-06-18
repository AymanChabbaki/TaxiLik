const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.smtp.host || !env.smtp.user) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env'
    );
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure, // true for 465, false for 587/STARTTLS
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });

  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  return t.sendMail({ from: env.smtp.from, to, subject, html, text });
}

async function verifyConnection() {
  return getTransporter().verify();
}

function otpEmailTemplate(code, ttlMinutes) {
  const text = `Votre code de vérification TaxiLik.ma est : ${code}\nCe code expire dans ${ttlMinutes} minutes.`;
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1F2937">
    <h1 style="color:#1F2937;font-size:24px;margin:0 0 4px">TaxiLik<span style="color:#DA291C">.ma</span></h1>
    <p style="color:#5C403B;margin:0 0 24px">Transport Urbain Régulé</p>
    <p style="font-size:16px">Votre code de vérification est :</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#DA291C;background:#FFF5F3;border:1px solid #FFDAD4;border-radius:8px;padding:16px;text-align:center;margin:16px 0">${code}</div>
    <p style="color:#5C403B;font-size:14px">Ce code expire dans ${ttlMinutes} minutes. Ne le partagez avec personne.</p>
  </div>`;
  return { text, html };
}

function resetPasswordEmailTemplate(code, ttlMinutes) {
  const text = `Votre code de réinitialisation de mot de passe TaxiLik.ma est : ${code}\nCe code expire dans ${ttlMinutes} minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.`;
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1F2937">
    <h1 style="color:#1F2937;font-size:24px;margin:0 0 4px">TaxiLik<span style="color:#DA291C">.ma</span></h1>
    <p style="color:#5C403B;margin:0 0 24px">Transport Urbain Régulé</p>
    <p style="font-size:16px">Votre code de réinitialisation de mot de passe :</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#DA291C;background:#FFF5F3;border:1px solid #FFDAD4;border-radius:8px;padding:16px;text-align:center;margin:16px 0">${code}</div>
    <p style="color:#5C403B;font-size:14px">Ce code expire dans ${ttlMinutes} minutes. Ne le partagez avec personne.</p>
    <p style="color:#9CA3AF;font-size:12px">Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.</p>
  </div>`;
  return { text, html };
}

module.exports = { sendMail, verifyConnection, otpEmailTemplate, resetPasswordEmailTemplate };
