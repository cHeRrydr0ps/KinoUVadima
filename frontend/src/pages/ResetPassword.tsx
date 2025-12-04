import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

// Функция проверки силы пароля (как в AuthModal)
function isStrongPassword(password: string): boolean {
  console.log("🔒 Validating password:", password);
  
  const lengthCheck = password.length >= 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_+=[\]\\\/~`]/.test(password);
  
  console.log("📏 Length check (>=12):", lengthCheck, `(${password.length})`);
  console.log("🔤 Upper case:", hasUpperCase);
  console.log("🔡 Lower case:", hasLowerCase);
  console.log("🔢 Numbers:", hasNumbers);
  console.log("🔣 Special chars:", hasSpecialChar);
  
  const result = lengthCheck && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  console.log("✅ Final result:", result);
  
  return result;
}

export default function ResetPassword() {
  console.log("🔐 ResetPassword.tsx: Component started rendering");
  
  const [location, setLocation] = useLocation();
  
  console.log("🌐 ResetPassword.tsx: Current location:", location);
  console.log("🔗 ResetPassword.tsx: Full URL:", window.location.href);
  console.log("❓ ResetPassword.tsx: Search params:", window.location.search);
  
  // Получаем токен из URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  
  console.log("🎫 ResetPassword.tsx: Token from URL:", token ? `${token.substring(0, 20)}...` : "null");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Отсутствует токен для сброса пароля");
    }
  }, [token]);

  const validatePasswords = () => {
    // Очищаем предыдущие ошибки
    setError("");

    // Проверка пустых полей
    if (!password.trim()) {
      setError("Введите новый пароль");
      return false;
    }

    if (!confirmPassword.trim()) {
      setError("Подтвердите новый пароль");
      return false;
    }

    // Проверка силы пароля
    if (!isStrongPassword(password)) {
      setError("Пароль должен содержать минимум 12 символов, включая заглавную букву, цифру и специальный символ");
      return false;
    }

    // Проверка совпадения паролей
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!validatePasswords()) return;

    setIsLoading(true);

    try {
      const body = new URLSearchParams({
        token,
        new_password: password
      });

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setLocation("/");
        }, 3000);
      } else {
        const data = await response.json();
        setError(data.detail || "Ошибка при сбросе пароля");
      }
    } catch (err) {
      setError("Произошла ошибка. Попробуйте позже.");
    } finally {
      setIsLoading(false);
    }
  };

  // Показываем ошибку если нет токена
  if (!token) {
    return (
      <div className="min-h-screen bg-cinema-gradient flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-cinema-card border-cinema-secondary">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Неверная ссылка для сброса пароля. Попробуйте запросить сброс заново.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button onClick={() => setLocation("/")} variant="outline">
                Вернуться на главную
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Показываем успех
  if (success) {
    return (
      <div className="min-h-screen bg-cinema-gradient flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-cinema-card border-cinema-secondary">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Пароль изменен!</h2>
            <p className="text-cinema-text-secondary mb-4">
              Ваш пароль успешно обновлен. Сейчас вы будете перенаправлены на главную страницу.
            </p>
            <Button onClick={() => setLocation("/")} className="bg-cinema-red hover:bg-cinema-red/90">
              Перейти на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Основная форма
  return (
    <div className="min-h-screen bg-cinema-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-cinema-card border-cinema-secondary">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-white">Новый пароль</CardTitle>
          <CardDescription className="text-center text-cinema-text-secondary">
            Введите новый пароль для вашего аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Новый пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите новый пароль"
                required
                className="bg-cinema-input border-cinema-secondary text-white placeholder:text-cinema-text-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Подтвердите пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите новый пароль"
                required
                className="bg-cinema-input border-cinema-secondary text-white placeholder:text-cinema-text-secondary"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-cinema-red hover:bg-cinema-red/90 text-white" 
              disabled={isLoading}
            >
              {isLoading ? "Сохранение..." : "Установить новый пароль"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button 
              variant="link" 
              onClick={() => setLocation("/")}
              className="text-cinema-text-secondary hover:text-white"
            >
              Вернуться на главную страницу
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}