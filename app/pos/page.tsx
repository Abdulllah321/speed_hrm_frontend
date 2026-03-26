"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ShoppingCart,
    Receipt,
    Users,
    DollarSign,
    TrendingUp,
    Package,
    Zap,
    BarChart3,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    PackageCheck,
    RotateCcw,
} from "lucide-react";
import Link from "next/link";

export default function PosPage() {
    // Mock data - replace with actual data
    const stats = [
        {
            title: "Today's Sales",
            value: "$12,450.50",
            change: "+12.5%",
            trend: "up",
            icon: DollarSign,
            color: "from-green-500 to-emerald-600",
        },
        {
            title: "Transactions",
            value: "156",
            change: "+8.2%",
            trend: "up",
            icon: Receipt,
            color: "from-blue-500 to-cyan-600",
        },
        {
            title: "Customers Served",
            value: "124",
            change: "+5.3%",
            trend: "up",
            icon: Users,
            color: "from-purple-500 to-pink-600",
        },
        {
            title: "Avg. Transaction",
            value: "$79.81",
            change: "+3.1%",
            trend: "up",
            icon: TrendingUp,
            color: "from-orange-500 to-red-600",
        },
    ];

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
            title: "Quick Sale",
            description: "Fast checkout for regular items",
            icon: Zap,
            href: "/pos/quick-sale",
            color: "from-green-600 to-teal-600",
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
            href: "/pos/inventory/view", // Updated from /pos/stock to match existing route
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

    const recentOrders = [
        {
            id: "#ORD-1234",
            customer: "John Doe",
            items: 5,
            amount: "$245.00",
            status: "completed",
            time: "2 min ago",
        },
        {
            id: "#ORD-1233",
            customer: "Jane Smith",
            items: 3,
            amount: "$89.50",
            status: "completed",
            time: "8 min ago",
        },
        {
            id: "#ORD-1232",
            customer: "Mike Johnson",
            items: 7,
            amount: "$456.75",
            status: "pending",
            time: "15 min ago",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Point of Sale</h1>
                <p className="text-muted-foreground">
                    Welcome to your POS dashboard. Ready to serve your customers.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </p>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {stat.change} from yesterday
                                </p>
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
                    <div className="divide-y">
                        {recentOrders.map((order) => (
                            <div
                                key={order.id}
                                className="p-4 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{order.id}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {order.customer}
                                            </span>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                                            <Package className="h-4 w-4" />
                                            <span>{order.items} items</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold">{order.amount}</span>
                                        <div className="flex items-center gap-2">
                                            {order.status === "completed" ? (
                                                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Completed
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                        <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {order.time}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Session Info */}
            <Card className="p-6 bg-linear-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-lg">Current Session</h3>
                        <p className="text-sm text-muted-foreground">
                            Started at 9:00 AM • 8 hours ago
                        </p>
                    </div>
                    <Button className="bg-linear-to-r from-blue-600 to-purple-600" asChild>
                        <Link href="/pos/close">
                            Close Register
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                    </Button>
                </div>
            </Card>
        </div>
    );
}
