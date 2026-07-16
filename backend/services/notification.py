# """
# Notification service — Brevo email (300/day free) + Microsoft Teams
# Incoming Webhook.

# All methods log a warning and return False gracefully when the required
# env vars are not configured, so the app runs without notification
# credentials during local development.
# """
# import logging
# from typing import Optional

# import requests

# from config import settings

# logger = logging.getLogger(__name__)


# def _is_placeholder(value: str) -> bool:
#     """Return True for obvious example or copied placeholder config values."""
#     normalized = (value or "").strip().lower()
#     if not normalized:
#         return True

#     placeholder_fragments = (
#         "your-domain.com",
#         "your-company.com",
#         "yourorg.",
#         "example.com",
#         "webhookb2/...",
#         "copied!",
#         "xkeysib-your-brevo",   # example placeholder, not real keys
#         "brevo-api-key",
#         "noreply@your-domain.com",
#     )
#     return any(fragment in normalized for fragment in placeholder_fragments)


# # ── Email via Brevo ───────────────────────────────────────────────────────────

# def send_email(to_email: str, subject: str, html_content: str) -> bool:
#     """
#     Email notification stub — logs intent only.
#     TODO: configure Brevo (or SMTP) credentials in .env to enable live sending.
#     """
#     if not to_email:
#         logger.warning("[EMAIL STUB] No recipient address — skipped: %s", subject)
#         return False

#     logger.info(
#         "[EMAIL STUB] Would send email → to=%s | subject=%s | from=%s "
#         "| (configure BREVO_API_KEY + BREVO_FROM_EMAIL to send for real)",
#         to_email,
#         subject,
#         settings.brevo_from_email or "not configured",
#     )
#     return True


# # ── Teams via Incoming Webhook ────────────────────────────────────────────────

# def send_teams_message(title: str, text: str, color: str = "0076D7") -> bool:
#     """
#     Post a MessageCard to Microsoft Teams via an Incoming Webhook URL.
#     Works with both the legacy Office 365 connector and the new Power
#     Automate / Workflows connector.
#     Requires TEAMS_WEBHOOK_URL in environment.
#     Returns True on success.
#     """
#     if not settings.teams_webhook_url:
#         logger.warning("TEAMS_WEBHOOK_URL not set — Teams message skipped: %s", title)
#         return False
#     if _is_placeholder(settings.teams_webhook_url):
#         logger.warning(
#             "TEAMS_WEBHOOK_URL looks like a placeholder example value — Teams message skipped: %s",
#             title,
#         )
#         return False

#     payload = {
#         "@type": "MessageCard",
#         "@context": "http://schema.org/extensions",
#         "themeColor": color,
#         "summary": title,
#         "sections": [
#             {
#                 "activityTitle": f"**{title}**",
#                 "activityText": text,
#             }
#         ],
#     }

#     try:
#         resp = requests.post(
#             settings.teams_webhook_url,
#             json=payload,
#             timeout=10,
#             headers={"Content-Type": "application/json"},
#         )
#         resp.raise_for_status()
#         logger.info("Teams message sent: %s", title)
#         return True
#     except requests.exceptions.RequestException as exc:
#         logger.error(
#             "Teams message failed: %s. Check that TEAMS_WEBHOOK_URL is the full Incoming Webhook URL from the target channel.",
#             exc,
#         )
#         return False


# # ── Shared email layout ───────────────────────────────────────────────────────

# def _email_layout(
#     header_color: str,
#     badge_text: str,
#     badge_color: str,
#     title: str,
#     body_rows: list[str],
#     cta_text: str,
#     cta_color: str,
#     app_url: str = "",
# ) -> str:
#     """
#     Renders a responsive, inbox-safe HTML email.
#     All CSS is inlined (required by most email clients).
#     """
#     body_html = "".join(
#         f'<p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#374151;">{row}</p>'
#         for row in body_rows
#     )
#     cta_block = ""
#     if app_url:
#         cta_block = f"""
#         <tr>
#           <td style="padding:24px 0 8px 0;text-align:center;">
#             <a href="{app_url}"
#                style="display:inline-block;padding:12px 28px;background:{cta_color};
#                       color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;
#                       border-radius:6px;letter-spacing:0.3px;">
#               {cta_text}
#             </a>
#           </td>
#         </tr>"""

#     return f"""<!DOCTYPE html>
# <html lang="en">
# <head>
#   <meta charset="UTF-8"/>
#   <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
#   <title>{title}</title>
# </head>
# <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
#   <table width="100%" cellpadding="0" cellspacing="0" border="0"
#          style="background:#f3f4f6;padding:32px 16px;">
#     <tr>
#       <td align="center">
#         <table width="600" cellpadding="0" cellspacing="0" border="0"
#                style="max-width:600px;width:100%;background:#ffffff;
#                       border-radius:10px;overflow:hidden;
#                       box-shadow:0 2px 8px rgba(0,0,0,0.08);">

#           <!-- Header bar -->
#           <tr>
#             <td style="background:{header_color};padding:20px 32px;">
#               <table width="100%" cellpadding="0" cellspacing="0" border="0">
#                 <tr>
#                   <td>
#                     <span style="font-size:20px;font-weight:700;color:#ffffff;
#                                  letter-spacing:0.5px;">UAT Tool</span>
#                   </td>
#                   <td align="right">
#                     <span style="display:inline-block;padding:4px 12px;
#                                  background:{badge_color};border-radius:20px;
#                                  font-size:12px;font-weight:600;color:#ffffff;
#                                  letter-spacing:0.3px;">
#                       {badge_text}
#                     </span>
#                   </td>
#                 </tr>
#               </table>
#             </td>
#           </tr>

#           <!-- Body -->
#           <tr>
#             <td style="padding:32px 32px 8px 32px;">
#               <h2 style="margin:0 0 20px 0;font-size:20px;font-weight:700;
#                          color:#111827;line-height:1.3;">{title}</h2>
#               {body_html}
#             </td>
#           </tr>

#           <!-- CTA -->
#           {cta_block}

#           <!-- Divider -->
#           <tr>
#             <td style="padding:24px 32px 0 32px;">
#               <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/>
#             </td>
#           </tr>

#           <!-- Footer -->
#           <tr>
#             <td style="padding:16px 32px 28px 32px;text-align:center;">
#               <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
#                 This is an automated message from the UAT Data Comparison Tool.<br/>
#                 Please do not reply to this email.
#               </p>
#             </td>
#           </tr>

#         </table>
#       </td>
#     </tr>
#   </table>
# </body>
# </html>"""


# # ── High-level notification helpers ──────────────────────────────────────────

# def notify_uat_ready(file_name: str, department: str) -> None:
#     """Notify business user that a file is ready for UAT."""
#     subject = f"[UAT Tool] {file_name} is ready for UAT review"
#     html = _email_layout(
#         header_color="#2563eb",
#         badge_text="Action Required",
#         badge_color="#1d4ed8",
#         title=f"{file_name} is ready for UAT review",
#         body_rows=[
#             "Hello,",
#             f"The developer has uploaded <strong>{file_name}</strong> "
#             f"<span style='background:#eff6ff;color:#1d4ed8;padding:2px 8px;"
#             f"border-radius:4px;font-size:13px;font-weight:600;'>{department}</span> "
#             "and marked it <strong>ready for UAT</strong>.",
#             "Please follow the steps below:",
#             "<ol style='margin:4px 0 12px 0;padding-left:20px;color:#374151;"
#             "font-size:15px;line-height:1.8;'>"
#             "<li>Log in to the UAT Tool</li>"
#             "<li>Open the file and click <strong>View SQL</strong></li>"
#             "<li>Run that SQL in your SAS environment</li>"
#             "<li>Upload the SAS output and click <strong>Run Validation</strong></li>"
#             "<li>Review deviations and <strong>Approve</strong> or <strong>Report Issue</strong></li>"
#             "</ol>",
#         ],
#         cta_text="Open UAT Tool →",
#         cta_color="#2563eb",
#         app_url=settings.app_url,
#     )
#     teams_text = (
#         f"**{file_name}** ({department}) has been uploaded by the developer "
#         "and is now **ready for UAT review**. Please log in, copy the SQL, "
#         "run it in SAS, upload the output, and run validation."
#     )
#     send_email(settings.business_user_email, subject, html)
#     send_teams_message("UAT Ready — Action Required", teams_text, color="0076D7")


# def notify_issue_reported(file_name: str, department: str, comment: Optional[str]) -> None:
#     """Notify developer that a business user reported an issue."""
#     subject = f"[UAT Tool] Issue reported on {file_name}"
#     comment_row = (
#         f"<strong>Business user comment:</strong><br/>"
#         f"<span style='display:block;margin-top:6px;padding:12px 14px;"
#         f"background:#fef2f2;border-left:3px solid #ef4444;"
#         f"border-radius:4px;color:#991b1b;font-style:italic;'>{comment}</span>"
#         if comment
#         else None
#     )
#     body_rows = [
#         "Hello,",
#         f"The business user has reported an <strong>issue</strong> on "
#         f"<strong>{file_name}</strong> "
#         f"<span style='background:#fff7ed;color:#c2410c;padding:2px 8px;"
#         f"border-radius:4px;font-size:13px;font-weight:600;'>{department}</span>.",
#         *(([comment_row]) if comment_row else []),
#         "Please review the deviation details in the UAT Tool, fix the PySpark "
#         "output, and re-upload so UAT can continue.",
#     ]
#     html = _email_layout(
#         header_color="#dc2626",
#         badge_text="Issue Reported",
#         badge_color="#b91c1c",
#         title=f"Issue reported on {file_name}",
#         body_rows=body_rows,
#         cta_text="Review Issue in UAT Tool →",
#         cta_color="#dc2626",
#         app_url=settings.app_url,
#     )
#     teams_text = (
#         f"An issue has been reported on **{file_name}** ({department}). "
#         + (f"Comment: _{comment}_. " if comment else "")
#         + "Please review the deviations and re-upload the PySpark output."
#     )
#     send_email(settings.developer_email, subject, html)
#     send_teams_message("Issue Reported — Developer Action Required", teams_text, color="D83B01")


# def notify_uat_approved(file_name: str, department: str) -> None:
#     """Notify developer that UAT was approved."""
#     subject = f"[UAT Tool] UAT Approved — {file_name}"
#     html = _email_layout(
#         header_color="#16a34a",
#         badge_text="UAT Approved ✓",
#         badge_color="#15803d",
#         title=f"UAT approved for {file_name}",
#         body_rows=[
#             "Hello,",
#             f"The business user has <strong>approved UAT</strong> for "
#             f"<strong>{file_name}</strong> "
#             f"<span style='background:#f0fdf4;color:#15803d;padding:2px 8px;"
#             f"border-radius:4px;font-size:13px;font-weight:600;'>{department}</span>. "
#             "Great work!",
#             "You can now take one of the following actions in the UAT Tool:",
#             "<ul style='margin:4px 0 12px 0;padding-left:20px;color:#374151;"
#             "font-size:15px;line-height:1.8;'>"
#             "<li><strong>Move to Production</strong> — removes the file from the UAT list</li>"
#             "<li><strong>Delete</strong> — discards the record entirely</li>"
#             "</ul>",
#         ],
#         cta_text="Open UAT Tool →",
#         cta_color="#16a34a",
#         app_url=settings.app_url,
#     )
#     teams_text = (
#         f"UAT has been **approved ✓** for **{file_name}** ({department}). "
#         "The developer can now move this to production or discard the record."
#     )
#     send_email(settings.developer_email, subject, html)
#     send_teams_message("UAT Approved ✓", teams_text, color="107C10")



"""
Notification service — Brevo email (300/day free) + Microsoft Teams
Incoming Webhook.

All methods log a warning and return False gracefully when the required
env vars are not configured, so the app runs without notification
credentials during local development.
"""
import logging
from typing import Optional

import requests

from config import settings

logger = logging.getLogger(__name__)


def _is_placeholder(value: str) -> bool:
    """Return True for obvious example or copied placeholder config values."""
    normalized = (value or "").strip().lower()
    if not normalized:
        return True

    placeholder_fragments = (
        "your-domain.com",
        "your-company.com",
        "yourorg.",
        "example.com",
        "webhookb2/...",
        "copied!",
        "xkeysib-your-brevo",
        "brevo-api-key",
        "noreply@your-domain.com",
    )
    return any(fragment in normalized for fragment in placeholder_fragments)


# ── Email via Brevo ───────────────────────────────────────────────────────────

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an email via Brevo transactional API.
    Requires BREVO_API_KEY and BREVO_FROM_EMAIL in .env
    """
    if not to_email:
        logger.warning("[EMAIL] No recipient address — skipped: %s", subject)
        return False

    api_key = settings.brevo_api_key
    from_email = settings.brevo_from_email
    from_name = getattr(settings, "brevo_from_name", "UAT Tool")

    if not api_key or _is_placeholder(api_key):
        logger.warning("[EMAIL] BREVO_API_KEY not configured — skipped: %s", subject)
        return False

    if not from_email:
        logger.warning("[EMAIL] BREVO_FROM_EMAIL not configured — skipped: %s", subject)
        return False

    payload = {
        "sender": {"email": from_email, "name": from_name},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }

    try:
        resp = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={
                "api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=10,
        )
        resp.raise_for_status()
        logger.info("[EMAIL] Sent successfully → to=%s | subject=%s", to_email, subject)
        return True
    except requests.exceptions.HTTPError as exc:
        logger.error("[EMAIL] HTTP error: %s | response: %s", exc, exc.response.text if exc.response else "")
        return False
    except requests.exceptions.RequestException as exc:
        logger.error("[EMAIL] Request failed: %s", exc)
        return False


# ── Teams via Incoming Webhook ────────────────────────────────────────────────

def send_teams_message(title: str, text: str, color: str = "0076D7") -> bool:
    """
    Post a MessageCard to Microsoft Teams via an Incoming Webhook URL.
    Requires TEAMS_WEBHOOK_URL in .env
    Returns True on success.
    """
    webhook_url = (settings.teams_webhook_url or "").strip()

    if not webhook_url:
        logger.warning("[TEAMS] TEAMS_WEBHOOK_URL not set — skipped: %s", title)
        return False

    if _is_placeholder(webhook_url):
        logger.warning("[TEAMS] TEAMS_WEBHOOK_URL is a placeholder — skipped: %s", title)
        return False

    payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": color,
        "summary": title,
        "sections": [
            {
                "activityTitle": f"**{title}**",
                "activityText": text,
            }
        ],
    }

    try:
        resp = requests.post(
            webhook_url,
            json=payload,
            timeout=10,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        logger.info("[TEAMS] Message sent: %s", title)
        return True
    except requests.exceptions.RequestException as exc:
        logger.error(
            "[TEAMS] Message failed: %s. Check TEAMS_WEBHOOK_URL is the full Incoming Webhook URL.",
            exc,
        )
        return False


# ── Shared email layout ───────────────────────────────────────────────────────

def _email_layout(
    header_color: str,
    badge_text: str,
    badge_color: str,
    title: str,
    body_rows: list[str],
    cta_text: str,
    cta_color: str,
    app_url: str = "",
) -> str:
    """
    Renders a responsive, inbox-safe HTML email.
    All CSS is inlined (required by most email clients).
    """
    body_html = "".join(
        f'<p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#374151;">{row}</p>'
        for row in body_rows
    )
    cta_block = ""
    if app_url:
        cta_block = f"""
        <tr>
          <td style="padding:24px 0 8px 0;text-align:center;">
            <a href="{app_url}"
               style="display:inline-block;padding:12px 28px;background:{cta_color};
                      color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;
                      border-radius:6px;letter-spacing:0.3px;">
              {cta_text}
            </a>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#ffffff;
                      border-radius:10px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header bar -->
          <tr>
            <td style="background:{header_color};padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:700;color:#ffffff;
                                 letter-spacing:0.5px;">UAT Tool</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 12px;
                                 background:{badge_color};border-radius:20px;
                                 font-size:12px;font-weight:600;color:#ffffff;
                                 letter-spacing:0.3px;">
                      {badge_text}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <h2 style="margin:0 0 20px 0;font-size:20px;font-weight:700;
                         color:#111827;line-height:1.3;">{title}</h2>
              {body_html}
            </td>
          </tr>

          <!-- CTA -->
          {cta_block}

          <!-- Divider -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 28px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                This is an automated message from the UAT Data Comparison Tool.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ── High-level notification helpers ──────────────────────────────────────────

def notify_uat_ready(file_name: str, department: str, developer_email: Optional[str] = None) -> None:
    """Confirm to the developer that their file is now marked ready for UAT.

    business_user_email isn't populated yet at this point (no one has
    uploaded SAS output for this file), so there's no per-file business
    contact to notify here — this is a confirmation back to the developer
    who just marked it ready, not an action-required email to anyone else.
    """
    recipient = developer_email or settings.developer_email
    subject = f"[UAT Tool] {file_name} marked ready for UAT"
    html = _email_layout(
        header_color="#2563eb",
        badge_text="Marked Ready",
        badge_color="#1d4ed8",
        title=f"{file_name} is now awaiting UAT",
        body_rows=[
            "Hello,",
            f"You've marked <strong>{file_name}</strong> "
            f"<span style='background:#eff6ff;color:#1d4ed8;padding:2px 8px;"
            f"border-radius:4px;font-size:13px;font-weight:600;'>{department}</span> "
            "as <strong>ready for UAT</strong>.",
            "It's now waiting on the business user to run validation. "
            "You'll get another email if an issue is reported, or once UAT is approved.",
        ],
        cta_text="View in UAT Tool →",
        cta_color="#2563eb",
        app_url=settings.app_url,
    )
    teams_text = (
        f"**{file_name}** ({department}) has been marked **ready for UAT** "
        "and is now awaiting business user review."
    )
    send_email(recipient, subject, html)
    send_teams_message("UAT Ready — Awaiting Business User", teams_text, color="0076D7")


def notify_issue_reported(
    file_name: str,
    department: str,
    comment: Optional[str],
    developer_email: Optional[str] = None,
) -> None:
    """Notify the file's assigned developer that a business user reported an issue.

    Falls back to the static DEVELOPER_EMAIL config when no developer has
    uploaded GCP output for this file yet (so developer_email is unset).
    """
    subject = f"[UAT Tool] Issue reported on {file_name}"
    comment_row = (
        f"<strong>Business user comment:</strong><br/>"
        f"<span style='display:block;margin-top:6px;padding:12px 14px;"
        f"background:#fef2f2;border-left:3px solid #ef4444;"
        f"border-radius:4px;color:#991b1b;font-style:italic;'>{comment}</span>"
        if comment
        else None
    )
    body_rows = [
        "Hello,",
        f"The business user has reported an <strong>issue</strong> on "
        f"<strong>{file_name}</strong> "
        f"<span style='background:#fff7ed;color:#c2410c;padding:2px 8px;"
        f"border-radius:4px;font-size:13px;font-weight:600;'>{department}</span>.",
        *(([comment_row]) if comment_row else []),
        "Please review the deviation details in the UAT Tool, fix the PySpark "
        "output, and re-upload so UAT can continue.",
    ]
    html = _email_layout(
        header_color="#dc2626",
        badge_text="Issue Reported",
        badge_color="#b91c1c",
        title=f"Issue reported on {file_name}",
        body_rows=body_rows,
        cta_text="Review Issue in UAT Tool →",
        cta_color="#dc2626",
        app_url=settings.app_url,
    )
    teams_text = (
        f"An issue has been reported on **{file_name}** ({department}). "
        + (f"Comment: _{comment}_. " if comment else "")
        + "Please review the deviations and re-upload the PySpark output."
    )
    send_email(developer_email or settings.developer_email, subject, html)
    send_teams_message("Issue Reported — Developer Action Required", teams_text, color="D83B01")


def notify_uat_approved(
    file_name: str,
    department: str,
    completed_at: Optional[str] = None,
    developer_email: Optional[str] = None,
    business_user_email: Optional[str] = None,
) -> None:
    """
    UAT was approved: notify the developer (as before, now with a timestamp)
    and send the business user a completion receipt for their own records.

    developer_email/business_user_email are the per-file assignees (whoever
    uploaded GCP/SAS output for this file); falls back to the static config
    addresses when a file has no assignee yet.
    """
    when_row = f"Completed at <strong>{completed_at}</strong>." if completed_at else None

    dev_subject = f"[UAT Tool] UAT Approved — {file_name}"
    dev_html = _email_layout(
        header_color="#16a34a",
        badge_text="UAT Approved ✓",
        badge_color="#15803d",
        title=f"UAT approved for {file_name}",
        body_rows=[
            "Hello,",
            f"The business user has <strong>approved UAT</strong> for "
            f"<strong>{file_name}</strong> "
            f"<span style='background:#f0fdf4;color:#15803d;padding:2px 8px;"
            f"border-radius:4px;font-size:13px;font-weight:600;'>{department}</span>. "
            "Great work!",
            *([when_row] if when_row else []),
            "You can now take one of the following actions in the UAT Tool:",
            "<ul style='margin:4px 0 12px 0;padding-left:20px;color:#374151;"
            "font-size:15px;line-height:1.8;'>"
            "<li><strong>Move to Production</strong> — removes the file from the UAT list</li>"
            "<li><strong>Delete</strong> — discards the record entirely</li>"
            "</ul>",
        ],
        cta_text="Open UAT Tool →",
        cta_color="#16a34a",
        app_url=settings.app_url,
    )
    teams_text = (
        f"UAT has been **approved ✓** for **{file_name}** ({department})"
        + (f" at {completed_at}" if completed_at else "")
        + ". The developer can now move this to production or discard the record."
    )
    send_email(developer_email or settings.developer_email, dev_subject, dev_html)
    send_teams_message("UAT Approved ✓", teams_text, color="107C10")

    # Confirmation receipt back to the business user who approved it.
    biz_recipient = business_user_email or settings.business_user_email
    if biz_recipient:
        biz_subject = f"[UAT Tool] Your UAT approval for {file_name} is recorded"
        biz_html = _email_layout(
            header_color="#16a34a",
            badge_text="Approval Recorded",
            badge_color="#15803d",
            title=f"Your approval for {file_name} is recorded",
            body_rows=[
                "Hello,",
                f"This confirms your <strong>UAT approval</strong> for "
                f"<strong>{file_name}</strong> "
                f"<span style='background:#f0fdf4;color:#15803d;padding:2px 8px;"
                f"border-radius:4px;font-size:13px;font-weight:600;'>{department}</span> "
                "has been recorded.",
                *([when_row] if when_row else []),
                "No further action is needed from you on this file.",
            ],
            cta_text="Open UAT Tool →",
            cta_color="#16a34a",
            app_url=settings.app_url,
        )
        send_email(biz_recipient, biz_subject, biz_html)