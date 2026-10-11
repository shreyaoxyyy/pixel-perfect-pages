import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { EMAIL_TEMPLATES, renderEmail } from "./email-templates";

/** Emails the compiled PDF through SMTP using Nodemailer. */
export const sendPdfEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        to: z.string().email().max(200),
        name: z.string().max(100),
        topic: z.string().min(1).max(300),
        type: z.string().max(60),
        pages: z.string().max(10),
        words: z.number().int().min(0),
        template: z.enum(EMAIL_TEMPLATES),
        pdf: z.string().min(10).max(14_000_000),
        filename: z.string().max(120),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS)
      return { ok: false, error: "Email sending isn't set up yet. Add the SMTP settings first." };
    try {
      const nodemailer = (await import("nodemailer")).default;
      const port = Number(SMTP_PORT) || 465;
      const transport = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
      const { subject, html } = renderEmail(data.template, data);
      await transport.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: data.to,
        subject,
        html,
        attachments: [
          { filename: data.filename.replace(/[^\w.-]/g, "_") || "document.pdf", content: data.pdf, encoding: "base64" },
        ],
      });
      return { ok: true, error: "" };
    } catch (e) {
      console.error("sendPdfEmail failed:", e instanceof Error ? e.message : e);
      return { ok: false, error: "Couldn't send the email. Check the address and try again." };
    }
  });
