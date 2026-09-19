export interface NominationEmailData {
  fullName: string;
  referenceId: string;
  positionApplied: string;
  region?: string | null;
  submittedAt?: string;
}

export function renderNominationEmail(data: NominationEmailData): { subject: string; html: string; text: string } {
  const subject = `Youth Republic Leadership — Interim Leadership Nomination Received [${data.referenceId}]`;

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
    .notice { background-color: #fefce8; border: 1px solid #fef08a; padding: 14px; border-radius: 4px; font-size: 12px; color: #854d0e; margin: 24px 0; }
    .steps { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .steps h3 { margin-top: 0; font-size: 14px; color: #0B1F3A; }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Youth Republic Leadership</h1>
      <p>Interim Governance Secretariat • Ghana</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${data.fullName},</div>
      <p>Thank you for stepping forward to serve the youth and nation of Ghana. Your interim leadership nomination has been securely recorded in our foundational governance registry.</p>
      
      <div class="ref-box">
        <div class="ref-label">Official Nomination Reference Number</div>
        <div class="ref-val">${data.referenceId}</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Candidate Name:</td>
          <td class="value">${data.fullName}</td>
        </tr>
        <tr>
          <td class="label">Position Applied:</td>
          <td class="value">${data.positionApplied}</td>
        </tr>
        ${data.region ? `<tr><td class="label">Region:</td><td class="value">${data.region} Region</td></tr>` : ''}
      </table>

      <div class="notice">
        <strong>Important Civic Distinction:</strong> YRL is an independent, non-partisan civic organisation. Nominations are 100% free. Interim ministerial and executive portfolios are voluntary civil society roles focused on grassroots mobilization and do NOT constitute government appointments in the Republic of Ghana.
      </div>

      <div class="steps">
        <h3>What Happens Next?</h3>
        <ol style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 8px;"><strong>Civic Screening:</strong> The founding committee verifies candidate eligibility, age (18–40), and portfolio vision.</li>
          <li style="margin-bottom: 8px;"><strong>Virtual Conversation:</strong> Shortlisted candidates are invited to an interim leadership interview session.</li>
          <li><strong>Interim Commission:</strong> Appointees receive formal startup briefings and onboarding materials.</li>
        </ol>
      </div>

      <p style="font-size: 13px; color: #475569;">Please retain this email and your reference number for all future communications with the interim secretariat.</p>
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
Interim Governance Secretariat • Ghana
========================================

Dear ${data.fullName},

Thank you for stepping forward to serve the youth and nation of Ghana. Your interim leadership nomination has been securely recorded in our foundational governance registry.

OFFICIAL NOMINATION REFERENCE NUMBER:
${data.referenceId}

Nomination Details:
- Candidate Name: ${data.fullName}
- Position Applied: ${data.positionApplied}
${data.region ? `- Region: ${data.region} Region` : ''}

Important Civic Distinction:
YRL is an independent, non-partisan civic organisation. Nominations are 100% free. Interim ministerial and executive portfolios are voluntary civil society roles focused on grassroots mobilization and do NOT constitute government appointments in the Republic of Ghana.

What Happens Next?
1. Civic Screening: The founding committee verifies candidate eligibility, age (18–40), and portfolio vision.
2. Virtual Conversation: Shortlisted candidates are invited to an interim leadership interview session.
3. Interim Commission: Appointees receive formal startup briefings and onboarding materials.

Please retain this email and your reference number for all future communications with the interim secretariat.

--
Youth Republic Leadership (YRL)
Independent, voluntary & non-partisan organisation • Republic of Ghana
  `.trim();

  return { subject, html, text };
}
