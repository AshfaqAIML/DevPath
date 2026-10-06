"use client";

// ShortcutsHelpDialog — the "?" keyboard help overlay. Documents every global
// shortcut the platform supports, with live category context.
import * as React from "react";
import { useTheme } from "next-themes";
import { Bookmark, Home, Keyboard, Moon, Search, Sun } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CategoriesPayload } from "./platform-data";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");
const MOD = isMac ? "⌘" : "Ctrl";

interface ShortcutRow {
  keys: string[];
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

function ShortcutsHelpDialog({
  open,
  onOpenChange,
  categoriesData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoriesData: CategoriesPayload;
}) {
  const { theme } = useTheme();
  const categories = categoriesData.categories.filter((c) => c.enabled);

  const shortcuts: ShortcutRow[] = [
    { keys: [MOD, "K"], label: "Open global search", icon: Search },
    { keys: ["1", "…", "5"], label: "Jump to category (IA order)", icon: Keyboard },
    { keys: ["L"], label: "Open my library", icon: Bookmark },
    { keys: ["H"], label: "Back to home / category hub", icon: Home },
    {
      keys: ["T"],
      label: `Toggle theme (currently ${theme === "dark" ? "dark" : "light"})`,
      icon: theme === "dark" ? Sun : Moon,
    },
    { keys: ["?"], label: "Show this help", icon: Keyboard },
    { keys: ["Esc"], label: "Close dialogs & menus", icon: Keyboard },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <Keyboard aria-hidden className="size-4" />
            </span>
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate the whole platform without leaving the keyboard. Shortcuts pause
            while you&apos;re typing or a dialog is open.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-1.5" aria-label="Shortcut list">
          {shortcuts.map((s) => (
            <li
              key={s.label}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
            >
              <s.icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm">{s.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={`${s.label}-${k}-${i}`}
                    className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>

        {categories.length > 0 && (
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Number keys map to categories
            </p>
            <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {categories.slice(0, 5).map((c, i) => (
                <li key={c.slug} className="flex items-center gap-2 text-xs">
                  <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold">
                    {i + 1}
                  </kbd>
                  <span className="truncate text-muted-foreground">{c.title}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          Tip: press <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">?</kbd>{" "}
          anytime to reopen this overlay.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export { ShortcutsHelpDialog };
