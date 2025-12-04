import os
from datetime import datetime
import httpx

from app.core.config import ADMIN_EMAIL, SUPPORT_EMAIL, FROM_EMAIL, EMAIL_SERVICE_URL
from app.models.user import User
from app.utils.telegram import send_telegram_message


async def send_admin_notification(user: User):
    """Уведомить администратора о новой регистрации"""
    email_data = {
        "to_email": ADMIN_EMAIL,
        "subject": f"Новый пользователь ожидает модерации - {user.email}",
        "template_name": "admin_notification",
        "context": {
            "user_email": user.email,
            "user_name": user.name,
            "user_inn": user.inn,
            "admin_panel_url": f"{os.getenv('FRONTEND_BASE_URL', 'http://localhost')}/admin",
            "registration_date": datetime.now().strftime('%d.%m.%Y %H:%M')
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{EMAIL_SERVICE_URL}/send-email", json=email_data, timeout=10.0)
            if response.status_code == 200:
                try:
                    await send_telegram_message(
                        f"🚀 Новая заявка на регистрацию\n"
                        f"Email: {user.email}\n"
                        f"Имя: {user.name or '—'}\n"
                        f"ID: {user.id}"
                    )
                except Exception as tg_exc:
                    print(f"Failed to send telegram notification: {tg_exc}")
            else:
                print(f"Email service error: {response.text}")
    except Exception as e:
        print(f"Failed to send admin notification: {e}")


async def send_approval_email(user: User):
    """Уведомить пользователя об одобрении"""
    email_data = {
        "to_email": user.email,
        "subject": "Ваша регистрация одобрена",
        "template_name": "approval_notification",
        "context": {
            "user_name": user.name,
            "login_url": os.getenv('LOGIN_URL', 'http://localhost')
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{EMAIL_SERVICE_URL}/send-email", json=email_data, timeout=10.0)
            if response.status_code != 200:
                print(f"Email service error: {response.text}")
    except Exception as e:
        print(f"Failed to send approval email: {e}")


async def send_rejection_email(user: User, reason: str = "Заявка отклонена"):
    """Уведомить пользователя об отказе"""
    email_data = {
        "to_email": user.email,
        "subject": "Заявка на регистрацию отклонена",
        "template_name": "rejection_notification",
        "context": {
            "user_name": user.name,
            "reason": reason,
            "support_email": SUPPORT_EMAIL,
            "register_url": os.getenv('REGISTER_URL', 'http://localhost/register')
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{EMAIL_SERVICE_URL}/send-email", json=email_data, timeout=10.0)
            if response.status_code != 200:
                print(f"Email service error: {response.text}")
    except Exception as e:
        print(f"Failed to send rejection email: {e}")
