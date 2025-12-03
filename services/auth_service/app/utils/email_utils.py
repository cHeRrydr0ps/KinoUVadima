import httpx
import os
from datetime import datetime
from app.core.config import ADMIN_EMAIL, SUPPORT_EMAIL, FROM_EMAIL, EMAIL_SERVICE_URL
from app.models.user import User

async def send_admin_notification(user: User):
    """Отправляем уведомление админу о новой регистрации"""
    print(f"📧 Sending admin notification for user: {user.email}")
    
    email_data = {
        "to_email": ADMIN_EMAIL,
        "subject": f"Новая заявка на регистрацию - {user.email}",
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
            print(f"📧 Admin notification response: {response.status_code}")
            if response.status_code == 200:
                print("✅ Admin notification sent successfully")
            else:
                print(f"❌ Email service error: {response.text}")
    except Exception as e:
        print(f"❌ Failed to send admin notification: {e}")

async def send_approval_email(user: User):
    """Отправляем письмо об одобрении"""
    print(f"📧 Sending approval email to: {user.email}")
    
    email_data = {
        "to_email": user.email,
        "subject": "Регистрация подтверждена",
        "template_name": "approval_notification",
        "context": {
            "user_name": user.name,
            "login_url": os.getenv('LOGIN_URL', 'http://localhost')
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{EMAIL_SERVICE_URL}/send-email", json=email_data, timeout=10.0)
            print(f"📧 Approval email response: {response.status_code}")
            if response.status_code == 200:
                print("✅ Approval email sent successfully")
            else:
                print(f"❌ Email service error: {response.text}")
    except Exception as e:
        print(f"❌ Failed to send approval email: {e}")

async def send_rejection_email(user: User, reason: str = "Не указана"):
    """Отправляем письмо об отказе"""
    print(f"📧 Sending rejection email to: {user.email}")
    
    email_data = {
        "to_email": user.email,
        "subject": "Регистрация отклонена",
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
            print(f"📧 Rejection email response: {response.status_code}")
            if response.status_code == 200:
                print("✅ Rejection email sent successfully")
            else:
                print(f"❌ Email service error: {response.text}")
    except Exception as e:
        print(f"❌ Failed to send rejection email: {e}")