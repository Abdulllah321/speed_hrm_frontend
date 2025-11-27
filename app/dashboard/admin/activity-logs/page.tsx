"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Printer, Download, RefreshCw, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface ActivityLog {
  id: number;
  userId: number | null;
  user: { id: number; email: string; firstName: string; lastName: string } | null;
  action: string;
  module: string | null;
  entity: string | null;
  entityId: string | null;
  description: string | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface PaginationData {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const actionColors: Record<string, string> = {
  login: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  logout: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  create: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  update: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  password_change: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

const modules = ["auth", "employees", "departments", "payroll", "leaves", "attendance", "roles", "users"];
const actions = ["login", "logout", "create", "update", "delete", "password_change", "logout_all_devices"];

export default function ActivityLogsPage() {
  const [data, setData] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // In real app, call API
      // const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      // if (actionFilter) params.append('action', actionFilter);
      // if (moduleFilter) params.append('module', moduleFilter);
      // if (startDate) params.append('startDate', startDate);
      // if (endDate) params.append('endDate', endDate);
      // const res = await fetch(`/api/auth/activity-logs?${params}`);
      // const result = await res.json();
      // setData(result.data);

      // Sample data
      setData({
        logs: [
          { id: 1, userId: 1, user: { id: 1, email: "admin@company.com", firstName: "Admin", lastName: "User" }, action: "login", module: "auth", entity: null, entityId: null, description: "User logged in", oldValues: null, newValues: null, ipAddress: "192.168.1.100", userAgent: "Mozilla/5.0", status: "success", errorMessage: null, createdAt: new Date().toISOString() },
          { id: 2, userId: 1, user: { id: 1, email: "admin@company.com", firstName: "Admin", lastName: "User" }, action: "create", module: "employees", entity: "Employee", entityId: "5", description: "Created employee: Ahmed Khan", oldValues: null, newValues: '{"name":"Ahmed Khan"}', ipAddress: "192.168.1.100", userAgent: "Mozilla/5.0", status: "success", errorMessage: null, createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: 3, userId: 2, user: { id: 2, email: "hr@company.com", firstName: "HR", lastName: "Manager" }, action: "update", module: "employees", entity: "Employee", entityId: "3", description: "Updated employee: Sara Ali", oldValues: '{"status":"active"}', newValues: '{"status":"inactive"}', ipAddress: "192.168.1.101", userAgent: "Mozilla/5.0", status: "success", errorMessage: null, createdAt: new Date(Date.now() - 7200000).toISOString() },
          { id: 4, userId: 1, user: { id: 1, email: "admin@company.com", firstName: "Admin", lastName: "User" }, action: "delete", module: "departments", entity: "Department", entityId: "2", description: "Deleted department: Marketing", oldValues: '{"name":"Marketing"}', newValues: null, ipAddress: "192.168.1.100", userAgent: "Mozilla/5.0", status: "success", errorMessage: null, createdAt: new Date(Date.now() - 10800000).toISOString() },
          { id: 5, userId: null, user: null, action: "login", module: "auth", entity: null, entityId: null, description: "Login failed", oldValues: null, newValues: null, ipAddress: "192.168.1.200", userAgent: "Mozilla/5.0", status: "failure", errorMessage: "Invalid password", createdAt: new Date(Date.now() - 14400000).toISOString() },
          { id: 6, userId: 1, user: { id: 1, email: "admin@company.com", firstName: "Admin", lastName: "User" }, action: "password_change", module: "auth", entity: null, entityId: null, description: "Password changed", oldValues: null, newValues: null, ipAddress: "192.168.1.100", userAgent: "Mozilla/5.0", status: "success", errorMessage: null, createdAt: new Date(Date.now() - 18000000).toISOString() },
          { id: 7, userId: 2, user: { id: 2, email: "hr@company.com", firstName: "HR", lastName: "Manager" }, action: "logout", module: "auth", entity: null, entityId: null, description: "User logged out", oldValues: null, newValues: null, ipAddress: "192.168.1.101", userAgent: "Mozilla/5.0", status: "success", errorMessage: null, createdAt: new Date(Date.now() - 21600000).toISOString() },
        ],
        total: 7,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    } catch (error) {
      toast.error("Failed to fetch activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, moduleFilter, startDate, endDate]);

  const filteredLogs = data?.logs.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.user?.email.toLowerCase().includes(searchLower) ||
      log.user?.firstName.toLowerCase().includes(searchLower) ||
      log.description?.toLowerCase().includes(searchLower) ||
      log.ipAddress?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Activity Logs</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ddd;padding:4px;text-align:left}th{background:#f4f4f4}h1{text-align:center}</style>
      </head><body><h1>Activity Logs</h1>
      <table><thead><tr><th>Date/Time</th><th>User</th><th>Action</th><th>Module</th><th>Description</th><th>IP Address</th><th>Status</th></tr></thead>
      <tbody>${filteredLogs.map((log) => `<tr><td>${new Date(log.createdAt).toLocaleString()}</td><td>${log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}</td><td>${log.action}</td><td>${log.module || '-'}</td><td>${log.description || '-'}</td><td>${log.ipAddress || '-'}</td><td>${log.status}</td></tr>`).join("")}</tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportCSV = () => {
    const headers = ["Date/Time", "User", "Email", "Action", "Module", "Entity", "Description", "IP Address", "Status", "Error"];
    const rows = filteredLogs.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.user ? `${log.user.firstName} ${log.user.lastName}` : "System",
      log.user?.email || "",
      log.action,
      log.module || "",
      log.entity ? `${log.entity}:${log.entityId}` : "",
      log.description || "",
      log.ipAddress || "",
      log.status,
      log.errorMessage || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `activity_logs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("CSV exported");
  };

  const clearFilters = () => {
    setSearch("");
    setActionFilter("");
    setModuleFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Activity Logs</h2>
          <p className="text-muted-foreground">Monitor all system activities and user actions</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue placeholder="All Actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger><SelectValue placeholder="All Modules" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Modules</SelectItem>
                {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" placeholder="Start Date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" placeholder="End Date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Logs ({data?.total || 0} total)</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrint} title="Print"><Printer className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={handleExportCSV} title="Export CSV"><Download className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No activity logs found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Date/Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <div>
                              <div className="font-medium">{log.user.firstName} {log.user.lastName}</div>
                              <div className="text-xs text-muted-foreground">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-800"}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.module || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate" title={log.description || ""}>
                          {log.description || "-"}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{log.ipAddress || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === "success" ? "default" : "destructive"}>
                            {log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.page} of {data.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

