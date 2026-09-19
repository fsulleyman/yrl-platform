export interface MembershipEmailData {
  fullName: string;
  memberId: string;
  region: string;
  occupation?: string;
  submittedAt?: string;
}

export function renderMembershipEmail(data: MembershipEmailData): { subject: string; html: string; text: string } {
  const subject = `Youth Republic Leadership — Membership Registration Confirmed [${data.memberId}]`;

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
      <p>General Civic Membership Registry • Ghana</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${data.fullName},</div>
      <p>Welcome to Youth Republic Leadership (YRL). Your registration as a general civic member has been successfully recorded in our national membership registry.</p>
      
      <div class="ref-box">
        <div class="ref-label">Authoritative Member ID</div>
        <div class="ref-val">${data.memberId}</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Member Name:</td>
          <td class="value">${data.fullName}</td>
        </tr>
        <tr>
          <td class="label">Member ID:</td>
          <td class="value">${data.memberId}</td>
        </tr>
        <tr>
          <td class="label">Region:</td>
          <td class="value">${data.region} Region</td>
        </tr>
        ${data.occupation ? `<tr><td class="label">Occupation:</td><td class="value">${data.occupation}</td></tr>` : ''}
        <tr>
          <td class="label">Membership Status:</td>
          <td class="value" style="color: #006B3F;">Active</td>
        </tr>
      </table>

      <div class="notice">
        <strong>Non-Partisan Civic Commitment:</strong> YRL is an independent, non-partisan civil society movement dedicated to empowering Ghanaian youth through civic literacy, ethical leadership, and grassroots community service. Membership is entirely voluntary and free.
      </div>

      <div class="steps">
        <h3>What Happens Next?</h3>
        <ol style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 8px;"><strong>Regional Assembly:</strong> You will be connected with local civic convenings and chapter activities in the ${data.region} Region.</li>
          <li style="margin-bottom: 8px;"><strong>Civic Programs:</strong> Receive invitations to youth policy discussions, civic workshops, and community development projects.</li>
          <li><strong>Stay Engaged:</strong> Keep your Member ID handy for participation in general membership votes and consultations.</li>
        </ol>
      </div>

      <p style="font-size: 13px; color: #475569;">Please keep this email and your Member ID for your records.</p>
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
General Civic Membership Registry • Ghana
========================================

Dear ${data.fullName},

Welcome to Youth Republic Leadership (YRL). Your registration as a general civic member has been successfully recorded in our national membership registry.

AUTHORITATIVE MEMBER ID:
${data.memberId}

Membership Details:
- Member Name: ${data.fullName}
- Member ID: ${data.memberId}
- Region: ${data.region} Region
${data.occupation ? `- Occupation: ${data.occupation}` : ''}
- Membership Status: Active

Non-Partisan Civic Commitment:
YRL is an independent, non-partisan civil society movement dedicated to empowering Ghanaian youth through civic literacy, ethical leadership, and grassroots community service. Membership is entirely voluntary and free.

What Happens Next?
1. Regional Assembly: You will be connected with local civic convenings and chapter activities in the ${data.region} Region.
2. Civic Programs: Receive invitations to youth policy discussions, civic workshops, and community development projects.
3. Stay Engaged: Keep your Member ID handy for participation in general membership votes and consultations.

Please keep this email and your Member ID for your records.

--
Youth Republic Leadership (YRL)
Independent, voluntary & non-partisan organisation • Republic of Ghana
  `.trim();

  return { subject, html, text };
}
