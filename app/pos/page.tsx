"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ShoppingCart,
    Receipt,
    Users,
    DollarSign,
    TrendingUp,
    Package,
    BarChart3,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    PackageCheck,
    RotateCcw,
    RefreshCw,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { authFetch } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────────────────────

interface SalesOrder {
    id: string;
    orderNumber: string;
    grandTotal: string | number;
    cashAmount: string | number;
    cardAmount: string | number;
    status: string;
    createdAt: string;
    customerId?: string | null;
    items: { id: string }[];
}

interface SessionMetrics {
    openingFloat: number;
    cashSales: number;
    expectedCash: number;
}

interface SessionData {
    session: {
        id: string;
        openedAt: string;
        status: string;
    };
    metrics: SessionMetrics;
    isDrawerOpen: boolean;
}

interface DashboardStats {
    todaySales: number;
    transactions: number;
    customersServed: number;
    avgTransaction: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(value);
}

function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

function sessionDuration(openedAt: string) {
    const diff = Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000 / 60);
    if (diff < 60) return `${diff} min ago`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m > 0 ? `${m}m` : ""} ago`;
}

// ── Quick actions config ─────────────────────────────────────────────────────

const quickActions = [
    {
        title: "New Sale",
        description: "Start a new transaction",
        icon: ShoppingCart,
        href: "/pos/new-sale",
        color: "from-blue-600 to-purple-600",
        badge: "Ctrl+N",
    },
    {
        title: "Customer Lookup",
        description: "Search customer history",
        icon: Users,
        href: "/pos/customers",
        color: "from-purple-600 to-pink-600",
    },
    {
        title: "Stock Check",
        description: "View product availability",
        icon: Package,
        href: "/pos/inventory/view",
        color: "from-orange-600 to-red-600",
    },
    {
        title: "Stock Receiving",
        description: "Accept incoming transfers",
        icon: PackageCheck,
        href: "/pos/inventory/receiving",
        color: "from-indigo-600 to-blue-600",
    },
    {
        title: "Return Requests",
        description: "Approve return requests",
        icon: RotateCcw,
        href: "/pos/inventory/returns",
        color: "from-orange-600 to-amber-600",
    },
    {
        title: "Outbound Transfers",
        description: "Approve outgoing transfers",
        icon: ArrowRight,
        href: "/pos/inventory/outbound",
        color: "from-blue-600 to-indigo-600",
    },
    {
        title: "Inbound Transfers",
        description: "Accept incoming transfers",
        icon: ArrowRight,
        href: "/pos/inventory/inbound",
        color: "from-green-600 to-emerald-600",
    },
    {
        title: "Reports",
        description: "View sales analytics",
        icon: BarChart3,
        href: "/pos/reports",
        color: "from-indigo-600 to-blue-600",
    },
    {
        title: "Session Summary",
        description: "Current session details",
        icon: Receipt,
        href: "/pos/session",
        color: "from-cyan-600 to-blue-600",
    },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function PosPage() {
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [session, setSession] = useState<SessionData | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const today = new Date().toISOString().split("T")[0];

            const [ordersRes, sessionRes] = await Promise.allSettled([
                authFetch(`/api/pos-sales/orders?limit=10&startDate=${today}&endDate=${today}`),
                authFetch(`/api/pos-session/current`),
            ]);

            // Orders
            if (ordersRes.status === "fulfilled" && ordersRes.value?.data) {
                const data: SalesOrder[] = ordersRes.value.data;
                setOrders(data);

                // Derive stats from today's completed orders
                const completed = data.filter((o) => o.status === "completed");
                const todaySales = completed.reduce(
                    (sum, o) => sum + Number(o.grandTotal ?? 0),
                    0
                );
                const uniqueCustomers = new Set(
                    completed.filter((o) => o.customerId).map((o) => o.customerId)
                ).size;

                setStats({
                    todaySales,
                    transactions: completed.length,
                    customersServed: uniqueCustomers,
                    avgTransaction: completed.length > 0 ? todaySales / completed.length : 0,
                });
            }

            // Session
            if (sessionRes.status === "fulfilled" && sessionRes.value) {
                setSession(sessionRes.value);
            }
        } catch (e) {
            setError("Failed to load dashboard data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const statCards = stats
        ? [
              {
                  title: "Today's Sales",
                  value: formatCurrency(stats.todaySales),
                  icon: DollarSign,
                  color: "from-green-500 to-emerald-600",
              },
              {
                  title: "Transactions",
                  value: String(stats.transactions),
                  icon: Receipt,
                  color: "from-blue-500 to-cyan-600",
              },
              {
                  title: "Customers Served",
                  value: String(stats.customersServed),
                  icon: Users,
                  color: "from-purple-500 to-pink-600",
              },
              {
                  title: "Avg. Transaction",
                  value: formatCurrency(stats.avgTransaction),
                  icon: TrendingUp,
                  color: "from-orange-500 to-red-600",
              },
          ]
        : [];

    const recentOrders = orders.slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Point of Sale</h1>
                    <p className="text-muted-foreground">
                        Welcome to your POS dashboard. Ready to serve your customers.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchData}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">Refresh</span>
                </Button>
            </div>

            {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">
                    {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {loading
                    ? Array.from({ length: 4 }).map((_, i) => (
                          <Card key={i} className="p-6 animate-pulse">
                              <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                              <div className="h-7 bg-muted rounded w-3/4" />
                          </Card>
                      ))
                    : statCards.map((stat) => (
                          <Card key={stat.title} className="p-6">
                              <div className="flex items-start justify-between">
                                  <div className="space-y-2">
                                      <p className="text-sm font-medium text-muted-foreground">
                                          {stat.title}
                                      </p>
                                      <p className="text-2xl font-bold">{stat.value}</p>
                                  </div>
                                  <div
                                      className={`p-3 rounded-lg bg-linear-to-br ${stat.color}`}
                                  >
                                      <stat.icon className="h-5 w-5 text-white" />
                                  </div>
                              </div>
                          </Card>
                      ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {quickActions.map((action) => (
                        <Link key={action.title} href={action.href}>
                            <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 hover:border-primary">
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`p-3 rounded-lg bg-linear-to-br ${action.color} group-hover:scale-110 transition-transform`}
                                    >
                                        <action.icon className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold">{action.title}</h3>
                                            {action.badge && (
                                                <span className="text-xs bg-muted px-2 py-1 rounded">
                                                    {action.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {action.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Orders */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Recent Orders</h2>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/pos/orders">
                            View All
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                    </Button>
                </div>
                <Card>
                    {loading ? (
                        <div className="divide-y">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="p-4 animate-pulse">
                                    <div className="flex justify-between">
                                        <div className="space-y-2">
                                            <div className="h-4 bg-muted rounded w-24" />
                                            <div className="h-3 bg-muted rounded w-32" />
                                        </div>
                                        <div className="h-4 bg-muted rounded w-16" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : recentOrders.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No orders today yet.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {recentOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="p-4 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {order.orderNumber}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {order.customerId ? "Customer" : "Walk-in"}
                                                </span>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                                                <Package className="h-4 w-4" />
                                                <span>{order.items?.length ?? 0} items</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-semibold">
                                                {formatCurrency(Number(order.grandTotal))}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {order.status === "completed" ? (
                                                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Completed
                                                    </span>
                                                ) : order.status === "void" ? (
                                                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Void
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                                        <AlertCircle className="h-3 w-3" />
                                                        {order.status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {timeAgo(order.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Session Info */}
            {!loading && (
                <Card className="p-6 bg-linear-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">Current Session</h3>
                            {session?.session ? (
                                <p className="text-sm text-muted-foreground">
                                    Started {sessionDuration(session.session.openedAt)} •{" "}
                                    Float: {formatCurrency(session.metrics.openingFloat)} •{" "}
                                    Cash Sales: {formatCurrency(session.metrics.cashSales)}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No active session found.
                                </p>
                            )}
                        </div>
                        <Button
                            className="bg-linear-to-r from-blue-600 to-purple-600"
                            asChild
                        >
                            <Link href="/pos/close">
                                Close Register
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}
