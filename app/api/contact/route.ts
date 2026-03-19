import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { name, email, company, subject, message, inquiryType } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const subjectLine = subject || `[Vigil Sec] Contact: ${inquiryType || "General"} from ${name}`;

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 500;">${name}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
          ${company ? `<tr><td style="padding: 8px 0; color: #666;">Company</td><td style="padding: 8px 0;">${company}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #666;">Inquiry Type</td><td style="padding: 8px 0;">${inquiryType || "General"}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #f9f9f9; border-radius: 6px;">
          <p style="color: #666; margin: 0 0 8px 0; font-size: 13px;">Message:</p>
          <p style="margin: 0; white-space: pre-wrap;">${message}</p>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">Sent from vigil-sec.net contact form</p>
      </div>
    `;

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Vigil Sec <noreply@vigil-sec.net>",
      to: ["hello@vigil-sec.net"],
      replyTo: email,
      subject: subjectLine,
      html: htmlBody,
    });

    // Send confirmation to the user
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Vigil Sec <noreply@vigil-sec.net>",
      to: [email],
      subject: "We received your message - Vigil Sec",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Thanks for reaching out, ${name}.</h2>
          <p>We received your message and will get back to you at <strong>${email}</strong> within 1-2 business days.</p>
          <p style="color: #666; font-size: 14px;">What you sent:</p>
          <div style="padding: 16px; background: #f9f9f9; border-radius: 6px; color: #555; font-size: 14px; white-space: pre-wrap;">${message}</div>
          <p style="margin-top: 24px;">Vigil Sec<br/><a href="https://vigil-sec.net">vigil-sec.net</a></p>
        </div>
      `,
    });

    logger.info("Contact form submission", { name, email, inquiryType });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Contact form error", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
