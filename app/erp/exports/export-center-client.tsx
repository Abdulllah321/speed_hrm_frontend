"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  getExports,
  updateExport,
  deleteExport,
  bulkDeleteExports,
  bulkMoveExports,
  bulkRenameExports,
} from "@/lib/actions/exports-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  FolderPlus,
  Folder,
  FileSpreadsheet,
  FileText,
  Star,
  Download,
  Eye,
  MoreVertical,
  Trash2,
  Edit,
  Move,
  Search,
  ExternalLink,
  Loader2,
  FolderOpen,
  X,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl, cn } from "@/lib/utils";
import Cookies from "js-cookie";

interface ExportFolder {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    exports: number;
  };
}

interface ExportHistory {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  moduleName: string;
  status: string;
  downloadCount: number;
  createdAt: string;
  completedAt: string | null;
  folderId: string | null;
  isFavorite: boolean;
  folder?: {
    id: string;
    name: string;
  } | null;
}

interface ExportCenterClientProps {
  initialFolders: ExportFolder[];
  initialExports: ExportHistory[];
}

export default function ExportCenterClient({
  initialFolders,
  initialExports,
}: ExportCenterClientProps) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<ExportFolder[]>(initialFolders);
  const [exportsList, setExportsList] = useState<ExportHistory[]>(initialExports);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [isFavoriteOnly, setIsFavoriteOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Folder CRUD states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<ExportFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<ExportFolder | null>(null);

  // Single file states
  const [isRenameExportOpen, setIsRenameExportOpen] = useState(false);
  const [exportToRename, setExportToRename] = useState<ExportHistory | null>(null);
  const [renameExportName, setRenameExportName] = useState("");

  const [isMoveExportOpen, setIsMoveExportOpen] = useState(false);
  const [exportToMove, setExportToMove] = useState<ExportHistory | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>("root");

  // Bulk Action dialog states
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [bulkTargetFolderId, setBulkTargetFolderId] = useState("root");

  const [isBulkRenameOpen, setIsBulkRenameOpen] = useState(false);
  const [bulkRenameBaseName, setBulkRenameBaseName] = useState("");

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Fetch / Refresh data
  const fetchData = async () => {
    setLoading(true);
    try {
      const foldersRes = await getFolders();
      if (foldersRes.status) {
        setFolders(foldersRes.data);
      }

      const exportsRes = await getExports({
        folderId: selectedFolderId === "all" ? undefined : (selectedFolderId === "root" ? null : selectedFolderId),
        isFavorite: isFavoriteOnly ? true : undefined,
        search: searchQuery || undefined,
      });
      if (exportsRes.status) {
        setExportsList(exportsRes.data);
      }
    } catch (e) {
      toast.error("Failed to load exports data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Clear selection on filter changes
    setSelectedIds([]);
  }, [selectedFolderId, isFavoriteOnly]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // Selection helpers
  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === exportsList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(exportsList.map(exp => exp.id));
    }
  };

  // Folder CRUD handlers
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await createFolder(newFolderName.trim());
      if (res.status) {
        toast.success("Folder created successfully");
        setIsCreateOpen(false);
        setNewFolderName("");
        fetchData();
      } else {
        toast.error(res.message || "Failed to create folder");
      }
    } catch (e) {
      toast.error("Server error creating folder");
    }
  };

  const handleRenameFolder = async () => {
    if (!folderToRename || !renameFolderName.trim()) return;
    try {
      const res = await renameFolder(folderToRename.id, renameFolderName.trim());
      if (res.status) {
        toast.success("Folder renamed successfully");
        setIsRenameFolderOpen(false);
        setFolderToRename(null);
        setRenameFolderName("");
        fetchData();
      } else {
        toast.error(res.message || "Failed to rename folder");
      }
    } catch (e) {
      toast.error("Server error renaming folder");
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      const res = await deleteFolder(folderToDelete.id);
      if (res.status) {
        toast.success("Folder deleted. Exports are preserved in the Root directory.");
        setIsDeleteFolderOpen(false);
        setFolderToDelete(null);
        if (selectedFolderId === folderToDelete.id) {
          setSelectedFolderId("all");
        }
        fetchData();
      } else {
        toast.error(res.message || "Failed to delete folder");
      }
    } catch (e) {
      toast.error("Server error deleting folder");
    }
  };

  // Single file action handlers
  const handleToggleFavorite = async (exp: ExportHistory) => {
    try {
      const res = await updateExport(exp.id, { isFavorite: !exp.isFavorite });
      if (res.status) {
        toast.success(exp.isFavorite ? "Removed from Favorites" : "Added to Favorites");
        fetchData();
      }
    } catch (e) {
      toast.error("Failed to update favorite status");
    }
  };

  const handleRenameExport = async () => {
    if (!exportToRename || !renameExportName.trim()) return;
    try {
      const res = await updateExport(exportToRename.id, { fileName: renameExportName.trim() });
      if (res.status) {
        toast.success("Export file renamed");
        setIsRenameExportOpen(false);
        setExportToRename(null);
        setRenameExportName("");
        fetchData();
      } else {
        toast.error(res.message || "Failed to rename export");
      }
    } catch (e) {
      toast.error("Server error renaming export file");
    }
  };

  const handleMoveExport = async () => {
    if (!exportToMove) return;
    const destFolder = targetFolderId === "root" ? null : targetFolderId;
    try {
      const res = await updateExport(exportToMove.id, { folderId: destFolder });
      if (res.status) {
        toast.success("Export file moved successfully");
        setIsMoveExportOpen(false);
        setExportToMove(null);
        fetchData();
      } else {
        toast.error(res.message || "Failed to move file");
      }
    } catch (e) {
      toast.error("Server error moving export file");
    }
  };

  const handleDeleteExport = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this export history record?")) return;
    try {
      const res = await deleteExport(id);
      if (res.status) {
        toast.success("Export deleted successfully");
        fetchData();
      } else {
        toast.error(res.message || "Failed to delete export");
      }
    } catch (e) {
      toast.error("Server error deleting export");
    }
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkDeleteExports(selectedIds);
      if (res.status) {
        toast.success(`Successfully deleted ${selectedIds.length} export files.`);
        setSelectedIds([]);
        setIsBulkDeleteOpen(false);
        fetchData();
      } else {
        toast.error(res.message || "Failed to bulk delete files");
      }
    } catch (e) {
      toast.error("Server error during bulk delete");
    }
  };

  const handleBulkMove = async () => {
    if (selectedIds.length === 0) return;
    const destFolder = bulkTargetFolderId === "root" ? null : bulkTargetFolderId;
    try {
      const res = await bulkMoveExports(selectedIds, destFolder);
      if (res.status) {
        toast.success(`Successfully moved ${selectedIds.length} files.`);
        setSelectedIds([]);
        setIsBulkMoveOpen(false);
        fetchData();
      } else {
        toast.error(res.message || "Failed to move selected files");
      }
    } catch (e) {
      toast.error("Server error during bulk move");
    }
  };

  const handleBulkRename = async () => {
    if (selectedIds.length === 0 || !bulkRenameBaseName.trim()) return;
    try {
      const res = await bulkRenameExports(selectedIds, bulkRenameBaseName.trim());
      if (res.status) {
        toast.success(`Successfully renamed ${selectedIds.length} files sequentially.`);
        setSelectedIds([]);
        setIsBulkRenameOpen(false);
        setBulkRenameBaseName("");
        fetchData();
      } else {
        toast.error(res.message || "Failed to rename files");
      }
    } catch (e) {
      toast.error("Server error during bulk rename");
    }
  };

  // Direct File Opening
  const handlePreview = (exp: ExportHistory) => {
    const apiBase = getApiBaseUrl();
    const token = Cookies.get("accessToken");

    if (exp.fileName.endsWith(".pdf")) {
      // Direct open in new tab natively
      const url = `${apiBase}/export-history/${exp.id}/download?inline=true&token=${token}`;
      window.open(url, "_blank");
    } else if (exp.fileName.endsWith(".xlsx")) {
      // Direct open in Google Docs Viewer
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.includes("localtest.me");
      if (isLocal) {
        toast.warning("Google Sheets online previewer cannot access local files. Please download and view the Excel file locally.", {
          duration: 7000,
        });
        return;
      }
      const docUrl = `${apiBase}/export-history/${exp.id}/download?token=${token}`;
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(docUrl)}`;
      window.open(googleViewerUrl, "_blank");
    } else {
      // Fallback: download
      const url = `${apiBase}/export-history/${exp.id}/download?token=${token}`;
      window.open(url, "_blank");
    }

    // Increment download count locally
    setExportsList(prev => prev.map(item => item.id === exp.id ? { ...item, downloadCount: item.downloadCount + 1 } : item));
  };

  const handleDownload = (exp: ExportHistory) => {
    const apiBase = getApiBaseUrl();
    const token = Cookies.get("accessToken");
    const url = `${apiBase}/export-history/${exp.id}/download?token=${token}`;
    window.open(url, "_blank");
    setExportsList(prev => prev.map(item => item.id === exp.id ? { ...item, downloadCount: item.downloadCount + 1 } : item));
  };

  const formatBytes = (bytes: number | null, decimals = 2) => {
    if (bytes === null || bytes === undefined) return "Unknown size";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
            Export Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Access and organize all your previously generated Excel spreadsheets and PDF reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <FolderPlus className="h-4.5 w-4.5" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Folders */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            Folders
          </h2>
          
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setSelectedFolderId("all")}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
                selectedFolderId === "all"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="h-4.5 w-4.5 text-blue-500 fill-blue-500/10" />
                <span>All Exports</span>
              </div>
            </button>

            <button
              onClick={() => setSelectedFolderId("root")}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
                selectedFolderId === "root"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="h-4.5 w-4.5 text-slate-400" />
                <span>Root / Unsorted</span>
              </div>
            </button>

            <DropdownMenuSeparator className="my-2" />

            {folders.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 italic">No folders created yet</p>
            ) : (
              folders.map(folder => (
                <div
                  key={folder.id}
                  className={cn(
                    "group flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors",
                    selectedFolderId === folder.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="flex-1 flex items-center gap-2.5 text-left py-1"
                  >
                    <Folder className="h-4.5 w-4.5 text-amber-500 fill-amber-500/10" />
                    <span className="truncate max-w-[130px]">{folder.name}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted group-hover:bg-background px-1.5 py-0.5 rounded-full font-normal">
                      {folder._count?.exports ?? 0}
                    </span>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setFolderToRename(folder);
                        setRenameFolderName(folder.name);
                        setIsRenameFolderOpen(true);
                      }} className="gap-2">
                        <Edit className="h-3.5 w-3.5" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setFolderToDelete(folder);
                        setIsDeleteFolderOpen(true);
                      }} className="text-destructive focus:text-destructive gap-2">
                        <Trash2 className="h-3.5 w-3.5" /> Delete Folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Exports Table */}
        <div className="lg:col-span-3 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border">
            <form onSubmit={handleSearch} className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search exports by filename..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-background w-full"
              />
            </form>

            <div className="flex w-full md:w-auto items-center justify-end gap-2">
              <Button
                variant={isFavoriteOnly ? "default" : "outline"}
                onClick={() => setIsFavoriteOnly(!isFavoriteOnly)}
                className={cn(
                  "gap-2 w-full md:w-auto",
                  isFavoriteOnly && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                )}
              >
                <Star className={cn("h-4 w-4", isFavoriteOnly && "fill-current")} />
                {isFavoriteOnly ? "Showing Starred" : "Filter Starred"}
              </Button>
              <Button onClick={fetchData} variant="outline" className="w-full md:w-auto gap-2">
                <RefreshCw className={cn("h-4.5 w-4.5", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Floating Bulk selection bar */}
          {selectedIds.length > 0 && (
            <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold">{selectedIds.length} files selected</h4>
                  <p className="text-xs text-blue-100">Perform bulk actions on these exports</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setBulkTargetFolderId("root");
                    setIsBulkMoveOpen(true);
                  }}
                  variant="secondary"
                  className="bg-white/10 text-white hover:bg-white/20 border-0 h-9 text-xs"
                >
                  <Move className="h-3.5 w-3.5 mr-1" />
                  Move To
                </Button>
                <Button
                  onClick={() => {
                    setBulkRenameBaseName("");
                    setIsBulkRenameOpen(true);
                  }}
                  variant="secondary"
                  className="bg-white/10 text-white hover:bg-white/20 border-0 h-9 text-xs"
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Rename Seq.
                </Button>
                <Button
                  onClick={() => setIsBulkDeleteOpen(true)}
                  variant="destructive"
                  className="bg-rose-500 hover:bg-rose-600 text-white h-9 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
                <Button
                  onClick={() => setSelectedIds([])}
                  variant="ghost"
                  className="text-white hover:bg-white/10 h-9 w-9 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Exports Table */}
          <Card className="overflow-hidden border border-border">
            <CardContent className="p-0">
              {loading && exportsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 gap-3">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">Fetching history...</p>
                </div>
              ) : exportsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 gap-3 text-center">
                  <div className="p-4 bg-muted rounded-full">
                    <FileText className="h-10 w-10 text-muted-foreground opacity-60" />
                  </div>
                  <h3 className="font-semibold text-lg">No exports found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Generate new reports under the modules or create custom folders to organize exports.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[40px] pl-4">
                        <Checkbox
                          checked={selectedIds.length === exportsList.length && exportsList.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[30px]"></TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Folder</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead>Generated At</TableHead>
                      <TableHead className="w-[80px] text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportsList.map(exp => {
                      const isExcel = exp.fileName.endsWith(".xlsx");
                      const isPdf = exp.fileName.endsWith(".pdf");

                      return (
                        <TableRow
                          key={exp.id}
                          className={cn(
                            "hover:bg-muted/10 group",
                            selectedIds.includes(exp.id) && "bg-blue-50/40 dark:bg-blue-950/10"
                          )}
                        >
                          {/* Row Checkbox */}
                          <TableCell className="pl-4 py-3">
                            <Checkbox
                              checked={selectedIds.includes(exp.id)}
                              onCheckedChange={() => handleSelectRow(exp.id)}
                            />
                          </TableCell>

                          {/* Star Toggle */}
                          <TableCell className="py-3">
                            <button
                              onClick={() => handleToggleFavorite(exp)}
                              className="text-muted-foreground hover:text-amber-500 transition-colors"
                            >
                              <Star className={cn("h-4.5 w-4.5", exp.isFavorite ? "fill-amber-400 text-amber-400" : "opacity-30")} />
                            </button>
                          </TableCell>

                          {/* File Name */}
                          <TableCell className="font-medium max-w-[250px] truncate">
                            <div className="flex items-center gap-2">
                              {isExcel ? (
                                <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                              ) : isPdf ? (
                                <FileText className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                              ) : (
                                <FileText className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                              )}
                              <button
                                onClick={() => handlePreview(exp)}
                                className="truncate block font-medium hover:underline text-left hover:text-blue-600 dark:hover:text-blue-400"
                                title="Click to view file in new tab"
                              >
                                {exp.fileName}
                              </button>
                            </div>
                            <span className="text-[10px] text-muted-foreground block font-normal ml-6.5 mt-0.5">
                              {exp.moduleName.replace(/_/g, " ")}
                            </span>
                          </TableCell>

                          {/* Folder */}
                          <TableCell>
                            {exp.folder ? (
                              <Badge variant="outline" className="bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 gap-1 font-normal py-0.5 px-2">
                                <Folder className="h-3 w-3 fill-amber-500/10" />
                                {exp.folder.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs italic font-normal">Root</span>
                            )}
                          </TableCell>

                          {/* Size */}
                          <TableCell className="text-xs text-muted-foreground">
                            {formatBytes(exp.fileSize)}
                          </TableCell>

                          {/* Downloads */}
                          <TableCell className="text-xs text-muted-foreground">
                            {exp.downloadCount} downloads
                          </TableCell>

                          {/* Date */}
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(exp.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right pr-4">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                onClick={() => handlePreview(exp)}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                title="Review file in a new tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>

                              <Button
                                onClick={() => handleDownload(exp)}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                title="Download file"
                              >
                                <Download className="h-4 w-4" />
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>File Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    setExportToRename(exp);
                                    setRenameExportName(exp.fileName);
                                    setIsRenameExportOpen(true);
                                  }} className="gap-2">
                                    <Edit className="h-4 w-4" /> Rename Export
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setExportToMove(exp);
                                    setTargetFolderId(exp.folderId || "root");
                                    setIsMoveExportOpen(true);
                                  }} className="gap-2">
                                    <Move className="h-4 w-4" /> Move to Folder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteExport(exp.id)} className="text-destructive focus:text-destructive gap-2">
                                    <Trash2 className="h-4 w-4" /> Delete File
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CREATE FOLDER DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Export Folder</DialogTitle>
            <DialogDescription>
              Organize related reports into folders to easily find them later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="e.g. Finance Reports Q2"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RENAME FOLDER DIALOG */}
      <Dialog open={isRenameFolderOpen} onOpenChange={setIsRenameFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Choose a new name for your folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rename-folder-name">Folder Name</Label>
              <Input
                id="rename-folder-name"
                value={renameFolderName}
                onChange={e => setRenameFolderName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRenameFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRenameFolderOpen(false);
              setFolderToRename(null);
            }}>Cancel</Button>
            <Button onClick={handleRenameFolder} disabled={!renameFolderName.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE FOLDER DIALOG */}
      <Dialog open={isDeleteFolderOpen} onOpenChange={setIsDeleteFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              Delete Folder
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete folder <span className="font-semibold text-foreground">"{folderToDelete?.name}"</span>?
              All exports stored in this folder will be unlinked and preserved in the main Root directory.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {
              setIsDeleteFolderOpen(false);
              setFolderToDelete(null);
            }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteFolder}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RENAME EXPORT DIALOG */}
      <Dialog open={isRenameExportOpen} onOpenChange={setIsRenameExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Export File</DialogTitle>
            <DialogDescription>
              Specify a new display name for the export file. The original file extension will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="export-name">New Filename</Label>
              <Input
                id="export-name"
                value={renameExportName}
                onChange={e => setRenameExportName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRenameExport()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRenameExportOpen(false);
              setExportToRename(null);
            }}>Cancel</Button>
            <Button onClick={handleRenameExport} disabled={!renameExportName.trim()}>Save Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MOVE EXPORT DIALOG */}
      <Dialog open={isMoveExportOpen} onOpenChange={setIsMoveExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move File to Folder</DialogTitle>
            <DialogDescription>
              Select the destination folder for <span className="font-semibold text-foreground">"{exportToMove?.fileName}"</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dest-folder">Destination Folder</Label>
              <select
                id="dest-folder"
                value={targetFolderId}
                onChange={e => setTargetFolderId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="root">Root / Unsorted</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsMoveExportOpen(false);
              setExportToMove(null);
            }}>Cancel</Button>
            <Button onClick={handleMoveExport}>Move File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK MOVE DIALOG */}
      <Dialog open={isBulkMoveOpen} onOpenChange={setIsBulkMoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Selected Files</DialogTitle>
            <DialogDescription>
              Move {selectedIds.length} selected files to a destination folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-dest-folder">Destination Folder</Label>
              <select
                id="bulk-dest-folder"
                value={bulkTargetFolderId}
                onChange={e => setBulkTargetFolderId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="root">Root / Unsorted</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkMoveOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkMove}>Move Files</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK RENAME DIALOG */}
      <Dialog open={isBulkRenameOpen} onOpenChange={setIsBulkRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sequential Rename</DialogTitle>
            <DialogDescription>
              Rename {selectedIds.length} files sequentially. They will be saved as "BaseName (1).ext", "BaseName (2).ext", etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-rename-basename">Base Name</Label>
              <Input
                id="bulk-rename-basename"
                placeholder="e.g. Sales Report 2026"
                value={bulkRenameBaseName}
                onChange={e => setBulkRenameBaseName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleBulkRename()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkRename} disabled={!bulkRenameBaseName.trim()}>Rename Files</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK DELETE CONFIRM DIALOG */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete these {selectedIds.length} selected files? This action cannot be undone and will delete the files from the server.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Delete Files</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
