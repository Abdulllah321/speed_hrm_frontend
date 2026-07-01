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
} from "@/lib/actions/exports-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowRight,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl, cn } from "@/lib/utils";
import Cookies from "js-cookie";
import * as XLSX from "xlsx";

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

export default function ExportCenterPage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<ExportFolder[]>([]);
  const [exportsList, setExportsList] = useState<ExportHistory[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all"); // 'all', 'root', or folder UUID
  const [isFavoriteOnly, setIsFavoriteOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal control states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<ExportFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<ExportFolder | null>(null);

  const [isRenameExportOpen, setIsRenameExportOpen] = useState(false);
  const [exportToRename, setExportToRename] = useState<ExportHistory | null>(null);
  const [renameExportName, setRenameExportName] = useState("");

  const [isMoveExportOpen, setIsMoveExportOpen] = useState(false);
  const [exportToMove, setExportToMove] = useState<ExportHistory | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>("root");

  // Excel/PDF Online Preview States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewExport, setPreviewExport] = useState<ExportHistory | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [sheetData, setSheetData] = useState<Record<string, any[][]> | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");


  // Load basic folders and files
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
  }, [selectedFolderId, isFavoriteOnly]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const exportsRes = await getExports({
        folderId: selectedFolderId === "all" ? undefined : (selectedFolderId === "root" ? null : selectedFolderId),
        isFavorite: isFavoriteOnly ? true : undefined,
        search: searchQuery || undefined,
      });
      if (exportsRes.status) {
        setExportsList(exportsRes.data);
      }
    } catch (e) {
      toast.error("Search failed");
    } finally {
      setLoading(false);
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

  // Export File modification handlers
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
    if (!confirm("Are you sure you want to permanently delete this export history record and its file from server disk?")) return;
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

  // Download Handler
  const handleDownload = (exp: ExportHistory) => {
    const apiBase = getApiBaseUrl();
    const token = Cookies.get("accessToken");
    // Direct link with token to allow download
    const url = `${apiBase}/export-history/${exp.id}/download?token=${token}`;
    window.open(url, "_blank");
    // Increment local download count immediately for snappy UX
    setExportsList(prev => prev.map(item => item.id === exp.id ? { ...item, downloadCount: item.downloadCount + 1 } : item));
  };

  // Preview File Handler
  const handleOpenPreview = async (exp: ExportHistory) => {
    setPreviewExport(exp);
    setIsPreviewOpen(true);

    if (exp.fileName.endsWith(".xlsx")) {
      setIsLoadingPreview(true);
      setSheetData(null);
      setSheetNames([]);
      setActiveSheet("");
      try {
        const baseUrl = getApiBaseUrl();
        const token = Cookies.get("accessToken");
        const res = await fetch(`${baseUrl}/export-history/${exp.id}/download`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch excel file");
        const buffer = await res.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const dataMap: Record<string, any[][]> = {};
        wb.SheetNames.forEach(name => {
          const ws = wb.Sheets[name];
          dataMap[name] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        });
        setSheetData(dataMap);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          setActiveSheet(wb.SheetNames[0]);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse Excel file for preview");
      } finally {
        setIsLoadingPreview(false);
      }
    }
  };

  // Formats file sizes
  const formatBytes = (bytes: number | null, decimals = 2) => {
    if (bytes === null || bytes === undefined) return "Unknown size";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Convert column indices to Excel column labels (0 -> A, 1 -> B, etc.)
  function getExcelColumnLabel(index: number): string {
    let label = "";
    let temp = index;
    while (temp >= 0) {
      label = String.fromCharCode((temp % 26) + 65) + label;
      temp = Math.floor(temp / 26) - 1;
    }
    return label;
  }

  // Live Cloud Office URLs helper
  const getCloudViewerUrl = (type: "google" | "microsoft", exp: ExportHistory) => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.includes("localtest.me");
    if (isLocal) {
      return "local-error";
    }

    const apiBase = getApiBaseUrl();
    const token = Cookies.get("accessToken");
    const docUrl = `${apiBase}/export-history/${exp.id}/download?token=${token}`;

    if (type === "google") {
      return `https://docs.google.com/gview?url=${encodeURIComponent(docUrl)}&embedded=true`;
    } else {
      return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(docUrl)}`;
    }
  };

  const handleCloudViewerClick = (type: "google" | "microsoft", exp: ExportHistory) => {
    const url = getCloudViewerUrl(type, exp);
    if (url === "local-error") {
      toast.warning("Google/Microsoft cloud viewers cannot access files served on localhost. Please use the built-in browser Spreadsheet preview below or download the file.", {
        duration: 8000,
      });
      return;
    }
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
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
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Folders Sidebar, Right Files Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Folders View */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            Folders
          </h2>
          
          <div className="flex flex-col gap-1">
            {/* All Files button */}
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

            {/* Root Files button */}
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

            {/* Custom Folders list */}
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
          {/* Filter Toolbar */}
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
              <Button onClick={fetchData} variant="outline" className="w-full md:w-auto">
                Refresh
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <Card className="overflow-hidden border border-border">
            <CardContent className="p-0">
              {loading ? (
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
                    {isFavoriteOnly
                      ? "You haven't marked any export files as favorite in this directory."
                      : "Generate new reports under the modules or create custom folders to organize exports."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[30px]"></TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Folder</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead>Generated At</TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportsList.map(exp => {
                      const isExcel = exp.fileName.endsWith(".xlsx");
                      const isPdf = exp.fileName.endsWith(".pdf");

                      return (
                        <TableRow key={exp.id} className="hover:bg-muted/10 group">
                          {/* Favorite Star */}
                          <TableCell className="py-3">
                            <button
                              onClick={() => handleToggleFavorite(exp)}
                              className="text-muted-foreground hover:text-amber-500 transition-colors"
                            >
                              <Star className={cn("h-4.5 w-4.5", exp.isFavorite ? "fill-amber-400 text-amber-400" : "opacity-30")} />
                            </button>
                          </TableCell>

                          {/* File Name & Module */}
                          <TableCell className="font-medium max-w-[250px] truncate">
                            <div className="flex items-center gap-2">
                              {isExcel ? (
                                <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                              ) : isPdf ? (
                                <FileText className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                              ) : (
                                <FileText className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                              )}
                              <span className="truncate block font-medium" title={exp.fileName}>
                                {exp.fileName}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground block font-normal ml-6.5 mt-0.5">
                              {exp.moduleName.replace(/_/g, " ")}
                            </span>
                          </TableCell>

                          {/* Folder Name */}
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
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                onClick={() => handleOpenPreview(exp)}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                title="Preview file online"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                onClick={() => handleDownload(exp)}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                title="Download copy"
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

      {/* PREVIEW DIALOG */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-5xl h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {previewExport?.fileName.endsWith(".xlsx") ? (
                    <FileSpreadsheet className="h-5.5 w-5.5 text-emerald-500" />
                  ) : (
                    <FileText className="h-5.5 w-5.5 text-rose-500" />
                  )}
                  {previewExport?.fileName}
                </DialogTitle>
                <DialogDescription>
                  Live online preview of this export.
                </DialogDescription>
              </div>
              
              {/* Cloud Office Open buttons (only for Excel sheets) */}
              {previewExport?.fileName.endsWith(".xlsx") && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCloudViewerClick("microsoft", previewExport)}
                    className="h-8 text-xs gap-1 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-300 dark:bg-blue-950/20"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Excel Online Live
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCloudViewerClick("google", previewExport)}
                    className="h-8 text-xs gap-1 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:bg-emerald-950/20"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Google Sheets
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Preview Content Area */}
          <div className="flex-1 min-h-0 py-4 overflow-hidden relative">
            {isLoadingPreview ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Parsing spreadsheet data...</p>
              </div>
            ) : previewExport?.fileName.endsWith(".xlsx") ? (
              /* Excel SheetJS Render */
              <div className="h-full flex flex-col gap-3">
                {sheetNames.length > 1 && (
                  <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-md shrink-0">
                    {sheetNames.map(name => (
                      <button
                        key={name}
                        onClick={() => setActiveSheet(name)}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-sm transition-colors",
                          activeSheet === name
                            ? "bg-background text-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="flex-1 min-h-0 overflow-auto border border-border rounded-xl shadow-inner bg-card">
                  {sheetData && activeSheet && sheetData[activeSheet] ? (
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-muted/80 sticky top-0 z-10 border-b border-border shadow-xs">
                          <th className="border-r border-b border-border p-1 w-10 text-[10px] font-mono font-normal text-muted-foreground text-center bg-muted/80 sticky left-0 z-20">#</th>
                          {Array.from({
                            length: Math.max(...sheetData[activeSheet].map(row => row.length), 0)
                          }).map((_, idx) => (
                            <th key={idx} className="border-r border-b border-border p-1.5 text-center text-[10px] font-mono font-bold text-muted-foreground bg-muted/80 min-w-[120px]">
                              {getExcelColumnLabel(idx)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheetData[activeSheet].length === 0 ? (
                          <tr>
                            <td colSpan={100} className="p-8 text-center text-muted-foreground italic">
                              Sheet is empty
                            </td>
                          </tr>
                        ) : (
                          sheetData[activeSheet].map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-muted/30 border-b border-border">
                              <td className="border-r border-border p-1 text-center font-mono text-[10px] text-muted-foreground bg-muted/30 sticky left-0 z-10">{rIdx + 1}</td>
                              {Array.from({
                                length: Math.max(...sheetData[activeSheet].map(r => r.length), 0)
                              }).map((_, cIdx) => (
                                <td key={cIdx} className="border-r border-border p-2 whitespace-nowrap text-xs font-normal">
                                  {row[cIdx] !== undefined ? String(row[cIdx]) : ""}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center justify-center h-full p-8 text-muted-foreground italic">
                      No sheet data available
                    </div>
                  )}
                </div>
              </div>
            ) : previewExport?.fileName.endsWith(".pdf") ? (
              /* PDF iframe render with inline stream */
              <div className="w-full h-full border border-border rounded-xl overflow-hidden bg-muted/10">
                <iframe
                  src={`${getApiBaseUrl()}/export-history/${previewExport.id}/download?inline=true#toolbar=0`}
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <Info className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">Built-in browser preview is not supported for this file format.</p>
                <Button onClick={() => previewExport && handleDownload(previewExport)} className="gap-2 mt-2">
                  <Download className="h-4 w-4" /> Download File to View
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => {
              setIsPreviewOpen(false);
              setPreviewExport(null);
            }}>Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
