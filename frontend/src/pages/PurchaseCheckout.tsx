
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getMovieById } from "@/api/contentApi";
import {
  createPurchase,
  Purchase,
  PaymentMethod,
  PurchaseCreatePayload,
  getPaymentSettings,
} from "@/api/purchaseApi";

import { Loader2, CreditCard } from "lucide-react";
import { ADMIN_PAYMENT_EMAIL } from "@/config/paymentContacts";
import { cn } from "@/lib/utils";

type PurchaseCheckoutProps = {
  params: { movieId: string };
};

const PHONE_DISCOUNT = 10;

export default function PurchaseCheckout({ params }: PurchaseCheckoutProps) {
  const movieId = Number(params.movieId);
  const { isAuthenticated, loading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  // Получаем настройки оплаты из API
  const paymentSettingsQuery = useQuery({
    queryKey: ["payment", "settings"],
    queryFn: getPaymentSettings,
  });

  const movieQuery = useQuery({
    queryKey: ["content", "movie", movieId],
    queryFn: () => getMovieById(movieId),
    enabled: Number.isFinite(movieId) && movieId > 0,
  });

  const [method, setMethod] = useState<PaymentMethod>("phone_transfer");
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: PurchaseCreatePayload) => createPurchase(payload),
    onSuccess: async () => {
      toast({
        title: "Заявка на покупку отправлена",
        description: "Мы уведомим вас по email после проверки оплаты.",
      });
      await qc.invalidateQueries({ queryKey: ["admin", "purchases", "pending"] });
      await qc.invalidateQueries({ queryKey: ["purchases", "my"] });
      setLocation("/my-movies");
    },
    onError: () => {
      toast({
        title: "Не удалось создать заявку",
        description: "Попробуйте ещё раз или свяжитесь с поддержкой.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast({
        title: "Нужна авторизация",
        description: "Войдите в аккаунт, чтобы оформить покупку.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [isAuthenticated, loading, setLocation, toast]);

  const movie = movieQuery.data;
  const basePrice = movie?.price_rub ?? 0;
  const discount = method === "phone_transfer" ? PHONE_DISCOUNT : 0;
  const payableAmount = useMemo(() => {
    if (!basePrice) return 0;
    const value = (basePrice * (100 - discount)) / 100;
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }, [basePrice, discount]);

  const paymentOptions: Array<{
    value: PaymentMethod;
    title: string;
    description: string;
    badge?: string;
  }> = [
    {
      value: "phone_transfer",
      title: "Перевод на телефон",
      description: `Переведите сумму на номер ${paymentSettingsQuery.data?.phone_payment_number || "+7 (900) 123-45-67"}. После оплаты отправьте чек на ${ADMIN_PAYMENT_EMAIL}.`,
      badge: `-${PHONE_DISCOUNT}%`,
    },
    {
      value: "invoice",
      title: "По реквизитам",
      description: "Мы отправим счёт на вашу почту. Подходит для компаний и ИП.",
    },
  ];

  const selectedOption = paymentOptions.find((option) => option.value === method);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movie) return;
    if (!payableAmount) {
      toast({
        title: "Введите сумму",
        description: "Мы не нашли стоимость фильма. Попробуйте обновить страницу.",
        variant: "destructive",
      });
      return;
    }
    const payload: PurchaseCreatePayload = {
      movie_id: movie.movie_id,
      movie_title: movie.title_local,
      amount: payableAmount,
      currency: "RUB",
      payment_method: method,
      discount_percent: discount || undefined,
      customer_comment: comment || undefined,
    };
    mutation.mutate(payload);
  };

  if (!Number.isFinite(movieId) || movieId <= 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Некорректный идентификатор фильма
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-gradient px-4 py-10 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-[#111216] border-zinc-800">
          <CardHeader>
            <CardTitle>Оформление покупки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {movieQuery.isLoading || paymentSettingsQuery.isLoading ? (
                <div className="text-zinc-400">Загружаем данные о фильме…</div>
              ) : movie ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>Способ оплаты</Label>
                    <RadioGroup
                      value={method}
                      onValueChange={(value) => setMethod(value as PaymentMethod)}
                      className="grid gap-3 md:grid-cols-2"
                    >
                      {paymentOptions.map((option) => (
                        <label
                          key={option.value}
                          htmlFor={`payment-${option.value}`}
                          className={cn(
                            "rounded-lg border bg-cinema-gray/30 p-4 transition-colors cursor-pointer",
                            method === option.value
                              ? "border-cinema-red bg-cinema-gray/50"
                              : "border-gray-700 hover:border-cinema-red/60"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <RadioGroupItem
                              value={option.value}
                              id={`payment-${option.value}`}
                              className="mt-1"
                              aria-label={option.title}
                            />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">{option.title}</span>
                                {option.badge && (
                                  <Badge variant="secondary" className="bg-green-600/80 text-white">
                                    {option.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-zinc-300">{option.description}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {selectedOption && (
                    <div className="rounded-lg border border-gray-700 bg-cinema-gray/40 p-4 text-sm text-zinc-200">
                      {selectedOption.value === "phone_transfer" ? (
                        <>
                          <p>
                            Переведите {payableAmount.toFixed(2)} ₽ на номер {paymentSettingsQuery.data?.phone_payment_number || "+7 (900) 123-45-67"}. После оплаты
                            отправьте чек или скрин перевода на {ADMIN_PAYMENT_EMAIL}.
                          </p>
                          <p className="mt-2 text-xs text-zinc-400">
                            В письме укажите название фильма и номер телефона, с которого был перевод.
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            Мы отправим счёт и реквизиты на электронную почту, указанную в вашем профиле.Оплатить
                            счёт можно с расчётного счёта компании или ИП.
                          </p>
                          <p className="mt-2 whitespace-pre-line text-xs text-zinc-400">{paymentSettingsQuery.data?.invoice_details || "Реквизиты будут отправлены на почту"}</p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Сумма к оплате</Label>
                      <div className="text-2xl font-semibold">
                        {payableAmount ? `${payableAmount.toFixed(2)} ₽` : "—"}
                      </div>
                      {discount > 0 && (
                        <div className="text-sm text-green-500">
                          Скидка {PHONE_DISCOUNT}% за оплату переводом на номер
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comment">Комментарий для администратора</Label>
                      <Textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Напишите дополнительные детали или вопросы по оплате"
                        className="bg-cinema-gray border-gray-700"
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="submit"
                      className="bg-cinema-red hover:bg-red-700"
                      disabled={mutation.isPending || !movie || !payableAmount}
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Отправляем
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Оформить покупку
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setLocation("/")}>
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>Не удалось получить данные фильма. Попробуйте обновить страницу.</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="bg-[#111216] border-zinc-800">
          <CardHeader>
            <CardTitle>Полезная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-300">
            <p>1. После оплаты обязательно отправьте чек или платёжное поручение на {ADMIN_PAYMENT_EMAIL}.</p>
            <p>2. Проверка и подтверждение оплаты занимают до 1 рабочего дня.</p>
            <p>3. Мы уведомим вас по email, как только фильм будет добавлен в раздел «Мои фильмы».</p>
            <p>4. По вопросам оплаты пишите на {ADMIN_PAYMENT_EMAIL} или свяжитесь с менеджером.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
