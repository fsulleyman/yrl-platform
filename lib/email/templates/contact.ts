export interface ContactEmailData {
  fullName: string;
  referenceId: string;
  messageSnippet?: string;
  submittedAt?: string;
}

export function renderContactConfirmationEmail(data: ContactEmailData): { subject: string; html: string; text: string } {
  const subject = `Youth Republic Leadership — Inquiries Secretariat [${data.referenceId}]`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .header { background-color: #0B1F3A; color: #ffffff; padding: 24px; text-align: center; border-bottom: 4px solid #C9A227; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 12px; color: #FCD116; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #0B1F3A; }
    .ref-box { background-color: #f1f5f9; border: 1px solid #cbd5e1; border-left: 4px solid #006B3F; padding: 16px; border-radius: 4px; margin: 20px 0; }
    .ref-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
    .ref-val { font-size: 20px; font-family: monospace; font-weight: 700; color: #0B1F3A; margin-top: 4px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    .details-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .details-table td.label { color: #64748b; width: 40%; font-weight: 500; }
    .details-table td.value { color: #0f172a; font-weight: 600; }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Youth Republic Leadership</h1>
      <p>Interim Secretariat • Inquiries</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${data.fullName},</div>
      <p>Thank you for contacting Youth Republic Leadership (YRL). Your inquiry has been received and logged with our secretariat.</p>
      
      <div class="ref-box">
        <div class="ref-label">Inquiry Reference Number</div>
        <div class="ref-val">${data.referenceId}</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">From:</td>
          <td class="value">${data.fullName}</td>
        </tr>
        <tr>
          <td class="label">Reference:</td>
          <td class="value">${data.referenceId}</td>
        </tr>
        <tr>
          <td class="label">Status:</td>
          <td class="value" style="color: #006B3F;">Received</td>
        </tr>
      </table>

      <p>Our communications team reviews incoming messages regularly. If your inquiry requires a direct response, a representative will reach out to you at this email address.</p>
      
      <p style="font-size: 13px; color: #475569;">Please quote your reference number (<strong>${data.referenceId}</strong>) in any follow-up correspondence.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Youth Republic Leadership (YRL). All rights reserved.</p>
      <p>Independent, voluntary & non-partisan organisation • Republic of Ghana</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Youth Republic Leadership (YRL)
Interim Secretariat • Inquiries
========================================

Dear ${data.fullName},

Thank you for contacting Youth Republic Leadership (YRL). Your inquiry has been received and logged with our secretariat.

INQUIRY REFERENCE NUMBER:
${data.referenceId}

Details:
- From: ${data.fullName}
- Reference: ${data.referenceId}
- Status: Received

Our communications team reviews incoming messages regularly. If your inquiry requires a direct response, a representative will reach out to you at this email address.

Please quote your reference number (${data.referenceId}) in any follow-up correspondence.

--
Youth Republic Leadership (YRL)
Independent, voluntary & non-partisan organisation • Republic of Ghana
  `.trim();

  return { subject, html, text };
}
