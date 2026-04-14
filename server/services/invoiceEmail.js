import nodemailer from "nodemailer";
import { getPlanConfig } from "../config/plans.js";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

const createTransporter = () => {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const formatAmount = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount / 100);

export const sendPlanInvoiceEmail = async ({
  email,
  userName,
  plan,
  paymentId,
  orderId,
  amount,
  currency,
  activatedAt,
}) => {
  const transporter = createTransporter();

  if (!transporter || !email) {
    return { sent: false, reason: "SMTP not configured." };
  }

  const planConfig = getPlanConfig(plan);
  const watchLimitText =
    planConfig.watchLimitMinutes === null
      ? "Unlimited video watch time"
      : `${planConfig.watchLimitMinutes} minutes of watch time per video`;

  const invoiceHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 8px;">YourTube Plan Upgrade Invoice</h2>
      <p>Hello ${userName || "User"},</p>
      <p>Your payment was successful and your plan is now active.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Plan</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${planConfig.name}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Amount</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${formatAmount(amount, currency)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Payment ID</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${paymentId}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Order ID</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${orderId}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Activated On</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date(
          activatedAt
        ).toLocaleString("en-IN")}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Viewing Access</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${watchLimitText}</td></tr>
      </table>
      <p>Thank you for upgrading your YourTube experience.</p>
    </div>
  `;

  const invoiceText = [
    "YourTube Plan Upgrade Invoice",
    `Plan: ${planConfig.name}`,
    `Amount: ${formatAmount(amount, currency)}`,
    `Payment ID: ${paymentId}`,
    `Order ID: ${orderId}`,
    `Activated On: ${new Date(activatedAt).toLocaleString("en-IN")}`,
    `Viewing Access: ${watchLimitText}`,
  ].join("\n");

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: email,
    subject: `YourTube ${planConfig.name} Plan Invoice`,
    text: invoiceText,
    html: invoiceHtml,
  });

  return { sent: true };
};
