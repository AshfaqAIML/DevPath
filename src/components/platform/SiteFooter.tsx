"use client";

import Link from "next/link";

import { categoryHref, type CategoriesPayload } from "./platform-data";
import { getAccent } from "@/lib/accent";
import { cn } from "@/lib/utils";

export function SiteFooter({ data }: { data: CategoriesPayload }) {
  const categories = data.categories.filter((c) => c.enabled);
  const total = data.categories.reduce((s, c) => s + c.count, 0);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <p className="text-sm font-bold">DevPath</p>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              A learning platform for developers — deep masterclasses, guided
              career roadmaps, focused mini courses, practical resources and
              interactive simulators.
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              {total} resources live
            </p>
          </div>

          <nav aria-label="Categories — footer">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </p>
            <ul className="mt-3 space-y-2">
              {categories.map((c) => {
                const a = getAccent(c.accent);
                return (
                  <li key={c.slug}>
                    <Link
                      href={categoryHref(c.slug)}
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span aria-hidden className={cn("size-1.5 rounded-full", a.dot)} />
                      {c.title}
                      <span className="text-xs tabular-nums opacity-60">
                        {c.count > 0 ? c.count : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Platform
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/?view=admin" className="transition-colors hover:text-foreground">
                  Admin console
                </Link>
              </li>
              <li>
                <Link href="/" className="transition-colors hover:text-foreground">
                  Browse all resources
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Content model
            </p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>Database-driven counts</li>
              <li>Published / unpublished state</li>
              <li>Admin-configurable wording</li>
              <li>First-party analytics</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {year} DevPath. Built with Next.js, Prisma &amp; shadcn/ui.</p>
          <p>Masterclass → Roadmaps → Courses → Resources → Simulators</p>
        </div>
      </div>
    </footer>
  );
}
