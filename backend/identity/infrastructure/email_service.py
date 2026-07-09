from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


class EmailService:
  @staticmethod
  def send_verification_email(*, to_email: str, verify_url: str) -> None:
    subject = "אימות כתובת אימייל — Mendeles"
    context = {"verify_url": verify_url, "frontend_url": settings.FRONTEND_URL}
    body = render_to_string("identity/emails/verify_email.txt", context)
    html = render_to_string("identity/emails/verify_email.html", context)
    msg = EmailMultiAlternatives(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email])
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)

  @staticmethod
  def send_password_reset_email(*, to_email: str, reset_url: str) -> None:
    subject = "איפוס סיסמה — Mendeles"
    body = render_to_string(
      "identity/emails/password_reset.txt",
      {"reset_url": reset_url, "frontend_url": settings.FRONTEND_URL},
    )
    send_mail = EmailMultiAlternatives(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email])
    send_mail.send(fail_silently=False)

  @staticmethod
  def send_user_invite_email(*, to_email: str, invite_url: str) -> None:
    subject = "הזמנה ל-Mendeles"
    body = render_to_string(
      "identity/emails/user_invite.txt",
      {"invite_url": invite_url, "frontend_url": settings.FRONTEND_URL},
    )
    send_mail = EmailMultiAlternatives(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email])
    send_mail.send(fail_silently=False)
