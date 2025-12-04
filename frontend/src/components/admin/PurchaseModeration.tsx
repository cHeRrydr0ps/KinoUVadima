import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { listAdminPurchases, updateAdminPurchase } from "@/api/purchaseApi";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { ADMIN_PAYMENT_EMAIL } from "@/config/paymentContacts";

function PaymentProofNotice() {
  return (
    <p className="text-sm text-zinc-400">
      Пожалуйста, попросите клиента отправить чек или платёжное поручение на{" "}
      <a
        href={`mailto:${ADMIN_PAYMENT_EMAIL}`}
        className="text-cinema-red underline"
      >
        {ADMIN_PAYMENT_EMAIL}
      </a>
      .
    </p>
  );
}

type ApproveSubmit = {
  deliveryToken?: string;
  adminComment?: string;
};

interface ApproveDialogProps {
  purchaseId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (args: ApproveSubmit) => void;
  loading: boolean;
}

function ApproveDialog({
  purchaseId,
  open,
  onOpenChange,
  onSubmit,
  loading,
}: ApproveDialogProps) {
  const [token, setToken] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) {
      setToken("");
      setComment("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Подтверждение оплаты №{purchaseId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delivery-token">Токен доступа (необязательно)</Label>
            <Input
              id="delivery-token"
              placeholder="Необязательно"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              allowSpaces
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="approve-comment">Сообщение пользователю</Label>
            <Textarea
              id="approve-comment"
              placeholder="Например, срок доступа или дополнительные условия"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            className="bg-green-600 hover:bg-green-700"
            disabled={loading}
            onClick={() =>
              onSubmit({
                deliveryToken: token.trim() || undefined,
                adminComment: comment.trim() || undefined,
              })
            }
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RejectDialogProps {
  purchaseId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (comment?: string) => void;
  loading: boolean;
}

function RejectDialog({
  purchaseId,
  open,
  onOpenChange,
  onSubmit,
  loading,
}: RejectDialogProps) {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) {
      setComment("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Отклонение заявки №{purchaseId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reject-comment">Комментарий пользователю (необязательно)</Label>
          <Textarea
            id="reject-comment"
            placeholder="Опишите, что нужно исправить"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={() => onSubmit(comment.trim() || undefined)}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Отклонить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PurchaseModeration() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);

  const purchasesQ = useQuery({
    queryKey: ["admin", "purchases", "pending"],
    queryFn: () => listAdminPurchases({ status_filter: "pending", limit: 100 }),
  });

  const approveMutation = useMutation({
    mutationFn: ({
      id,
      deliveryToken,
      adminComment,
    }: {
      id: number;
      deliveryToken?: string;
      adminComment?: string;
    }) =>
      updateAdminPurchase(id, {
        status: "approved",
        delivery_token: deliveryToken,
        admin_comment: adminComment,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "purchases", "pending"] });
      toast({ title: "Оплата подтверждена" });
      setApproveId(null);
    },
    onError: () => {
      toast({ title: "Не удалось подтвердить", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminComment }: { id: number; adminComment?: string }) =>
      updateAdminPurchase(id, {
        status: "rejected",
        admin_comment: adminComment,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "purchases", "pending"] });
      toast({ title: "Заявка отклонена" });
      setRejectId(null);
    },
    onError: () => {
      toast({ title: "Не удалось отклонить", variant: "destructive" });
    },
  });

  const items = purchasesQ.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Подтверждение оплат</h2>
        <Button
          variant="outline"
          onClick={() => purchasesQ.refetch()}
          disabled={purchasesQ.isFetching}
        >
          {purchasesQ.isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Обновить"
          )}
        </Button>
      </div>

      {purchasesQ.isLoading ? (
        <div className="text-zinc-400">Заявки загружаются...</div>
      ) : items.length === 0 ? (
        <div className="text-zinc-500">Нет заявок, ожидающих подтверждения.</div>
      ) : (
        <div className="grid gap-4">
          {items.map((purchase) => {
            const userLabel =
              purchase.user_name ?? purchase.user_email ?? `ID ${purchase.user_id}`;
            const movieLabel = purchase.movie_title ?? `ID ${purchase.movie_id}`;
            return (
              <Card key={purchase.id} className="cinema-card">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <CardTitle className="text.base">
                    #{purchase.id} - {purchase.movie_title ?? "Без названия"}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span>Пользователь: {userLabel}</span>
                    <span>Фильм: {movieLabel}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-sm text-zinc-300">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <span className="text-zinc-500">Сумма:</span>{" "}
                      {Number(purchase.amount).toFixed(2)} {purchase.currency}
                    </div>
                    <div>
                      <span className="text-zinc-500">Способ оплаты:</span>{" "}
                      {purchase.payment_method === "phone_transfer"
                        ? "Перевод на телефон"
                        : "Счёт на оплату"}
                    </div>
                    <div>
                      <span className="text-zinc-500">Дата:</span>{" "}
                      {new Date(purchase.created_at).toLocaleString("ru-RU")}
                    </div>
                    {purchase.discount_percent && (
                      <div>
                        <span className="text-zinc-500">Скидка:</span>{" "}
                        {purchase.discount_percent}%
                      </div>
                    )}
                  </div>

                  {purchase.customer_comment && (
                    <div className="text-zinc-400">
                      <span className="text-zinc-500 block">
                        Комментарий пользователя:
                      </span>
                      {purchase.customer_comment}
                    </div>
                  )}

                  <PaymentProofNotice />

                  <div className="flex flex-wrap gap-3 items-center">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setApproveId(purchase.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Подтвердить оплату
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => setRejectId(purchase.id)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Отклонить
                    </Button>
                  </div>

                  {approveId === purchase.id && (
                    <ApproveDialog
                      purchaseId={purchase.id}
                      open={approveId === purchase.id}
                      onOpenChange={(open) =>
                        setApproveId(open ? purchase.id : null)
                      }
                      loading={approveMutation.isPending}
                      onSubmit={({ deliveryToken, adminComment }) =>
                        approveMutation.mutate({
                          id: purchase.id,
                          deliveryToken,
                          adminComment,
                        })
                      }
                    />
                  )}

                  {rejectId === purchase.id && (
                    <RejectDialog
                      purchaseId={purchase.id}
                      open={rejectId === purchase.id}
                      onOpenChange={(open) =>
                        setRejectId(open ? purchase.id : null)
                      }
                      loading={rejectMutation.isPending}
                      onSubmit={(adminComment) =>
                        rejectMutation.mutate({ id: purchase.id, adminComment })
                      }
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
