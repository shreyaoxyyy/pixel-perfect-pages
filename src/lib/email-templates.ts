export const EMAIL_TEMPLATES = ["classic", "modern", "minimal"] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Data = { name: string; topic: string; type: string; pages: string; words: number };

export function renderEmail(template: EmailTemplate, d: Data): { subject: string; html: string } {
  const name = esc(d.name || "there");
  const topic = esc(d.topic);
  const meta = `${esc(d.type)} · ${esc(d.pages)} pages · ${d.words.toLocaleString()} words`;
  const subject = `Your document is ready: ${d.topic}`.slice(0, 150);
  if (template === "modern")
    return {
      subject,
      html: `<div style="background:#ffffff;padding:24px;font-family:Arial,sans-serif">
<table width="100%" style="max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #e7e2d8">
<tr><td style="background:#1f3a34;padding:28px;color:#f5efe3"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8">Scriptorium</div><div style="font-size:24px;font-weight:bold;margin-top:8px">${topic}</div><div style="font-size:13px;margin-top:6px;opacity:.85">${meta}</div></td></tr>
<tr><td style="padding:28px;color:#2b2b2b;font-size:15px;line-height:1.6">Hi ${name},<br><br>Your formatted PDF is attached to this email. Open it, review each section, and replace any placeholder citations marked <b>[verify and replace]</b> with real sources before submitting.<br><br><span style="display:inline-block;background:#c8873a;color:#ffffff;padding:10px 18px;border-radius:999px;font-weight:bold">PDF attached</span></td></tr>
<tr><td style="padding:16px 28px;background:#f7f3ea;color:#777;font-size:12px">Sent because you requested this document from Scriptorium.</td></tr></table></div>`,
    };
  if (template === "minimal")
    return {
      subject,
      html: `<div style="background:#ffffff;padding:32px;font-family:Georgia,serif;color:#222;max-width:520px;margin:0 auto;line-height:1.7">
<p style="font-size:13px;color:#888;margin:0">Scriptorium</p><h1 style="font-size:22px;font-weight:normal;margin:12px 0 4px">${topic}</h1><p style="font-size:13px;color:#888;margin:0 0 24px">${meta}</p>
<p>Hi ${name},</p><p>Your document is attached as a PDF. Good luck with your submission.</p><hr style="border:none;border-top:1px solid #eee;margin:28px 0"><p style="font-size:12px;color:#999">Please verify all references before submitting.</p></div>`,
    };
  return {
    subject,
    html: `<div style="background:#ffffff;padding:24px;font-family:'Times New Roman',serif">
<table width="100%" style="max-width:580px;margin:0 auto;border:2px solid #2b2b2b">
<tr><td style="padding:24px;text-align:center;border-bottom:1px solid #2b2b2b"><div style="font-size:13px;letter-spacing:3px;text-transform:uppercase">Scriptorium · Academic Documents</div></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.7;color:#222">Dear ${name},<br><br>Please find attached your document titled <b>“${topic}”</b>.<br><br><table style="font-size:14px;margin:8px 0 16px"><tr><td style="padding:2px 12px 2px 0;color:#666">Details</td><td>${meta}</td></tr></table>Kindly review the content and verify all references before final submission.<br><br>Regards,<br><i>Scriptorium</i></td></tr></table></div>`,
  };
}
