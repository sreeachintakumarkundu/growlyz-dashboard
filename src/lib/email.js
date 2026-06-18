import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"GrowlyZ" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'GrowlyZ — Password Reset OTP',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#FF5500,#FF9200);padding:24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;">⚡ GrowlyZ</h1>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="color:#fff;margin-top:0;">Password Reset Request</h2>
          <p style="color:#94a3b8;">Use the OTP below to reset your password. It expires in <strong style="color:#fff;">10 minutes</strong>.</p>
          <div style="background:#1e293b;border:2px solid #FF5500;border-radius:12px;text-align:center;padding:24px;margin:24px 0;">
            <div style="font-size:42px;font-weight:bold;letter-spacing:12px;color:#FF9200;">${otp}</div>
          </div>
          <p style="color:#64748b;font-size:13px;">If you didn't request this, ignore this email. Your password will not change.</p>
        </div>
      </div>
    `,
  });
}
