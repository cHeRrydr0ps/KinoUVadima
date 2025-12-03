import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getGenres } from "@/api/adminApi";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  errorText?: string;
};

export default function GenresMultiSelect({ value, onChange, placeholder = "Выберите жанры", errorText }: Props) {
  const { data: genres = [] } = useQuery({ queryKey: ["admin","genres"], queryFn: getGenres });
  const [open, setOpen] = React.useState(false);

  const toggle = (id: number) => {
    if (value.includes(id)) onChange(value.filter(x => x !== id));
    else onChange([...value, id]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            {value.length ? "Выбрано: " + value.length : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0 z-50" align="start">
          <Command>
            <CommandInput placeholder="Поиск жанра..." />
            <CommandEmpty>Жанров не найдено.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-64">
                {genres.map((g) => (
                  <CommandItem
                    key={g.genre_id}
                    // Не закрываем поповер при выборе
                    onSelect={(/*_val*/) => {
                      toggle(g.genre_id);
                      // оставляем поповер открытым
                      setOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={value.includes(g.genre_id)}
                      onCheckedChange={(/*checked*/) => toggle(g.genre_id)}
                      // предотвращаем всплытие клика до CommandItem
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>{g.name}</span>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {!!errorText && <p className="text-sm text-red-500">{errorText}</p>}
      {!!value.length && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => {
            const g = genres.find((x) => x.genre_id === id);
            if (!g) return null;
            return (
              <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => toggle(id)} title="Удалить жанр">
                {g.name} ×
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
