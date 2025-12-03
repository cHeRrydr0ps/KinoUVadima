
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

// Import your AuthModal component (must have default export)
import AuthModal, { AuthModal as NamedAuthModal } from "@/components/AuthModal";

/**
 * Utility: find a clickable ancestor for delegation.
 */
function findClickable(start: Element | null): HTMLElement | null {
  let el: Element | null = start;
  while (el && el !== document.body) {
    const he = el as HTMLElement;
    const tag = he.tagName.toLowerCase();
    const role = he.getAttribute("role") || "";
    if (
      tag === "button" ||
      tag === "a" ||
      he.dataset.authOpen !== undefined ||
      role === "button" ||
      he.classList.contains("btn") // common helper
    ) {
      return he;
    }
    el = he.parentElement;
  }
  return null;
}

/**
 * Heuristic: does element text look like our auth open trigger?
 */
function looksLikeAuthTrigger(el: HTMLElement): boolean {
  if (el.dataset.authOpen !== undefined) return true;
  const text = (el.innerText || "").trim().toLowerCase();
  return /войти( в систему)?/.test(text) || /login|sign\s*in/.test(text);
}

/**
 * Global click delegation: open auth modal when clicking trigger elements.
 */
function installGlobalAuthDelegation(open: () => void) {
  const onClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    const el = findClickable(target);
    if (!el) return;
    if (!looksLikeAuthTrigger(el as HTMLElement)) return;
    // Do not interfere with disabled buttons
    if ((el as HTMLButtonElement).disabled) return;
    // Prevent default for anchors without meaningful href
    if (el.tagName.toLowerCase() === "a") {
      const a = el as HTMLAnchorElement;
      const href = (a.getAttribute("href") || "").trim();
      if (!href || href === "#" || href.startsWith("javascript:")) {
        e.preventDefault();
      }
    }
    open();
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}

/**
 * Modal host that lives outside app tree and listens for open events.
 */
const ModalHost: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const offDelegation = installGlobalAuthDelegation(() => setOpen(true));
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    window.addEventListener("auth:open", onOpen as EventListener);
    window.addEventListener("auth:close", onClose as EventListener);
    return () => {
      offDelegation();
      window.removeEventListener("auth:open", onOpen as EventListener);
      window.removeEventListener("auth:close", onClose as EventListener);
    };
  }, []);

  // Pick whichever export is available
  const ModalComponent: any = useMemo(() => (AuthModal ?? (NamedAuthModal as any)), []);

  if (!ModalComponent) return null;
  return <ModalComponent open={open} onOpenChange={setOpen} />;
};

/**
 * Mount once per page load.
 */
(function mountAuthModalHost() {
  const existing = document.getElementById("auth-modal-portal");
  if (existing && (existing as any).__mounted) return;

  const rootEl = existing || document.createElement("div");
  rootEl.id = "auth-modal-portal";
  (rootEl as any).__mounted = true;
  document.body.appendChild(rootEl);

  const root = createRoot(rootEl);
  root.render(<ModalHost />);
})();
