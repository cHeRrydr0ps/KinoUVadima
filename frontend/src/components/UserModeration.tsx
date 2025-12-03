import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingUsers, approveUser, rejectUser, type User } from '../api/adminApi';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Mail, User as UserIcon, Hash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface RejectDialogProps {
  user: User;
  onReject: (reason: string) => void;
  isLoading: boolean;
}

function RejectDialog({ user, onReject, isLoading }: RejectDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onReject(reason || 'Не указана');
    setOpen(false);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isLoading}>
          <XCircle className="w-4 h-4 mr-1" />
          Отклонить
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Отклонить регистрацию</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Вы собираетесь отклонить регистрацию пользователя:
            </p>
            <p className="font-medium">{user.name} ({user.email})</p>
          </div>
          <div>
            <Label htmlFor="reason">Причина отклонения (необязательно)</Label>
            <Textarea
              id="reason"
              placeholder="Укажите причину отклонения..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Отклонить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UserCardProps {
  user: User;
  onApprove: (userId: number) => void;
  onReject: (userId: number, reason: string) => void;
  isLoading: boolean;
}

function UserCard({ user, onApprove, onReject, isLoading }: UserCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserIcon className="w-5 h-5" />
          {user.name}
          <Badge variant="outline" className="ml-auto">
            На модерации
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Email:</span>
            <span>{user.email}</span>
          </div>
          {user.inn && (
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">ИНН:</span>
              <span className="font-mono">{user.inn}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="font-medium">ID:</span>
            <span>{user.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Роль:</span>
            <span>{user.role || 'user'}</span>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => onApprove(user.id)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-1" />
            )}
            Одобрить
          </Button>
          
          <RejectDialog 
            user={user} 
            onReject={(reason) => onReject(user.id, reason)}
            isLoading={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserModeration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);

  // Загрузка пользователей на модерации
  const { data: pendingUsers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: getPendingUsers,
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  // Мутация для одобрения пользователя
  const approveMutation = useMutation({
    mutationFn: approveUser,
    onMutate: (userId) => {
      setProcessingUserId(userId);
    },
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      toast({
        title: '✅ Пользователь одобрен',
        description: 'Пользователь получит уведомление на почту',
      });
    },
    onError: (error) => {
      toast({
        title: '❌ Ошибка одобрения',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setProcessingUserId(null);
    },
  });

  // Мутация для отклонения пользователя
  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) => 
      rejectUser(userId, reason),
    onMutate: ({ userId }) => {
      setProcessingUserId(userId);
    },
    onSuccess: (data, { userId, reason }) => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      toast({
        title: '🚫 Регистрация отклонена',
        description: 'Пользователь получит уведомление на почту',
      });
    },
    onError: (error) => {
      toast({
        title: '❌ Ошибка отклонения',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setProcessingUserId(null);
    },
  });

  const handleApprove = (userId: number) => {
    approveMutation.mutate(userId);
  };

  const handleReject = (userId: number, reason: string) => {
    rejectMutation.mutate({ userId, reason });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Загрузка пользователей...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">
          Ошибка загрузки: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
        </p>
        <Button onClick={() => refetch()}>Попробовать снова</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Модерация пользователей</h2>
          <p className="text-muted-foreground">
            Пользователи, ожидающие подтверждения регистрации
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Обновить
        </Button>
      </div>

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <UserIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет пользователей на модерации</h3>
            <p className="text-muted-foreground">
              Все новые регистрации будут отображаться здесь
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onApprove={handleApprove}
              onReject={handleReject}
              isLoading={processingUserId === user.id}
            />
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">ℹ️ Информация:</h4>
        <ul className="space-y-1">
          <li>• Пользователи получат email уведомления о решении</li>
          <li>• Одобренные пользователи смогут войти в систему</li>
          <li>• Отклоненные регистрации будут удалены</li>
          <li>• Список обновляется автоматически каждые 30 секунд</li>
        </ul>
      </div>
    </div>
  );
}