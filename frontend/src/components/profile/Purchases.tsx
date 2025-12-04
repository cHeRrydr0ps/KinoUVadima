
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMyPurchases, Purchase } from "@/api/purchaseApi";

const STATUS_META: Record<Purchase["status"], { label: string; badge: string }> = {
  approved: { label: "Оплата подтверждена", badge: "bg-green-600" },
  rejected: { label: "Отклонено", badge: "bg-red-600" },
  pending: { label: "Ожидает проверки", badge: "bg-yellow-600 text-black" },
};

const formatAmount = (value: string | number | null | undefined) => {
  if (value == null) return "0.00";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
};

export default function Purchases() {
  const purchasesQ = useQuery({
    queryKey: ["purchases", "my"],
    queryFn: () => listMyPurchases(),
    retry: 0,
  });

  if (purchasesQ.isLoading) {
    return <div className="text-zinc-300">Заявки загружаются...</div>;
  }

  if (purchasesQ.isError) {
    return <div className="text-red-400">Не удалось загрузить заявки. Попробуйте обновить страницу.</div>;
  }

  const purchases = purchasesQ.data ?? [];
  if (purchases.length === 0) {
    return <div className="text-zinc-400">Пока нет заявок на покупку фильмов.</div>;
  }

  return (
    <div className="space-y-4">
      {purchases.map((purchase) => {
        const statusMeta = STATUS_META[purchase.status];
        const createdAt = purchase.created_at
          ? new Date(purchase.created_at).toLocaleString()
          : "—";

        const downloadReady = purchase.status === "approved" && !!purchase.delivery_url;

        return (
          <Card key={purchase.id} className="bg-[#111216] border-zinc-800">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <CardTitle className="text-base">
                #{purchase.id}
                {purchase.movie_title ? ` — ${purchase.movie_title}` : ""}
              </CardTitle>
              <Badge className={statusMeta.badge}>{statusMeta.label}</Badge>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300 space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <span className="text-zinc-500">Сумма:</span> {formatAmount(purchase.amount)} {purchase.currency}
                </div>
                <div>
                  <span className="text-zinc-500">Дата:</span> {createdAt}
                </div>
                {purchase.customer_comment && (
                  <div className="md:col-span-2">
                    <span className="text-zinc-500">Комментарий пользователя:</span> {purchase.customer_comment}
                  </div>
                )}
                {purchase.admin_comment && (
                  <div className="md:col-span-2 text-zinc-400">
                    <span className="text-zinc-500">Комментарий администратора:</span> {purchase.admin_comment}
                  </div>
                )}
              </div>

              {purchase.status === "approved" && (
                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    disabled={!downloadReady}
                    onClick={() => {
                      if (purchase.delivery_url) {
                        window.open(purchase.delivery_url, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    Скачать материалы
                  </Button>
                  {!downloadReady && (
                    <div className="text-xs text-zinc-400">
                      Ссылка станет доступна после генерации материалов.
                    </div>
                  )}
                  {purchase.delivery_token && (
                    <div className="text-xs text-zinc-400 break-all">
                      Токен доступа: {purchase.delivery_token}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
