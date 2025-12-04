from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.celery import celery_app

app = FastAPI(
    title="Email Service",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

class EmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    template_name: str
    context: dict = {}

class EmailResponse(BaseModel):
    message: str
    task_id: str

@app.post("/send-email", response_model=EmailResponse)
async def send_email(email_request: EmailRequest):
    """Отправить email через Celery task"""
    try:
        # Отправляем задачу в очередь Celery
        task = celery_app.send_task(
            'app.tasks.send_template_email',
            args=[
                email_request.to_email,
                email_request.subject,
                email_request.template_name,
                email_request.context
            ],
            queue='emails'
        )
        
        return EmailResponse(
            message="Email queued for sending",
            task_id=task.id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue email: {str(e)}")

@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {"status": "healthy"}

@app.get("/")
async def root():
    """Корневой endpoint"""
    return {"message": "Email Service API", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)