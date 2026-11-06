import nodemailer from "nodemailer";

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!emailUser || !emailPass) {
  throw new Error("EMAIL_USER or EMAIL_PASS is missing in .env");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

export const sendPasswordResetOTP = async (
  email: string,
  otp: string
) => {
  await transporter.sendMail({
    from: `"CREDENCE" <${emailUser}>`,
    to: email,
    subject: "CREDENCE - Password Reset OTP",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:30px;color:#1f2937">
        <h2 style="color:#047857">CREDENCE</h2>
        <h3>Password Reset Request</h3>
        <p>We received a request to reset your CREDENCE account password.</p>
        <div style="background:#ecfdf5;padding:22px;text-align:center;border-radius:12px">
          <h1 style="letter-spacing:10px;color:#047857">${otp}</h1>
          <p style="margin:0;color:#64748b">Your OTP expires in 5 minutes.</p>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#94a3b8;font-size:12px">CREDENCE Account Security</p>
      </div>
    `,
  });
};