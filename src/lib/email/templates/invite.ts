export function buildInviteEmail({
  inviterName,
  orgName,
  orgLogo,
  roleName,
  inviteUrl,
  expiryDays = 7,
}: {
  inviterName: string;
  orgName: string;
  orgLogo?: string | null;
  roleName: string;
  inviteUrl: string;
  expiryDays?: number;
}): string {

  // Only render the logo <img> if it is a publicly reachable http(s):// URL.
  // The route resolves relative paths to absolute URLs before calling this template.
  const isPublicUrl = orgLogo &&
    (orgLogo.startsWith('http://') || orgLogo.startsWith('https://'));

  const orgLogoHtml = isPublicUrl
    ? `<img src="${orgLogo}" alt="${orgName}" style="height:44px;max-width:180px;object-fit:contain;display:block;margin:0 auto 10px;" />`
    : `<div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;margin-bottom:8px;">${orgName}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to ${orgName}</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:18px;overflow:hidden;box-shadow:0 8px 40px rgba(240,59,106,0.15);">

          <!-- ── Header ── -->
          <tr>
            <td style="background:#000000;padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(240,59,106,0.2);">
              <!-- Org logo / name -->
              ${orgLogoHtml}

              <!-- OMNIBetter brand -->
              <div style="margin-top:4px;">
                <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">OMNI</span><span style="font-size:22px;font-weight:800;color:#F03B6A;letter-spacing:-0.5px;">Better</span>
              </div>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="background:#111111;padding:40px 40px 32px;">

              <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
                You've been invited! 🎉
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.7;">
                <strong style="color:#ffffff;">${inviterName}</strong> has invited you to join
                <strong style="color:#ffffff;">${orgName}</strong> as a
                <strong style="color:#F03B6A;">${roleName}</strong>.
              </p>

              <!-- Role badge -->
              <div style="background:rgba(240,59,106,0.06);border:1px solid rgba(240,59,106,0.2);border-radius:12px;padding:16px 20px;margin-bottom:32px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#F03B6A;font-weight:700;margin-bottom:6px;">Your Role</div>
                <div style="font-size:18px;font-weight:700;color:#ffffff;">${roleName}</div>
                <div style="font-size:13px;color:#6b7280;margin-top:3px;">${orgName} workspace</div>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}"
                       style="display:inline-block;background:#F03B6A;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 44px;border-radius:10px;letter-spacing:0.3px;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#4b5563;text-align:center;line-height:1.6;">
                This invitation expires in <strong style="color:#9ca3af;">10 minutes</strong>.<br/>
                If you did not expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#0a0a0a;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.04);">
              <p style="margin:0 0 6px;font-size:12px;color:#4b5563;">
                Having trouble with the button? Copy and paste this link:
              </p>
              <p style="margin:0 0 14px;font-size:11px;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#F03B6A;text-decoration:none;">${inviteUrl}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#374151;">
                © ${new Date().getFullYear()} ${orgName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
