import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const sections = [
    { id: 'overview', label: 'Обзор' },
    { id: 'offline', label: 'Оффлайн каталог' },
    { id: 'moderation', label: 'Модерация' },
    { id: 'users', label: 'Пользователи' },
  ];

  return (
    <div className="lg:w-1/4">
      <div className="bg-cinema-gray rounded-lg overflow-hidden">
        <nav className="p-4">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant="ghost"
              className={cn(
                "w-full text-left py-3 px-4 rounded mb-2 font-medium transition-colors duration-200",
                activeSection === section.id
                  ? "bg-cinema-red text-white"
                  : "text-white hover:bg-gray-600"
              )}
              onClick={() => onSectionChange(section.id)}
              data-testid={`admin-nav-${section.id}`}
            >
              {section.label}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
}
