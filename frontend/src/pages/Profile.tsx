
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect } from "react";

export default function Profile() {
  const { user, refresh } = useAuth() as any;
  const [companyName, setCompanyName] = useState<string>(user?.name ?? "");
  useEffect(() => { setCompanyName(user?.name ?? ""); }, [user?.name]);
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const inn = useMemo(() => user?.inn ?? "—", [user?.inn]);
  const email = useMemo(() => user?.email ?? "—", [user?.email]);

  const handlePasswordReset = async () => {
    if (!email || email === "—") {
      setErrMsg("Email не найден");
      return;
    }

    try {
      setOkMsg(null); setErrMsg(null);
      const body = new URLSearchParams({ email });
      
      const response = await fetch("/api/auth/request-password-reset", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (response.ok) {
        setOkMsg("Письмо со ссылкой для сброса пароля отправлено на ваш email");
      } else {
        setOkMsg("Если такой email зарегистрирован, мы отправили письмо со ссылкой для восстановления");
      }
    } catch (error) {
      setOkMsg("Если такой email зарегистрирован, мы отправили письмо со ссылкой для восстановления");
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setOkMsg(null); setErrMsg(null);
    try {
      setSaving(true);
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: companyName }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => res.statusText)) || "Не удалось сохранить");
      await refresh();
      setOkMsg("Название компании обновлено");
    } catch (e: any) {
      setErrMsg(e?.message || "Не удалось сохранить");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <ProfileHeader />
      <Card className="bg-[#111216] border-zinc-800">
        <CardHeader><CardTitle>Данные компании</CardTitle></CardHeader>
        <CardContent>
          {okMsg && <div className="mb-4 text-green-400 text-sm">{okMsg}</div>}
          {errMsg && <div className="mb-4 text-red-400 text-sm">{errMsg}</div>}
          <form onSubmit={onSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Название компании</Label>
                <Input allowSpaces type="text" inputMode="text" autoComplete="organization"
                  value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                   />
              </div>
              <div className="space-y-2">
                <Label>ИНН</Label>
                <Input value={inn} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={email} readOnly />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="secondary"
                  onClick={handlePasswordReset}>
                  Сбросить пароль
                </Button>
              </div>
            </div>
            <div>
              <Button type="submit" disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
