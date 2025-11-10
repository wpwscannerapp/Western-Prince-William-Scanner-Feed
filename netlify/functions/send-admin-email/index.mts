// netlify/functions/send-admin-email/index.mts
import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import nodemailer from 'nodemailer'; // Assuming nodemailer is available in the Netlify environment

// Environment variables for email configuration
const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!ADMIN_EMAIL || !SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.error("Missing SMTP or ADMIN_EMAIL environment variables for notification.");
    return { statusCode: 500, body: "Configuration error: Email service not configured." };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (jsonError: any) {
    console.error("Failed to parse JSON payload:", jsonError.message);
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON payload." }), headers: { 'Content-Type': 'application/json' } };
  }
  
  const newFeedback = payload.record; // Supabase Webhook payload

  if (!newFeedback || !newFeedback.id) {
    console.warn("Invalid feedback payload received.");
    return { statusCode: 400, body: "Invalid feedback payload." };
  }

  console.log("Received new feedback:", newFeedback.id, newFeedback.subject);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: parseInt(SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const emailContent = `
    New User Feedback Submitted!

    Subject: ${newFeedback.subject || 'No Subject'}
    Message:
    ---
    ${newFeedback.message}
    ---

    User ID: ${newFeedback.user_id || 'Anonymous'}
    Contact Email: ${newFeedback.contact_email || 'N/A'}
    Contact Phone: ${newFeedback.contact_phone || 'N/A'}
    Allow Contact: ${newFeedback.allow_contact ? 'Yes' : 'No'}
    Submitted At: ${newFeedback.created_at}
  `;

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: ADMIN_EMAIL,
      subject: `[WPWSF Feedback] New Submission: ${newFeedback.subject || newFeedback.message.substring(0, 30)}...`,
      text: emailContent,
    });

    console.log(`Admin notification email sent successfully to ${ADMIN_EMAIL}.`);
    return { statusCode: 200, body: JSON.stringify({ message: "Admin email notification sent." }), headers: { 'Content-Type': 'application/json' } };
  } catch (error: any) {
    console.error("Failed to send admin notification email:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: `Email sending failed: ${error.message}` }), headers: { 'Content-Type': 'application/json' } };
  }
};

export { handler };