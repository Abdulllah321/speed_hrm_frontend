"use client";

import * as React from "react";
import { ChartOfAccount, deleteChartOfAccount } from "@/lib/actions/chart-of-account";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronRight, Folder, FileText, Upload, Loader2, Plus, MoreHorizontal, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoaBulkUploadModal } from "@/components/finance/coa-bulk-upload-modal";
import { useUploadProgress } from "@/hooks/use-upload-progress";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { verifyPassword } from "@/lib/actions/users";

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
    canEdit,
    canDelete,
    onEdit,
    onDelete,
  }: {
    node: ChartOfAccount;
    depth: number;
    isExpanded: boolean;
    hasChildren: boolean;
    onToggle: (id: string) => void;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: (node: ChartOfAccount) => void;
    onDelete: (node: ChartOfAccount) => void;
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

        {/* Actions */}
        {(canEdit || canDelete) && (
          <td
            className="py-2 px-4 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(node)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canEdit && canDelete && <DropdownMenuSeparator />}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(node)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        )}
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
  const { hasPermission, isAdmin } = useAuth();

  const canCreate = hasPermission("erp.finance.chart-of-account.create");
  const canEdit   = hasPermission("erp.finance.chart-of-account.update");
  const canDelete = hasPermission("erp.finance.chart-of-account.delete");
  const userIsAdmin = isAdmin();

  const tree = React.useMemo(() => buildTree(initialData), [initialData]);

  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => collectGroupIds(tree)
  );
  const [filter, setFilter] = React.useState("");

  // ── Delete dialog state ──────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = React.useState<ChartOfAccount | null>(null);
  const [deleteStep, setDeleteStep] = React.useState<"confirm" | "password">("confirm");
  const [adminPassword, setAdminPassword] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState("");

  const openDeleteDialog = React.useCallback((node: ChartOfAccount) => {
    setDeleteTarget(node);
    setDeleteStep("confirm");
    setAdminPassword("");
    setPasswordError("");
  }, []);

  const closeDeleteDialog = React.useCallback(() => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setAdminPassword("");
    setPasswordError("");
  }, [isDeleting]);

  const handleDeleteProceed = React.useCallback(() => {
    setDeleteStep("password");
    setPasswordError("");
  }, []);

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!deleteTarget) return;
    if (!adminPassword.trim()) {
      setPasswordError("Password is required.");
      return;
    }

    setIsDeleting(true);
    setPasswordError("");

    try {
      // Step 1: verify admin password
      const verify = await verifyPassword(adminPassword);
      if (!verify.status) {
        setPasswordError("Incorrect password. Only admins can delete accounts.");
        setIsDeleting(false);
        return;
      }

      // Step 2: delete the account
      const result = await deleteChartOfAccount(deleteTarget.id);
      if (result.status) {
        toast.success(result.message || "Account deleted successfully");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to delete account");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
      setAdminPassword("");
    }
  }, [deleteTarget, adminPassword, router]);

  const handleEditClick = React.useCallback((node: ChartOfAccount) => {
    router.push(`/erp/finance/chart-of-accounts/edit/${node.id}`);
  }, [router]);

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

  const showActionsColumn = canEdit || canDelete;

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
              {showActionsColumn && (
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-16">Actions</th>
              )}
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
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={handleEditClick}
                  onDelete={openDeleteDialog}
                />
              ))
            ) : (
              <tr>
                <td colSpan={showActionsColumn ? 6 : 5} className="h-24 text-center text-muted-foreground">
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

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={closeDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          {deleteStep === "confirm" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Delete Account
                </DialogTitle>
                <DialogDescription className="pt-1">
                  You are about to delete{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget?.code} — {deleteTarget?.name}
                  </span>
                  .
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2 text-sm">
                <p className="font-semibold text-destructive">This action will:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Permanently delete this account and all its sub-accounts</li>
                  <li>Remove all associated journal entries and transactions</li>
                  <li>Clear all related financial records</li>
                </ul>
                <p className="text-destructive font-medium pt-1">This cannot be undone.</p>
              </div>

              {!userIsAdmin && (
                <div className="rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Only admins and super-admins can delete accounts. You will need to provide admin credentials.</span>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeDeleteDialog}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteProceed}>
                  Continue to Delete
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  Admin Verification Required
                </DialogTitle>
                <DialogDescription className="pt-1">
                  Enter your admin password to confirm deletion of{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget?.code} — {deleteTarget?.name}
                  </span>
                  .
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-password">Admin Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setPasswordError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isDeleting) handleDeleteConfirm();
                    }}
                    disabled={isDeleting}
                    autoFocus
                    autoComplete="current-password"
                  />
                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Only super-admin and admin accounts can authorize this deletion.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setDeleteStep("confirm")}
                  disabled={isDeleting}
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting || !adminPassword.trim()}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Confirm Delete
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
