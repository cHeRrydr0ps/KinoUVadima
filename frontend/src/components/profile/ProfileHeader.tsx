
import { UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileHeader() {
  const { user } = useAuth() as any;
  const inn = user?.inn ?? "—";
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md">
        <UserRound className="w-8 h-8" />
      </div>
      <div className="text-2xl font-semibold">{user?.name ?? "—"}</div>
      <div className="text-zinc-400">ИНН: {inn}</div>
      {user?.email && <div className="text-zinc-400">{user.email}</div>}
    </div>
  );
}
