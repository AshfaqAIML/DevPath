"use client";

// AdminPanel — the platform's content management layer. Categories can be
// reordered, enabled/disabled, retitled and re-badged; the count wording is
// editable; items can be created, published/unpublished, featured and
// deleted; engagement analytics are summarized. Everything here flows
// through the admin-authenticated API and immediately updates the hub.
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Download,
  Eye,
  EyeOff,
  ListOrdered,
  Loader2,
  Lock,
  LogOut,
  MousePointerClick,
  Play,
  Plus,
  Save,
  Search,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAccent } from "@/lib/accent";
import type { CategoryView, ResourceItemView, StepView } from "@/lib/platform";
import { fetchItems, type CategoriesPayload } from "./platform-data";

type AnalyticsSummary = {
  categoryViews: { slug: string | null; views: number }[];
  typeCounts: { type: string; count: number }[];
  recent: { id: string; type: string; slug: string | null; label: string | null; createdAt: string }[];
  totalEvents: number;
  daily: { date: string; count: number }[];
  simulators: { slug: string; views: number; completes: number }[];
};

// ---------------------------------------------------------------- auth gate

// Sessions are httpOnly cookies issued by POST /api/admin/auth — the password
// itself never reaches (or is stored by) the client. The console restores its
// state across reloads via GET /api/admin/auth.
function AuthGate({ onAuthorized }: { onAuthorized: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Invalid password");
      onAuthorized();
      toast({ title: "Welcome back", description: "Admin console unlocked." });
    } catch {
      toast({
        title: "Authentication failed",
        description: "That password doesn’t match the admin credential.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-16">
      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border bg-card p-8 shadow-sm"
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
          <Lock aria-hidden className="size-5 text-muted-foreground" />
        </span>
        <div className="space-y-1.5 text-center">
          <h1 className="text-lg font-bold">Admin console</h1>
          <p className="text-sm text-muted-foreground">
            Manage categories, content and wording — the hub updates live.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full gap-2" disabled={loading || !password}>
          {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Unlock console
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Demo credential: <code className="font-mono">devpath-admin</code>
        </p>
      </form>
    </div>
  );
}

// ------------------------------------------------------------- console root

export function AdminPanel({ categoriesData }: { categoriesData: CategoriesPayload }) {
  // null = session check in flight · false = gated · true = unlocked
  const [authed, setAuthed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/admin/auth")
      .then((r) => r.json() as Promise<{ authorized: boolean }>)
      .then((d) => {
        if (alive) setAuthed(d.authorized);
      })
      .catch(() => {
        if (alive) setAuthed(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (authed === null) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 aria-hidden className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authed) return <AuthGate onAuthorized={() => setAuthed(true)} />;

  const logout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {
      // best-effort: clearing client state matters most
    }
    setAuthed(false);
  };

  return <AdminConsole categoriesData={categoriesData} onLogout={logout} />;
}

function AdminConsole({
  categoriesData,
  onLogout,
}: {
  categoriesData: CategoriesPayload;
  onLogout: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Cookie-authenticated fetch — the httpOnly session travels automatically.
  const authedFetch = React.useCallback(
    (path: string, init?: RequestInit) =>
      fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      }),
    []
  );

  const invalidate = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
    void queryClient.invalidateQueries({ queryKey: ["items"] });
  }, [queryClient]);

  const notify = (ok: boolean, action: string) =>
    toast(
      ok
        ? { title: `${action} saved`, description: "The hub and counts updated live." }
        : {
            title: `Failed: ${action.toLowerCase()}`,
            description: "Check the console for details.",
            variant: "destructive",
          }
    );

  return (
    <div className="space-y-6">
      {/* Console header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Activity aria-hidden className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Admin console</h1>
            <p className="text-xs text-muted-foreground">
              Content &amp; configuration management for the category hub
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/">
              <ArrowLeft aria-hidden className="size-4" />
              Back to platform
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              onLogout();
              router.push("/");
            }}
          >
            <LogOut aria-hidden className="size-4" />
            Log out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="categories">
        <TabsList className="h-11 rounded-xl p-1">
          <TabsTrigger value="categories" className="rounded-lg px-4 text-sm">
            Categories
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-lg px-4 text-sm">
            Content
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg px-4 text-sm">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <CategoryManager
            categories={categoriesData.categories}
            authedFetch={authedFetch}
            invalidate={invalidate}
            notify={notify}
          />
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <ContentManager
            categories={categoriesData.categories}
            authedFetch={authedFetch}
            invalidate={invalidate}
            notify={notify}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab categories={categoriesData.categories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --------------------------------------------------------- category manager

function CategoryManager({
  categories,
  authedFetch,
  invalidate,
  notify,
}: {
  categories: CategoryView[];
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
  invalidate: () => void;
  notify: (ok: boolean, action: string) => void;
}) {
  const patch = async (id: string, data: Record<string, unknown>, action: string) => {
    const res = await authedFetch(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    notify(res.ok, action);
    if (res.ok) invalidate();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const a = categories[index];
    const b = categories[index + dir];
    if (!a || !b) return;
    await Promise.all([
      authedFetch(`/api/categories/${a.id}`, {
        method: "PATCH",
        body: JSON.stringify({ order: b.order }),
      }),
      authedFetch(`/api/categories/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({ order: a.order }),
      }),
    ]);
    notify(true, "Reorder");
    invalidate();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Reorder, enable/disable, and edit the count wording or badge for each
        category. Edits apply to the hub immediately — no frontend deploys.
      </p>
      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Order</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-44">Count label</TableHead>
              <TableHead className="w-40">Badge</TableHead>
              <TableHead className="w-28">Live count</TableHead>
              <TableHead className="w-24">Visible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c, i) => (
              <CategoryRow
                key={c.id}
                category={c}
                first={i === 0}
                last={i === categories.length - 1}
                onMove={(dir) => void move(i, dir)}
                onPatch={(data, action) => void patch(c.id, data, action)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CategoryRow({
  category: c,
  first,
  last,
  onMove,
  onPatch,
}: {
  category: CategoryView;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onPatch: (data: Record<string, unknown>, action: string) => void;
}) {
  const [countLabel, setCountLabel] = React.useState(c.countLabel);
  const [badge, setBadge] = React.useState(c.badge ?? "");
  React.useEffect(() => {
    setCountLabel(c.countLabel);
    setBadge(c.badge ?? "");
  }, [c.countLabel, c.badge]);

  const a = getAccent(c.accent);
  const saveCountLabel = () => {
    if (countLabel !== c.countLabel && countLabel.trim()) {
      onPatch({ countLabel: countLabel.trim() }, "Count wording");
    }
  };
  const saveBadge = () => {
    if (badge !== (c.badge ?? "")) {
      onPatch({ badge: badge.trim() || null }, "Badge");
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 disabled:opacity-30"
            disabled={first}
            onClick={() => onMove(-1)}
            aria-label={`Move ${c.title} up`}
          >
            <ArrowUp aria-hidden className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 disabled:opacity-30"
            disabled={last}
            onClick={() => onMove(1)}
            aria-label={`Move ${c.title} down`}
          >
            <ArrowDown aria-hidden className="size-3.5" />
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <span className={cn("relative size-9 shrink-0 overflow-hidden rounded-lg ring-1", a.iconWrap)}>
            <Image src={c.icon} alt="" fill sizes="36px" className="object-cover" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{c.title}</p>
            <p className="truncate text-xs text-muted-foreground">{c.route}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Input
          value={countLabel}
          onChange={(e) => setCountLabel(e.target.value)}
          onBlur={saveCountLabel}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-8 text-xs"
          aria-label={`Count label for ${c.title}`}
        />
      </TableCell>
      <TableCell>
        <Input
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          onBlur={saveBadge}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="—"
          className="h-8 text-xs"
          aria-label={`Badge for ${c.title}`}
        />
      </TableCell>
      <TableCell>
        <span className="text-sm tabular-nums">
          <span className={cn("font-semibold", a.text)}>{c.count}</span>
          <span className="text-muted-foreground"> / {c.totalItems}</span>
        </span>
      </TableCell>
      <TableCell>
        <Switch
          checked={c.enabled}
          onCheckedChange={(v) => onPatch({ enabled: v }, v ? "Visibility" : "Visibility")}
          aria-label={`${c.title} visible in hub`}
        />
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------- content manager

function ContentManager({
  categories,
  authedFetch,
  invalidate,
  notify,
}: {
  categories: CategoryView[];
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
  invalidate: () => void;
  notify: (ok: boolean, action: string) => void;
}) {
  const [filter, setFilter] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [stepsItem, setStepsItem] = React.useState<ResourceItemView | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["items", "admin", filter, q],
    queryFn: () => fetchItems({ category: filter === "all" ? undefined : filter, q, all: true }),
  });

  const items = data?.items ?? [];
  const selectableIds = items.map((i) => i.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = async (action: "publish" | "unpublish" | "feature" | "unfeature" | "delete") => {
    if (selected.size === 0 || bulkBusy) return;
    if (action === "delete" && !window.confirm(`Delete ${selected.size} item(s)? This cannot be undone.`)) {
      return;
    }
    setBulkBusy(true);
    try {
      const res = await authedFetch("/api/resources/bulk", {
        method: "POST",
        body: JSON.stringify({ ids: [...selected], action }),
      });
      const payload = (await res.json().catch(() => ({}))) as { affected?: number };
      notify(
        res.ok,
        `${action} ${payload.affected ?? selected.size} item(s)`
      );
      if (res.ok) {
        setSelected(new Set());
        invalidate();
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const exportCsv = () => {
    const header = ["title", "category", "level", "duration", "published", "featured", "views", "tags", "slug"];
    const rows = items.map((i) => [
      i.title,
      i.categoryTitle,
      i.level,
      i.duration ?? "",
      i.published ? "yes" : "no",
      i.featured ? "yes" : "no",
      String(i.views),
      i.tags.join(" "),
      i.slug,
    ]);
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [header.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devpath-content-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const patchItem = async (id: string, body: Record<string, unknown>, action: string) => {
    const res = await authedFetch(`/api/resources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    notify(res.ok, action);
    if (res.ok) invalidate();
  };

  const deleteItem = async (id: string, title: string) => {
    const res = await authedFetch(`/api/resources/${id}`, { method: "DELETE" });
    notify(res.ok, `Delete “${title}”`);
    if (res.ok) invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search content…"
            className="h-10 pl-9"
            aria-label="Search content"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-10 w-44 rounded-lg" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-10 gap-2 rounded-lg" onClick={exportCsv} disabled={items.length === 0}>
          <Download aria-hidden className="size-4" />
          Export CSV
        </Button>
        <Button className="h-10 gap-2 rounded-lg" onClick={() => setAddOpen(true)}>
          <Plus aria-hidden className="size-4" />
          Add content
        </Button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium tabular-nums">
            {selected.size} selected
          </span>
          <span aria-hidden className="h-4 w-px bg-border" />
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs"
            disabled={bulkBusy}
            onClick={() => void runBulk("publish")}
          >
            <Eye aria-hidden className="size-3.5" />
            Publish
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs"
            disabled={bulkBusy}
            onClick={() => void runBulk("unpublish")}
          >
            <EyeOff aria-hidden className="size-3.5" />
            Unpublish
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs"
            disabled={bulkBusy}
            onClick={() => void runBulk("feature")}
          >
            <Star aria-hidden className="size-3.5" />
            Feature
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs"
            disabled={bulkBusy}
            onClick={() => void runBulk("unfeature")}
          >
            <StarOff aria-hidden className="size-3.5" />
            Unfeature
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs text-destructive hover:text-destructive"
            disabled={bulkBusy}
            onClick={() => void runBulk("delete")}
          >
            <Trash2 aria-hidden className="size-3.5" />
            Delete
          </Button>
          {bulkBusy && <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 rounded-lg text-xs"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="max-h-[560px] overflow-y-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows"
                  disabled={items.length === 0}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-28">Category</TableHead>
              <TableHead className="w-32">Level</TableHead>
              <TableHead className="w-24">Published</TableHead>
              <TableHead className="w-20">Featured</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 aria-hidden className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No content matches.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const a = getAccent(item.categoryAccent);
                const isSel = selected.has(item.id);
                const canEditSteps = item.steps.length > 0 || item.categorySlug === "roadmaps";
                return (
                  <TableRow key={item.id} className={cn(isSel && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={() => toggleOne(item.id)}
                        aria-label={`Select ${item.title}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-72">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.steps.length > 0
                          ? `${item.steps.length} steps`
                          : (item.duration ?? item.tags.slice(0, 2).join(", "))}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span aria-hidden className={cn("size-1.5 rounded-full", a.dot)} />
                        {item.categoryTitle}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {item.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.published}
                        onCheckedChange={(v) =>
                          void patchItem(item.id, { published: v }, `Publish “${item.title}”`)
                        }
                        aria-label={`Publish ${item.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-8",
                          item.featured ? "text-amber-500" : "text-muted-foreground"
                        )}
                        onClick={() =>
                          void patchItem(item.id, { featured: !item.featured }, "Featured")
                        }
                        aria-label={`Toggle featured for ${item.title}`}
                      >
                        <Star
                          aria-hidden
                          className={cn("size-4", item.featured && "fill-amber-500")}
                        />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        {canEditSteps && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "size-8",
                              item.steps.length > 0
                                ? "text-emerald-600 hover:text-emerald-600"
                                : "text-muted-foreground"
                            )}
                            onClick={() => setStepsItem(item)}
                            aria-label={`Edit learning path steps for ${item.title}`}
                            title="Edit learning path steps"
                          >
                            <ListOrdered aria-hidden className="size-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              aria-label={`Delete ${item.title}`}
                            >
                              <Trash2 aria-hidden className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete “{item.title}”?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the item and lowers the
                                category count in the hub.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void deleteItem(item.id, item.title)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        authedFetch={authedFetch}
        invalidate={invalidate}
        notify={notify}
      />

      <StepsEditorDialog
        item={stepsItem}
        onOpenChange={(open) => {
          if (!open) setStepsItem(null);
        }}
        authedFetch={authedFetch}
        invalidate={invalidate}
        notify={notify}
      />
    </div>
  );
}

function AddItemDialog({
  open,
  onOpenChange,
  categories,
  authedFetch,
  invalidate,
  notify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryView[];
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
  invalidate: () => void;
  notify: (ok: boolean, action: string) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categorySlug, setCategorySlug] = React.useState(categories[0]?.slug ?? "");
  const [level, setLevel] = React.useState("Beginner");
  const [duration, setDuration] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [published, setPublished] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categorySlug) return;
    setSaving(true);
    try {
      const res = await authedFetch("/api/resources", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categorySlug,
          level,
          duration: duration.trim() || undefined,
          tags: tags.trim(),
          published,
        }),
      });
      notify(res.ok, `Create “${title.trim()}”`);
      if (res.ok) {
        invalidate();
        onOpenChange(false);
        setTitle("");
        setDescription("");
        setDuration("");
        setTags("");
        setPublished(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add new content</DialogTitle>
          <DialogDescription>
            Publishing immediately updates the live category count in the hub.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-title">Title</Label>
            <Input
              id="new-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. WebAssembly Deep Dive"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-desc">Description</Label>
            <Input
              id="new-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One-line description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categorySlug} onValueChange={setCategorySlug}>
                <SelectTrigger aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger aria-label="Level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Beginner", "Intermediate", "Advanced"].map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="new-duration">Duration</Label>
              <Input
                id="new-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="2h 15m"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-tags">Tags</Label>
              <Input
                id="new-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="wasm,systems"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="new-published">Publish immediately</Label>
              <p className="text-xs text-muted-foreground">
                Unchecked creates a draft (hidden from the public count).
              </p>
            </div>
            <Switch
              id="new-published"
              checked={published}
              onCheckedChange={setPublished}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled={saving || !title.trim()}>
              {saving ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Save aria-hidden className="size-4" />
              )}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------- roadmap steps editor

interface EditableStep {
  title: string;
  detail: string;
  hours: string;
}

function StepsEditorDialog({
  item,
  onOpenChange,
  authedFetch,
  invalidate,
  notify,
}: {
  item: ResourceItemView | null;
  onOpenChange: (open: boolean) => void;
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
  invalidate: () => void;
  notify: (ok: boolean, action: string) => void;
}) {
  const [steps, setSteps] = React.useState<EditableStep[]>([]);
  const [saving, setSaving] = React.useState(false);
  const open = !!item;

  // Load the item's steps whenever a new item opens the dialog
  React.useEffect(() => {
    if (item) {
      setSteps(
        item.steps.map((s: StepView) => ({
          title: s.title,
          detail: s.detail,
          hours: s.hours !== undefined ? String(s.hours) : "",
        }))
      );
    }
  }, [item]);

  const totalHours = steps.reduce((a, s) => a + (Number(s.hours) || 0), 0);
  const valid =
    steps.length > 0 && steps.every((s) => s.title.trim().length > 0);

  const update = (i: number, patch: Partial<EditableStep>) => {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const move = (i: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const save = async () => {
    if (!item || !valid || saving) return;
    setSaving(true);
    try {
      const res = await authedFetch(`/api/resources/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          steps: steps.map((s) => ({
            title: s.title.trim(),
            detail: s.detail.trim(),
            ...(s.hours.trim() !== "" ? { hours: Number(s.hours) } : {}),
          })),
        }),
      });
      notify(res.ok, `Learning path for “${item.title}”`);
      if (res.ok) {
        invalidate();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <ListOrdered aria-hidden className="size-4 text-emerald-500" />
            Learning path editor
          </DialogTitle>
          <DialogDescription>
            {item ? item.title : ""} — reorder, rewrite or remove milestones.
            Learners see this as the step-graph and progress checklist.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <span className="font-medium tabular-nums">
            {steps.length} step{steps.length === 1 ? "" : "s"}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {totalHours > 0 ? `≈ ${totalHours} h of guided learning` : "no hour estimates yet"}
          </span>
        </div>

        <ol className="space-y-2.5">
          {steps.map((s, i) => (
            <li
              key={i}
              className="rounded-xl border bg-background/60 p-3 transition-colors focus-within:border-emerald-500/40"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-card text-[11px] font-bold tabular-nums text-muted-foreground"
                >
                  {i + 1}
                </span>
                <Input
                  value={s.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder="Step title"
                  className="h-8 flex-1 text-sm font-medium"
                  aria-label={`Step ${i + 1} title`}
                />
                <Input
                  value={s.hours}
                  onChange={(e) => update(i, { hours: e.target.value.replace(/[^0-9]/g, "") })}
                  placeholder="h"
                  inputMode="numeric"
                  className="h-8 w-16 text-center text-sm tabular-nums"
                  aria-label={`Step ${i + 1} hours`}
                  title="Estimated hours"
                />
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move step ${i + 1} up`}
                  >
                    <ArrowUp aria-hidden className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 disabled:opacity-30"
                    disabled={i === steps.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move step ${i + 1} down`}
                  >
                    <ArrowDown aria-hidden className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove step ${i + 1}`}
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={s.detail}
                onChange={(e) => update(i, { detail: e.target.value })}
                placeholder="What the learner does in this step (shown under the title)"
                className="mt-2 min-h-16 text-xs"
                aria-label={`Step ${i + 1} detail`}
              />
            </li>
          ))}
          {steps.length === 0 && (
            <li className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No steps yet — add the first milestone below.
            </li>
          )}
        </ol>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-dashed"
          disabled={steps.length >= 30}
          onClick={() =>
            setSteps((prev) => [...prev, { title: "", detail: "", hours: "" }])
          }
        >
          <Plus aria-hidden className="size-3.5" />
          Add step
        </Button>

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {valid ? "Saving replaces the full ordered list." : "Every step needs a title."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="gap-2" disabled={!valid || saving} onClick={() => void save()}>
              {saving ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Save aria-hidden className="size-4" />
              )}
              Save path
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------- analytics tab

function AnalyticsTab({
  categories,
}: {
  categories: CategoryView[];
}) {
  const { data } = useQuery<AnalyticsSummary>({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    refetchInterval: 15_000,
  });

  const typeCount = (type: string) =>
    data?.typeCounts.find((t) => t.type === type)?.count ?? 0;
  const maxViews = Math.max(1, ...(data?.categoryViews.map((v) => v.views) ?? [1]));
  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.count) ?? [1]));
  const todayKey = new Date().toISOString().slice(0, 10);
  const weekTotal = data?.daily.reduce((a, d) => a + d.count, 0) ?? 0;

  const stats = [
    { label: "Total events", value: data?.totalEvents ?? 0, icon: Activity },
    { label: "Category views", value: typeCount("category_view"), icon: Eye },
    { label: "Item views", value: typeCount("item_view"), icon: MousePointerClick },
    { label: "Searches", value: typeCount("search"), icon: Search },
    { label: "Sim launches", value: typeCount("simulator_view"), icon: Play },
    { label: "Missions cleared", value: typeCount("challenge_complete"), icon: Star },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <s.icon aria-hidden className="size-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 7-day activity chart */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Activity — last 7 days</h3>
          <span className="text-xs tabular-nums text-muted-foreground">
            {weekTotal} events this week
          </span>
        </div>
        <div className="mt-4 flex h-36 items-end gap-2 sm:gap-3" role="img" aria-label="Bar chart of analytics events per day for the last seven days">
          {data?.daily.map((d) => {
            const isToday = d.date === todayKey;
            const pct = Math.max(3, (d.count / maxDaily) * 100);
            const label = new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "short",
            });
            return (
              <div key={d.date} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {d.count}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    title={`${d.count} events on ${d.date}`}
                    style={{ height: `${pct}%` }}
                    className={cn(
                      "w-full rounded-md transition-all duration-500",
                      isToday
                        ? "bg-gradient-to-t from-teal-600 to-teal-400"
                        : "bg-gradient-to-t from-teal-500/40 to-teal-500/25 group-hover:from-teal-500/60 group-hover:to-teal-500/40"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isToday ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"
                  )}
                >
                  {isToday ? "today" : label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Views by category */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Category views</h3>
          <ul className="mt-4 space-y-3">
            {categories.map((c) => {
              const views =
                data?.categoryViews.find((v) => v.slug === c.slug)?.views ?? 0;
              const a = getAccent(c.accent);
              return (
                <li key={c.slug} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span aria-hidden className={cn("size-1.5 rounded-full", a.dot)} />
                      {c.title}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{views}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", a.dot)}
                      style={{ width: `${Math.max(2, (views / maxViews) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Simulator engagement */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Simulator engagement</h3>
          {(data?.simulators ?? []).length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No simulator activity yet — launch a sandbox to generate events.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {data?.simulators.map((sim) => {
                const maxSim = Math.max(1, ...data.simulators.map((s) => s.views));
                return (
                  <li key={sim.slug} className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 font-medium">
                        <Play aria-hidden className="size-3 shrink-0 text-teal-500" />
                        <span className="truncate font-mono text-[11px]">{sim.slug}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {sim.views} launches · {sim.completes} cleared
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-500"
                        style={{ width: `${Math.max(2, (sim.views / maxSim) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {sim.views > 0
                        ? `${(sim.completes / sim.views).toFixed(1)} missions cleared per launch on average`
                        : "no launches yet"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent events */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-sm font-semibold">Recent events</h3>
        <div className="mt-4 max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {(data?.recent ?? []).length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No events recorded yet — browse the platform to generate some.
            </p>
          ) : (
            data?.recent.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 px-3 py-2 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {e.type}
                  </span>
                  <span className="truncate font-medium">{e.label ?? e.slug ?? "—"}</span>
                </span>
                <time className="shrink-0 text-muted-foreground" dateTime={e.createdAt}>
                  {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                </time>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
