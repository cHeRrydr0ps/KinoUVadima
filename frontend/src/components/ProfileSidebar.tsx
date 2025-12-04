
import { cn } from "@/lib/utils";
import { ShoppingBag, UserRound } from "lucide-react";

type Props = {
  active: "orders" | "profile";
  onChange: (tab: "orders" | "profile") => void;
};

export default function ProfileSidebar({ active, onChange }: Props) {
  const Item = ({
    id,
    icon: Icon,
    label,
  }: {
    id: "orders" | "profile";
    icon: any;
    label: string;
  }) => (
    <button
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-zinc-800/60 transition",
        active === id ? "bg-zinc-800 text-white" : "text-zinc-300"
      )}
      onClick={() => onChange(id)}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="w-56 shrink-0 space-y-2">      <Item id="profile" icon={UserRound} label="Профиль" />      <Item id="orders" icon={ShoppingBag} label="Покупки" />    </aside>
  );
}
