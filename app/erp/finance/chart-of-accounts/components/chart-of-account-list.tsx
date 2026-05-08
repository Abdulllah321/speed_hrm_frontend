"use client";

import * as React from "react";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronRight, Folder, FileText, Upload, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoaBulkUploadModal } from "@/components/finance/coa-bulk-upload-modal";
import { useUploadProgress } from "@/hooks/use-upload-progress";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";

interface ChartOfAccountListProps {
  initialData: ChartOfAccount[];
}

const pkrFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

// ---------------------------------------------------------------------------
// Build tree once from flat list
// ---------------------------------------------------------------------------
function buildTree(flat: ChartOfAccount[]): ChartOfAccount[] {
  const map = new Map<string, ChartOfAccount>();
  const roots: ChartOfAccount[] = [];

  flat.forEach((item) => map.set(item.id, { ...item, children: [] }));

  flat.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// ---------------------------------------------------------------------------
// Flatten visible rows based on expanded set
// ---------------------------------------------------------------------------
function flattenVisible(
  nodes: ChartOfAccount[],
  expandedIds: Set<string>,
  depth = 0,
  result: Array<{ node: ChartOfAccount; depth: number }> = []
): Array<{ node: ChartOfAccount; depth: number }> {
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.children?.length && expandedIds.has(node.id)) {
      flattenVisible(node.children, expandedIds, depth + 1, result);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Collect all group IDs for "expand all" default
// ---------------------------------------------------------------------------
function collectGroupIds(nodes: ChartOfAccount[], out = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (node.isGroup && node.children?.length) {
      out.add(node.id);
      collectGroupIds(node.children, out);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Row — memoized
// ---------------------------------------------------------------------------
const AccountRow = React.memo(
  ({
    node,
    depth,
    isExpanded,
    hasChildren,
    onToggle,
  }: {
    node: ChartOfAccount;
    depth: number;
    isExpanded: boolean;
    hasChildren: boolean;
    onToggle: (id: string) => void;
  }) => {
    const indentSize = 24;

    return (
      <tr
        className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
        onClick={() => hasChildren && onToggle(node.id)}
      >
        {/* Name cell */}
        <td className="p-0 relative">
          <div className="flex items-center h-full w-full py-2 pr-4 relative">
            {/* Vertical guide lines */}
            {Array.from({ length: depth }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-border/40"
                style={{ left: `${i * indentSize + 12}px` }}
              />
            ))}

            <div
              className="flex items-center"
              style={{ paddingLeft: `${depth * indentSize}px` }}
            >
              {/* L-shape connector */}
              {depth > 0 && (
                <div
                  className="absolute w-3 h-px bg-border/40"
                  style={{ left: `${(depth - 1) * indentSize + 12}px` }}
                />
              )}

              {hasChildren ? (
                <span
                  className="mr-1 p-0.5 rounded-sm hover:bg-muted z-10 inline-flex"
                  style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 150ms ease",
                  }}
                >
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </span>
              ) : (
                <span className="w-5 mr-1" />
              )}

              {node.isGroup ? (
                <Folder className="mr-2 h-4 w-4 shrink-0 text-blue-500 fill-blue-500/20" />
              ) : (
                <FileText className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
              )}

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground/70">
                  {node.code}
                </span>
                <span
                  className={cn(
                    "truncate",
                    node.isGroup
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {node.name}
                </span>
              </div>
            </div>
          </div>
        </td>

        {/* Type */}
        <td className="py-2 px-4">
          <Badge variant="outline" className="font-normal">
            {node.type}
          </Badge>
        </td>

        {/* Group */}
        <td className="py-2 px-4">
          <Checkbox checked={node.isGroup} disabled className="opacity-70" />
        </td>

        {/* Active */}
        <td className="py-2 px-4">
          <Badge
            variant={node.isActive ? "default" : "secondary"}
            className="rounded-full"
          >
            {node.isActive ? "Active" : "Inactive"}
          </Badge>
        </td>

        {/* Balance */}
        <td className="py-2 px-4 text-right font-medium font-mono">
          {pkrFormatter.format(node.balance).replace("PKR", "Rs.")}
        </td>
      </tr>
    );
  }
);
AccountRow.displayName = "AccountRow";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ChartOfAccountList({ initialData }: ChartOfAccountListProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission("erp.finance.chart-of-account.create");

  const tree = React.useMemo(() => buildTree(initialData), [initialData]);

  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => collectGroupIds(tree)
  );
  const [filter, setFilter] = React.useState("");

  // ── Bulk upload state ────────────────────────────────────────────────────
  const [isBulkUploadOpen, setIsBulkUploadOpen] = React.useState(false);
  const [activeUploadId, setActiveUploadId] = React.useState<string | null>(null);

  // Persist upload ID across page navigations
  React.useEffect(() => {
    const stored = localStorage.getItem("active_coa_upload_id");
    if (stored) setActiveUploadId(stored);
  }, []);

  const handleUploadIdChange = (id: string | null) => {
    setActiveUploadId(id);
    if (id) {
      localStorage.setItem("active_coa_upload_id", id);
    } else {
      localStorage.removeItem("active_coa_upload_id");
    }
  };

  const { data: uploadProgress } = useUploadProgress(activeUploadId, "coa");

  // Refresh tree when import completes
  React.useEffect(() => {
    if (uploadProgress?.status === "completed") {
      router.refresh();
    }
  }, [uploadProgress?.status, router]);

  // ── Tree interaction ─────────────────────────────────────────────────────
  const toggle = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visibleRows = React.useMemo(() => {
    if (!filter.trim()) {
      return flattenVisible(tree, expandedIds);
    }

    const q = filter.toLowerCase();
    const matched: Array<{ node: ChartOfAccount; depth: number }> = [];

    function search(nodes: ChartOfAccount[], depth: number) {
      for (const node of nodes) {
        if (
          node.name.toLowerCase().includes(q) ||
          node.code.toLowerCase().includes(q)
        ) {
          matched.push({ node, depth: 0 });
        }
        if (node.children?.length) search(node.children, depth + 1);
      }
    }
    search(tree, 0);
    return matched;
  }, [tree, expandedIds, filter]);

  // ── Upload progress button label ─────────────────────────────────────────
  const progressLabel = React.useMemo(() => {
    const s = uploadProgress?.status;
    if (s === "failed")     return "Import Failed";
    if (s === "completed")  return "Import Complete";
    if (s === "validated")  return "Validation Complete";
    if (s === "validating") return `Validating ${uploadProgress?.progress ?? 0}%`;
    return `Importing ${uploadProgress?.progress ?? 0}%`;
  }, [uploadProgress?.status, uploadProgress?.progress]);

  const isInProgress =
    uploadProgress?.status === "validating" ||
    uploadProgress?.status === "processing" ||
    uploadProgress?.status === "pending";

  return (
    <div className="space-y-4">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage your financial accounts hierarchy.</p>
        </div>

        {canCreate && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
            <Link href="/erp/finance/chart-of-accounts/create" transitionTypes={["nav-forward"]}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Filter by name or code..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />

        {/* Background progress pill — visible when modal is closed but job is running */}
        {activeUploadId && !isBulkUploadOpen && (
          <Button
            variant={
              uploadProgress?.status === "failed"
                ? "destructive"
                : uploadProgress?.status === "completed"
                ? "default"
                : "outline"
            }
            className={cn(
              "relative overflow-hidden min-w-48 border-primary text-primary",
              uploadProgress?.status === "failed" &&
                "border-destructive! text-destructive-foreground! bg-destructive!",
              uploadProgress?.status === "completed" &&
                "text-primary-foreground! bg-primary!"
            )}
            onClick={() => setIsBulkUploadOpen(true)}
          >
            {/* Animated fill bar */}
            <div
              className="absolute inset-0 bg-primary/10 transition-all duration-500"
              style={{ width: `${uploadProgress?.progress ?? 0}%` }}
            />
            <div className="relative flex items-center gap-2">
              {isInProgress && <Loader2 className="h-4 w-4 animate-spin" />}
              <span className="font-bold">{progressLabel}</span>
            </div>
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Group</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Active</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Balance</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {visibleRows.length ? (
              visibleRows.map(({ node, depth }) => (
                <AccountRow
                  key={node.id}
                  node={node}
                  depth={depth}
                  isExpanded={expandedIds.has(node.id)}
                  hasChildren={!!node.children?.length}
                  onToggle={toggle}
                />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="h-24 text-center text-muted-foreground">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center py-2">
        <span className="text-sm text-muted-foreground">
          {visibleRows.length} row(s)
        </span>
      </div>

      {/* ── Bulk Upload Modal ── */}
      <CoaBulkUploadModal
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onSuccess={() => router.refresh()}
        uploadId={activeUploadId}
        onUploadIdChange={handleUploadIdChange}
      />
    </div>
  );
}
