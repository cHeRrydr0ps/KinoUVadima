import httpx
import os
from app.core.config import EMAIL_SERVICE_URL

async def send_email_async(to_email: str, subject: str, email_type: str, token: str):
    """Отправляем email через новый email_service"""
    
    # Формируем контекст в зависимости от типа письма
    if email_type == "reset":
        reset_url = os.getenv('RESET_PASSWORD_URL', 'http://localhost/reset-password')
        context = {
            "reset_link": f"{reset_url}?token={token}",
            "user_email": to_email
        }
        template_name = "password_reset"
    else:
        # Если тип неизвестен, используем простой шаблон
        context = {
            "token": token,
            "user_email": to_email
        }
        template_name = email_type

    email_data = {
        "to_email": to_email,
        "subject": subject,
        "template_name": template_name,
        "context": context
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{EMAIL_SERVICE_URL}/send-email", json=email_data, timeout=10.0)
            print(f"📧 Password reset email response: {response.status_code}")
            if response.status_code == 200:
                print("✅ Password reset email sent successfully")
            else:
                print(f"❌ Email service error: {response.text}")
    except Exception as e:
        print(f"❌ Failed to send password reset email: {e}")
