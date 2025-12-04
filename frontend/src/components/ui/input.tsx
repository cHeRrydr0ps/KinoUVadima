import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Если нужно разрешить пробелы в конкретном поле — выставьте true */
  allowSpaces?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, allowSpaces = false, onBeforeInput, onKeyDown, onPaste, ...props }, ref) => {
    const handleBeforeInput = (e: any) => {
      const data = e?.data ?? "";
      if (!allowSpaces && typeof data === "string" && /\s/.test(data)) {
        e.preventDefault();
        return;
      }
      onBeforeInput?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!allowSpaces && e.key === " ") {
        e.preventDefault();
        return;
      }
      onKeyDown?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (!allowSpaces) {
        e.preventDefault();
        const text = (e.clipboardData || (window as any).clipboardData)
          .getData("text")
          .replace(/\s+/g, "");
        const target = e.target as HTMLInputElement;
        const start = target.selectionStart ?? target.value.length;
        const end = target.selectionEnd ?? target.value.length;
        const next = target.value.slice(0, start) + text + target.value.slice(end);
        target.value = next;
        try {
          target.setSelectionRange(start + text.length, start + text.length);
        } catch {}
        target.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      onPaste?.(e);
    };

    return (
      <input
        type={type}
        ref={ref}
        onBeforeInput={handleBeforeInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-sm",
          "border-input bg-background text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
