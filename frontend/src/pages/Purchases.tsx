import { useQuery } from "@tanstack/react-query";

const toArr = (v: unknown) => Array.isArray(v) ? v : [];

export default function Purchases() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const r = await fetch("/api/orders", { credentials: "include" });
      if ([401,403,404].includes(r.status)) return [];
      if (!r.ok) throw new Error("orders: " + r.status);
      const j = await r.json().catch(() => []);
      return toArr(j);
    },
    retry: 0,
  });

  const orders = toArr(data);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Мои покупки</h1>
      {isLoading ? (
        <div>Загрузка…</div>
      ) : orders.length === 0 ? (
        <div className="text-muted-foreground">Покупок пока нет.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((o: any) => (
            <div key={o.id} className="rounded border p-3">
              Заказ #{o.id}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
