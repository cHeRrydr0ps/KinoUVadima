import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, UserPlus, AlertCircle } from "lucide-react";

// Normalize backend error messages
const prettyError = (raw: any) => {
  if (!raw) return "";
  let msg = String(raw);
  // strip leading "Value error" (pydantic v2)
  msg = msg.replace(/^\s*value\s*error\s*[,;:]?\s*/i, "");
  // pattern message -> human
  msg = msg.replace(/String should match pattern '\^\\S\+\$'/i, "Значение не должно содержать пробелы");
  // email EN -> RU
  msg = msg.replace(/value is not a valid email address/i, "Введите корректный email");
  return msg.trim();
};

// --- Whitespace guards for inputs ---
const preventSpaceKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === " ") e.preventDefault();
};
const preventWhitespaceBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
  const any = e as unknown as { data?: string; preventDefault: () => void };
  if (any?.data && /\s/.test(any.data)) any.preventDefault();
};
const stripSpacesOnPaste = (
  e: React.ClipboardEvent<HTMLInputElement>,
  apply: (v: string) => void
) => {
  e.preventDefault();
  const text = e.clipboardData.getData("text") || "";
  apply(text.replace(/\s+/g, ""));
};
// showError is defined within the component now.
/* ------------ helpers (ручная валидация) ------------ */
const isEmailWithTLD = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const isStrongPassword = (v: string) =>
  v.length >= 12 && /[A-ZА-Я]/.test(v) && /[0-9]/.test(v) && /[^A-Za-zА-Яа-я0-9]/.test(v);

type LoginForm = { email: string; password: string; rememberMe?: boolean };
type RegisterForm = { name: string; email: string; password: string; agreeToTerms: boolean };

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { refresh } = useAuth() as any;

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [systemError, setSystemError] = useState<string>("");
  const [suggestRegister, setSuggestRegister] = useState(false);
  const [inlineInfo, setInlineInfo] = useState<string>("");
  // Local error handler: writes into systemError (renders as red Alert)
  const showError = (raw: any) => setSystemError(raw ? prettyError(raw) : "");
  


  // wouter навигация
  const [, setLocation] = useLocation();

  /* формы — валидируем вручную, ошибки обновляются во время ввода */
  const loginForm = useForm<LoginForm>({
    defaultValues: { email: "", password: "", rememberMe: false },
    mode: "onChange",
  });

  const registerForm = useForm<RegisterForm>({
    defaultValues: { name: "", email: "", password: "", agreeToTerms: false },
    mode: "onChange",
  });

  const safeJson = async (res: Response) => {
    const txt = await res.text();
    try {
      return txt ? JSON.parse(txt) : {};
    } catch {
      return { message: txt };
    }
  };

  /* -------------------- LOGIN -------------------- */
  const tryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    showError("");
    setInlineInfo("");
    setSuggestRegister(false);

    const data = loginForm.getValues();

    // ручная проверка
    let firstField: keyof LoginForm | null = null;
    if (!isEmailWithTLD(data.email)) {
      loginForm.setError("email", { type: "manual", message: "Введите корректный email" });
      firstField = firstField ?? "email";
    }
    if (!data.password.trim()) {
      loginForm.setError("password", { type: "manual", message: "Введите пароль" });
      firstField = firstField ?? "password";
    }
    if (firstField) {
      loginForm.setFocus(firstField);
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔍 AuthModal: Login attempt with:", {
        email: data.email,
        remember: data.rememberMe,
        checkbox_checked: data.rememberMe
      });

      const response = await fetch("/api/auth/login", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: data.email, 
          password: data.password,
          remember: data.rememberMe 
        }),
      });

      const result = await safeJson(response);

      if (response.ok) {
        // invalidate and refetch current user
        try {
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        } catch {}
                try { await refresh(); } catch {}
        // закрываем модалку и переходим на главную
        onClose();
        try {
          setLocation("/");
        } catch {}
        return;
      }

      // Ошибки
      if (response.status === 401) {
        showError("Неверный email или пароль");
        setSuggestRegister(true);
      } else if (response.status === 403) {
        showError(
          "Ваша заявка на рассмотрении у администратора. Мы уведомим вас по email о решении."
        );
      } else {
        showError((result as any)?.message || "Ошибка входа");
      }
    } catch {
      showError("Ошибка входа. Попробуйте ещё раз.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------ REGISTER ------------------ */
  const tryRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    showError("");
    setInlineInfo("");

    const v = registerForm.getValues();

    // ручная валидация
    let first: keyof RegisterForm | null = null;

    if (!v.name.trim()) {
      registerForm.setError("name", { type: "manual", message: "Название компании обязательно" });
      first = first ?? "name";
    }
    if (!/^\d{10,12}$/.test((v.inn || "").trim())) {
      registerForm.setError("inn", { type: "manual", message: "Введите корректный ИНН (10–12 цифр)" });
      first = first ?? "inn";
    }

    if (!isEmailWithTLD(v.email)) {
      registerForm.setError("email", { type: "manual", message: "Введите корректный email" });
      first = first ?? "email";
    }

    if (!isStrongPassword(v.password)) {
      const msg =
        "Пароль должен быть не короче 12 символов и содержать заглавную букву, цифру и спецсимвол.";
      registerForm.setError("password", { type: "manual", message: msg });
      first = first ?? "password";
    }

    if (!v.agreeToTerms) {
      registerForm.setError("agreeToTerms", {
        type: "manual",
        message: "Необходимо согласие с условиями",
      });
      first = first ?? "agreeToTerms";
    }

    if (first) {
      registerForm.setFocus(first);
      return;
    }

    setIsLoading(true);
    try {
      // ВАЖНО: на бэк отправляем только нужные поля схемы UserCreate
      const response = await fetch("/api/auth/register", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inn: (v.inn?.trim?.() || v.inn), name: v.name, email: v.email, password: v.password }),
      });

      const result = await safeJson(response);

      if (!response.ok) {
        // email уже есть — показываем ТОЛЬКО в верхнем алерте (не под полем)
        if (
          response.status === 409 ||
          response.status === 400 ||
          (typeof (result as any).message === "string" &&
            /(exist|exists|занят|зарегистр)/i.test((result as any).message))
        ) {
          showError("Такой email уже зарегистрирован — попробуйте войти");
        } else if (response.status === 422 && (result as any)?.detail) {
          const firstMsg =
            Array.isArray((result as any).detail) && (result as any).detail.length
              ? (result as any).detail[0]?.msg
              : null;
          showError(firstMsg || "Некорректные данные. Проверьте поля.");
        } else {
          showError((result as any).message || "Ошибка регистрации");
        }
        return;
      }

      // успех — подсказка про модерацию + переключаем на вход
      setInlineInfo(
        `Заявка отправлена! Администратор получил уведомление о вашей регистрации и рассмотрит её в ближайшее время. Мы уведомим вас о решении по email: ${v.email}`
      );
      setActiveTab("login");
      registerForm.reset({ name: "", email: v.email, password: "", agreeToTerms: false });
    } catch {
      showError("Ошибка регистрации. Попробуйте ещё раз.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- Forgot password (только на входе) ---------- */
  const handleForgotPassword = async () => {
    setInlineInfo("");
    showError("");
    const email = loginForm.getValues("email").trim();
    if (!email) {
      loginForm.setError("email", { type: "manual", message: "Укажите email для восстановления" });
      return;
    }
    if (!isEmailWithTLD(email)) {
      loginForm.setError("email", { type: "manual", message: "Введите корректный email" });
      return;
    }
    try {
      const body = new URLSearchParams({ email });
      await fetch("/api/auth/request-password-reset", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      setInlineInfo(
        "Если такой email зарегистрирован, мы отправили письмо со ссылкой для восстановления."
      );
    } catch {
      setInlineInfo(
        "Если такой email зарегистрирован, мы отправили письмо со ссылкой для восстановления."
      );
    }
  };

  const clearErrors = () => {
    showError("");
    setSuggestRegister(false);
    // inlineInfo оставляем — полезные подсказки
  };

  const switchToRegister = () => {
    setActiveTab("register");
    clearErrors();
  };
  const switchToLogin = () => {
    setActiveTab("login");
    clearErrors();
  };

  /* ------------ live-очистка ошибок при вводе ------------ */
  const loginEmailReg = loginForm.register("email");
  const loginPassReg = loginForm.register("password");

  const registerInnReg = registerForm.register("inn");
  const registerNameReg = registerForm.register("name");
  const registerEmailReg = registerForm.register("email");
  const registerPassReg = registerForm.register("password");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-cinema-dark border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-center text-white text-xl font-bold">
            {activeTab === "login" ? "Вход в систему" : "Регистрация"}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            {activeTab === "login"
              ? "Войдите в свой аккаунт для доступа к полному функционалу платформы"
              : "Создайте новый аккаунт для использования всех возможностей платформы"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {systemError && (
            <Alert className="border-red-600 bg-red-900/20">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                {systemError}
                {suggestRegister && activeTab === "login" && (
                  <div className="mt-2">
                    Нет аккаунта?{" "}
                    <button onClick={switchToRegister} className="underline hover:text-red-200">
                      Зарегистрируйтесь
                    </button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {inlineInfo && (
            <Alert className="border-cinema-secondary bg-cinema-gray/30">
              <AlertDescription className="text-gray-200">{inlineInfo}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2 bg-cinema-gray">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-cinema-red data-[state=active]:text-white"
                data-testid="tab-login"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Вход
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-cinema-red data-[state=active]:text-white"
                data-testid="tab-register"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Регистрация
              </TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login" className="space-y-4 mt-6">
              <form noValidate onSubmit={tryLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    className="bg-cinema-gray border-gray-600 text-white placeholder-gray-400"
                    {...loginEmailReg}
                    onChange={(e) => {
                      loginEmailReg.onChange(e);
                      const val = e.target.value;
                      if (isEmailWithTLD(val)) loginForm.clearErrors("email");
                    }}
                    data-testid="input-login-email"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-red-400 text-sm" data-testid="error-login-email">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-white">
                    Пароль
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Пароль"
                    className="bg-cinema-gray border-gray-600 text-white placeholder-gray-400"
                    {...loginPassReg}
                    onChange={(e) => {
                      loginPassReg.onChange(e);
                      const val = e.target.value;
                      if (val.trim().length > 0) loginForm.clearErrors("password");
                    }}
                    data-testid="input-login-password"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-red-400 text-sm" data-testid="error-login-password">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Controller
                      control={loginForm.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <Checkbox
                          id="remember-me"
                          checked={!!field.value}
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                          data-testid="checkbox-remember-me"
                        />
                      )}
                    />
                    <Label htmlFor="remember-me" className="text-sm text-gray-300 cursor-pointer">
                      Запомнить меня
                    </Label>
                  </div>

                  <button
                    type="button"
                    className="text-sm text-cinema-red hover:underline"
                    onClick={handleForgotPassword}
                  >
                    Забыли пароль?
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-cinema-red hover:bg-red-600 text-white font-medium py-3 h-auto"
                  data-testid="button-submit-login"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  {isLoading ? "Вход..." : "Войти"}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  Нет аккаунта?{" "}
                  <button
                    onClick={switchToRegister}
                    className="text-cinema-red hover:underline"
                    data-testid="link-switch-to-register"
                  >
                    Зарегистрируйтесь
                  </button>
                </p>
              </div>
            </TabsContent>

            {/* REGISTER */}
            <TabsContent value="register" className="space-y-4 mt-6">
              <form noValidate onSubmit={tryRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-inn" className="text-white">
                    ИНН компании
                  </Label>
                  <Input
                    id="register-inn"
                    inputMode="numeric"
                    pattern="\\d{10,12}"
                    maxLength={12}
                    placeholder="7707083893"
                    className="bg-cinema-gray border-gray-600 text-white placeholder-gray-400"
                    {...registerInnReg}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\\D/g, "").slice(0, 12);
                      e.target.value = onlyDigits;
                      registerInnReg.onChange({ target: { value: onlyDigits } } as any);
                      if (/^\\d{10,12}$/.test(onlyDigits)) registerForm.clearErrors("inn");
                    }}
                    onKeyDown={preventSpaceKey}
                    data-testid="input-register-inn"
                  />
                  {registerForm.formState.errors.inn && (
                    <p className="text-red-400 text-sm" data-testid="error-register-inn">
                      {registerForm.formState.errors.inn.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-white">
                    Название компании
                  </Label>
                  <Input
                    id="register-name"
                    allowSpaces
                    type="text"
                    placeholder="ООО Ваша Компания"
                    className="bg-cinema-gray border-gray-600 text-white placeholder-gray-400"
                    {...registerNameReg}
                    onChange={(e) => {
                      registerNameReg.onChange(e);
                      const val = e.target.value;
                      if (val.trim().length > 0) registerForm.clearErrors("name");
                    }}
                    data-testid="input-register-name"
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-red-400 text-sm" data-testid="error-register-name">
                      {registerForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your@email.com"
                    className="bg-cinema-gray border-gray-600 text-white placeholder-gray-400"
                    {...registerEmailReg}
                    onChange={(e) => {
                      registerEmailReg.onChange(e);
                      const val = e.target.value;
                      if (isEmailWithTLD(val)) registerForm.clearErrors("email");
                    }}
                    data-testid="input-register-email"
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-red-400 text-sm" data-testid="error-register-email">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-white">
                    Пароль
                  </Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Минимум 12 символов"
                    className="bg-cinema-gray border-gray-600 text-white placeholder-gray-400"
                    {...registerPassReg}
                    onChange={(e) => {
                      registerPassReg.onChange(e);
                      const val = e.target.value;
                      if (isStrongPassword(val)) registerForm.clearErrors("password");
                    }}
                    data-testid="input-register-password"
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-red-400 text-sm" data-testid="error-register-password">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-start space-x-2">
                  <Controller
                    control={registerForm.control}
                    name="agreeToTerms"
                    render={({ field }) => (
                      <Checkbox
                        id="agree-terms"
                        checked={!!field.value}
                        onCheckedChange={(v) => {
                          field.onChange(Boolean(v));
                          if (v) registerForm.clearErrors("agreeToTerms");
                        }}
                        data-testid="checkbox-agree-terms"
                        className="mt-1"
                      />
                    )}
                  />
                  <Label
                    htmlFor="agree-terms"
                    className="text-sm text-gray-300 cursor-pointer leading-tight"
                  >
                    Я соглашаюсь с{" "}
                    <a href="/terms" className="text-cinema-red hover:underline">
                      условиями использования
                    </a>{" "}
                    и{" "}
                    <a href="/privacy" className="text-cinema-red hover:underline">
                      политикой конфиденциальности
                    </a>
                  </Label>
                </div>
                {registerForm.formState.errors.agreeToTerms && (
                  <p className="text-red-400 text-sm" data-testid="error-agree-terms">
                    {registerForm.formState.errors.agreeToTerms.message}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !registerForm.watch("agreeToTerms")}
                  className="w-full bg-cinema-red hover:bg-red-600 text-white font-medium py-3 h-auto"
                  data-testid="button-submit-register"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  {isLoading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;
