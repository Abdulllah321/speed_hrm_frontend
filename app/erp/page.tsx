"use client"
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  DollarSign,
  Package,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Download,
  Search,
  LayoutDashboard,
  BarChart3,
  RefreshCcw,
  Layers,
  ChevronRight,
  TrendingUp,
  Loader2,
  Zap,
  Target,
  BrainCircuit,
  Activity,
  PieChart as PieChartIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Line, LineChart as ReLineChart, 
  Area, AreaChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Scatter, ScatterChart, ZAxis
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth";
import { stockLedgerApi } from "@/lib/api";
import { toast } from "sonner";

// --- Advanced Mock Data for Analytics ---

const funnelData = [
  { stage: 'Prospects', value: 1200, fill: "var(--primary)" },
  { stage: 'Leads', value: 800, fill: "oklch(0.6721 0.1944 294.4928)" },
  { stage: 'Quotes', value: 450, fill: "oklch(0.8003 0.1821 151.7110)" },
  { stage: 'Orders', value: 280, fill: "oklch(0.7106 0.1661 22.2162)" },
  { stage: 'Fulfilled', value: 240, fill: "#10b981" },
];

const performanceRadarData = [
  { subject: 'Growth', A: 120, B: 110, fullMark: 150 },
  { subject: 'Retention', A: 98, B: 130, fullMark: 150 },
  { subject: 'Efficiency', A: 86, B: 130, fullMark: 150 },
  { subject: 'Margins', A: 99, B: 100, fullMark: 150 },
  { subject: 'Volume', A: 85, B: 90, fullMark: 150 },
  { subject: 'Support', A: 65, B: 85, fullMark: 150 },
];

const activityData = [
  { hourIdx: 0, dayIdx: 0, intensity: 20, hour: '08:00', day: 'Mon' },
  { hourIdx: 1, dayIdx: 0, intensity: 45, hour: '10:00', day: 'Mon' },
  { hourIdx: 2, dayIdx: 0, intensity: 80, hour: '12:00', day: 'Mon' },
  { hourIdx: 3, dayIdx: 0, intensity: 65, hour: '14:00', day: 'Mon' },
  { hourIdx: 4, dayIdx: 0, intensity: 40, hour: '16:00', day: 'Mon' },
  { hourIdx: 0, dayIdx: 2, intensity: 30, hour: '08:00', day: 'Wed' },
  { hourIdx: 1, dayIdx: 2, intensity: 55, hour: '10:00', day: 'Wed' },
  { hourIdx: 2, dayIdx: 2, intensity: 95, hour: '12:00', day: 'Wed' },
  { hourIdx: 3, dayIdx: 2, intensity: 75, hour: '14:00', day: 'Wed' },
  { hourIdx: 4, dayIdx: 2, intensity: 50, hour: '16:00', day: 'Wed' },
  { hourIdx: 0, dayIdx: 4, intensity: 25, hour: '08:00', day: 'Fri' },
  { hourIdx: 1, dayIdx: 4, intensity: 40, hour: '10:00', day: 'Fri' },
  { hourIdx: 2, dayIdx: 4, intensity: 70, hour: '12:00', day: 'Fri' },
  { hourIdx: 3, dayIdx: 4, intensity: 60, hour: '14:00', day: 'Fri' },
  { hourIdx: 4, dayIdx: 4, intensity: 35, hour: '16:00', day: 'Fri' },
];

const dayMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hourMap = ['08:00', '10:00', '12:00', '14:00', '16:00'];

const dummyInventoryData = [
  { id: "SKU-001", name: "Premium Wireless Headset", category: "Electronics", qty: 45, status: "In Stock" },
  { id: "SKU-002", name: "Ergonomic Office Chair", category: "Furniture", qty: 12, status: "Low Stock" },
  { id: "SKU-003", name: "USB-C Fast Charger", category: "Electronics", qty: 150, status: "In Stock" },
  { id: "SKU-004", name: "Minimalist Desk Lamp", category: "Appliance", qty: 0, status: "Out of Stock" },
  { id: "SKU-005", name: "Smart Watch Series 5", category: "Electronics", qty: 28, status: "In Stock" },
];

const dummyOverviewTransactions = [
  { id: "ORD-9921", name: "Sale - ORD-9921", cat: "Electronics", val: "$1,240.00" },
  { id: "ORD-9920", name: "Sale - ORD-9920", cat: "Furniture", val: "$450.00" },
  { id: "ORD-9919", name: "Sale - ORD-9919", cat: "Electronics", val: "$89.99" },
  { id: "ORD-9918", name: "Sale - ORD-9918", cat: "Groceries", val: "$210.50" },
  { id: "ORD-9917", name: "Sale - ORD-9917", cat: "Apparel", val: "$345.00" },
];

// --- Internal Components ---

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendType,
  highlight,
  loading,
  subValue
}: {
  title: string,
  value: string | number,
  icon: any,
  description: string,
  trend?: string,
  trendType?: 'up' | 'down' | 'neutral',
  highlight?: boolean,
  loading?: boolean,
  subValue?: string
}) {
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:border-primary/30",
      highlight && "border-primary/50 bg-primary/5"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2 rounded-lg transition-all duration-300 group-hover:scale-110",
          highlight ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-9 w-24 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black tracking-tight">{value}</div>
              {trend && (
                <div className={cn(
                  "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  trendType === 'up' ? "text-green-600 bg-green-50" : trendType === 'down' ? "text-red-600 bg-red-50" : "text-blue-600 bg-blue-50"
                )}>
                  {trendType === 'up' ? <ArrowUpRight className="h-3 w-3" /> : trendType === 'down' ? <ArrowDownRight className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                  {trend}
                </div>
              )}
            </div>
            {subValue && <div className="text-xs font-bold text-primary/70 mt-0.5">{subValue}</div>}
          </>
        )}
        <p className="text-[11px] text-muted-foreground font-medium mt-1 leading-none opacity-80">
          {description}
        </p>
      </CardContent>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
    </Card>
  );
}

const ERPDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [orders, setOrders] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, stockRes] = await Promise.all([
        authFetch("/pos-sales/orders", { params: { limit: 1000 } }),
        stockLedgerApi.getLevels()
      ]);

      if (ordersRes.ok && ordersRes.data?.status) {
        setOrders(ordersRes.data.data || []);
      }
      if (stockRes) {
        setStockLevels(stockRes || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Derived Data ---

  const kpis = useMemo(() => {
    const hasOrders = orders.length > 0;
    const hasStock = stockLevels.length > 0;

    const totalRevenue = hasOrders 
      ? orders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0)
      : 125430; // Dummy fallback

    const activeUsers = hasOrders 
      ? new Set(orders.map(o => o.customerId).filter(Boolean)).size
      : 842; // Dummy fallback

    const totalOrders = hasOrders ? orders.length : 1240;

    const inventoryValue = hasStock 
      ? stockLevels.reduce((sum, level) => sum + (Number(level.totalQty || 0) * 0), 0)
      : 245000; // Dummy fallback

    return {
      totalRevenue: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
      activeUsers: activeUsers.toLocaleString(),
      inventoryValue: `$${inventoryValue.toLocaleString()}`,
      totalOrders: totalOrders.toLocaleString(),
      inventoryCount: hasStock ? stockLevels.length : 156
    };
  }, [orders, stockLevels]);

  const revenueTrendData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const result: { label: string, revenue: number, profit: number }[] = [];

    // If no orders, return dummy trend
    if (orders.length === 0 && !loading) {
       return [
          { label: "Apr", revenue: 45000, profit: 12000 },
          { label: "May", revenue: 52000, profit: 15000 },
          { label: "Jun", revenue: 48000, profit: 11000 },
          { label: "Jul", revenue: 61000, profit: 19000 },
          { label: "Aug", revenue: 55000, profit: 14000 },
          { label: "Sep", revenue: 72000, profit: 22000 },
       ];
    }

    const monthlyData: Record<string, { label: string, revenue: number, profit: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = months[d.getMonth()];
      monthlyData[label] = { label, revenue: 0, profit: 0 };
    }

    orders.forEach(order => {
      const d = new Date(order.createdAt);
      const label = months[d.getMonth()];
      if (monthlyData[label]) {
        monthlyData[label].revenue += Number(order.grandTotal || 0);
        monthlyData[label].profit += Number(order.grandTotal || 0) * 0.25;
      }
    });

    return Object.values(monthlyData);
  }, [orders, loading]);

  const categoryAggregation = useMemo(() => {
    const colors = [
      "var(--primary)",
      "oklch(0.6721 0.1944 294.4928)",
      "oklch(0.8003 0.1821 151.7110)",
      "oklch(0.7106 0.1661 22.2162)",
      "oklch(0.8077 0.1035 19.5706)"
    ];

    if (orders.length === 0 && !loading) {
      return [
        { name: "Electronics", value: 45, color: colors[0] },
        { name: "Furniture", value: 25, color: colors[1] },
        { name: "Appliance", value: 15, color: colors[2] },
        { name: "Groceries", value: 10, color: colors[3] },
        { name: "Others", value: 5, color: colors[4] },
      ];
    }

    const counts: Record<string, number> = {};
    orders.forEach(order => {
      order.items?.forEach((line: any) => {
        const cat = line.item?.category?.name || "Uncategorized";
        counts[cat] = (counts[cat] || 0) + Number(line.lineTotal || 0);
      });
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .map(([name, value], i) => ({
        name,
        value: Math.round((value / (total || 1)) * 100),
        color: colors[i % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [orders, loading]);

  const recentTransactions = useMemo(() => {
    if (orders.length === 0 && !loading) return dummyOverviewTransactions;
    return orders.slice(0, 5).map(order => ({
      id: order.orderNumber,
      name: `Sale - ${order.orderNumber}`,
      cat: order.items?.[0]?.item?.category?.name || "POS Sale",
      val: Number(order.grandTotal).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    }));
  }, [orders, loading]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Enterprise Analytics
            </h2>
          </div>
          <p className="text-muted-foreground">Strategic overview of your business infrastructure and performance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2 font-semibold">
            <Calendar className="h-4 w-4" />
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm" className="gap-2 font-semibold">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-1 mb-6">
          <TabsList variant="underline" color="primary" className="bg-transparent border-none p-0 overflow-x-auto">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="h-4 w-4" />
              Inventory
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search records..." className="pl-9 h-8 bg-muted/20 border-border" />
            </div>
            <Button variant="ghost" size="icon-sm" onClick={fetchData} disabled={loading}>
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        <div className="animate-in fade-in duration-500">
          <TabsContent value="overview" className="m-0 space-y-6">
            {/* KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Revenue"
                value={kpis.totalRevenue}
                icon={DollarSign}
                description="Gross sales from POS"
                trend="Live"
                trendType="up"
                highlight
                loading={loading}
              />
              <StatsCard
                title="Active Customers"
                value={kpis.activeUsers}
                icon={Users}
                description="Unique purchasers"
                trend="Stable"
                trendType="up"
                loading={loading}
              />
              <StatsCard
                title="Inventory Items"
                value={kpis.inventoryCount}
                icon={Package}
                description="Unique SKUs in stock"
                trend="Updated"
                trendType="up"
                loading={loading}
              />
              <StatsCard
                title="Total Orders"
                value={kpis.totalOrders}
                icon={ShoppingCart}
                description="Combined transaction count"
                trend="Active"
                trendType="up"
                loading={loading}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-12">
              {/* Main Analytics Section */}
              <div className="md:col-span-8 space-y-6">
                <Card className="transition-all hover:shadow-lg border-border/50 overflow-hidden min-h-[400px]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">Performance Matrix</CardTitle>
                        <CardDescription>Revenue vs Estimated Profit (6 Months)</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="h-[280px] w-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <ChartContainer config={{
                        revenue: { label: "Revenue", color: "var(--primary)" },
                        profit: { label: "Est. Profit", color: "#10b981" }
                      }} className="h-[280px] w-full">
                        <ReLineChart data={revenueTrendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={10} fontWeight={500} dy={10} />
                          <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight={500} tickFormatter={(v) => `$${v}`} />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </ReLineChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Assets Table */}
                <Card className="border-border/50 shadow-sm overflow-hidden min-h-[400px]">
                  <CardHeader className="bg-muted/5 border-b py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg font-bold">Recent Transactions</CardTitle>
                      </div>
                      <button className="text-xs font-bold text-primary hover:underline group flex items-center gap-1">
                        View All <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-muted/30 text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-b">
                          <tr>
                            <th className="px-6 py-4">Entity ID</th>
                            <th className="px-6 py-4">Transaction Name</th>
                            <th className="px-6 py-4">Allocation</th>
                            <th className="px-6 py-4 text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                              <tr key={i}>
                                <td className="px-6 py-4"><div className="h-4 w-16 bg-muted animate-pulse rounded" /></td>
                                <td className="px-6 py-4"><div className="h-4 w-32 bg-muted animate-pulse rounded" /></td>
                                <td className="px-6 py-4"><div className="h-4 w-20 bg-muted animate-pulse rounded" /></td>
                                <td className="px-6 py-4"><div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto" /></td>
                              </tr>
                            ))
                          ) : recentTransactions.length > 0 ? (
                            recentTransactions.map((item) => (
                              <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs font-black text-primary">{item.id}</td>
                                <td className="px-6 py-4 text-sm font-bold">{item.name}</td>
                                <td className="px-6 py-4">
                                  <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.cat}</Badge>
                                </td>
                                <td className="px-6 py-4 text-sm font-black text-right">{item.val}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium">
                                No recent transactions found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Column */}
              <div className="md:col-span-4 space-y-6">
                <Card className="transition-all hover:shadow-md border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold">Category Distribution</CardTitle>
                    <CardDescription>Sales share by item category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-[250px] w-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        <ChartContainer config={{}} className="h-[250px] w-full">
                          <PieChart>
                            <Pie
                              data={categoryAggregation}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {categoryAggregation.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ChartContainer>
                        <div className="grid gap-2 mt-4">
                          {categoryAggregation.slice(0, 5).map((item) => (
                            <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-xs font-bold text-muted-foreground line-clamp-1">{item.name}</span>
                              </div>
                              <span className="text-xs font-black">{item.value}%</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Strategic Insight
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Based on {orders.length} transactions, your average order value is <span className="text-primary font-bold">
                        ${orders.length > 0 ? (orders.reduce((s, o) => s + Number(o.grandTotal), 0) / orders.length).toFixed(2) : "0.00"}
                      </span>. 
                      Most sales occur in the <span className="text-primary font-bold">{categoryAggregation[0]?.name || "N/A"}</span> category.
                    </p>
                    <Button size="sm" className="w-full text-xs font-bold" onClick={fetchData}>Refresh Insights</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="m-0 space-y-6">
            {/* Advanced KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Forecasted Revenue"
                value="$1.42M"
                icon={BrainCircuit}
                description="AI-driven projection for next month"
                trend="+15.2%"
                trendType="up"
                subValue="98.2% Confidence"
                highlight
              />
              <StatsCard
                title="Churn Probability"
                value="2.4%"
                icon={Target}
                description="Likelihood of customer attrition"
                trend="-0.5%"
                trendType="down"
              />
              <StatsCard
                title="Logistics Efficiency"
                value="94.8%"
                icon={Zap}
                description="Optimal warehouse pathing"
                trend="Strong"
                trendType="neutral"
              />
              <StatsCard
                title="Market Sentiment"
                value="Positive"
                icon={PieChartIcon}
                description="Social & Brand index"
                trend="Rising"
                trendType="up"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-12">
              {/* Funnel & Heatmap Section */}
              <div className="md:col-span-8 space-y-6">
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                       <Filter className="h-4 w-4 text-primary" />
                       Conversion Funnel
                    </CardTitle>
                    <CardDescription>Sales pipeline progression from lead to fulfillment</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={funnelData}
                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="stage" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            fontSize={12} 
                            fontWeight={600}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: 'rgba(var(--primary-rgb), 0.05)' }}
                          />
                          <Bar 
                            dataKey="value" 
                            radius={[0, 4, 4, 0]}
                            barSize={32}
                          >
                            {funnelData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                       <Activity className="h-4 w-4 text-primary" />
                       Order Intensity Matrix
                    </CardTitle>
                    <CardDescription>Peak activity hours across business week</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="hourIdx" 
                            name="Hour" 
                            type="number"
                            ticks={[0, 1, 2, 3, 4]}
                            tickFormatter={(v) => hourMap[v] || ''}
                            axisLine={false} 
                            tickLine={false} 
                            fontSize={10} 
                            fontWeight={600} 
                          />
                          <YAxis 
                            dataKey="dayIdx" 
                            name="Day" 
                            type="number"
                            ticks={[0, 1, 2, 3, 4, 5, 6]}
                            tickFormatter={(v) => dayMap[v] || ''}
                            axisLine={false} 
                            tickLine={false} 
                            fontSize={10} 
                            fontWeight={600} 
                          />
                          <ZAxis dataKey="intensity" range={[50, 800]} name="Intensity" />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }} 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-background border border-border p-2 rounded-lg shadow-sm text-xs">
                                    <div className="font-bold">{data.day} @ {data.hour}</div>
                                    <div className="text-primary font-bold">Intensity: {data.intensity}%</div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter name="Activity" data={activityData} fill="var(--primary)" fillOpacity={0.6}>
                            {activityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fillOpacity={entry.intensity / 100} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Advanced Sidebar */}
              <div className="md:col-span-4 space-y-6">
                 <Card className="border-border/50 shadow-sm overflow-hidden">
                    <CardHeader>
                       <CardTitle className="text-lg font-bold">Operational Radar</CardTitle>
                       <CardDescription>Strategic KPI balance comparison</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                       <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceRadarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 150]} hide />
                                <Radar
                                   name="Current Year"
                                   dataKey="A"
                                   stroke="var(--primary)"
                                   fill="var(--primary)"
                                   fillOpacity={0.5}
                                />
                                <Radar
                                   name="Market Average"
                                   dataKey="B"
                                   stroke="#10b981"
                                   fill="#10b981"
                                   fillOpacity={0.3}
                                />
                                <Tooltip />
                             </RadarChart>
                          </ResponsiveContainer>
                       </div>
                       <div className="flex justify-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5">
                             <div className="w-3 h-3 rounded-full bg-primary" />
                             <span className="text-[10px] font-bold">Business</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                             <span className="text-[10px] font-bold">Market Avg</span>
                          </div>
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="bg-linear-to-br from-primary/10 to-transparent border-primary/20">
                    <CardHeader>
                       <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                          <BrainCircuit className="h-4 w-4" />
                          Predictive Insight
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                       <p className="text-xs font-medium leading-relaxed">
                          Your current trajectory suggests a <span className="font-bold underline">12.5% increase</span> in regional demand for <span className="font-bold">Electronics</span> over the next quarter. 
                       </p>
                       <div className="p-3 rounded-lg bg-background/50 border border-primary/10">
                          <div className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground mb-1">Recommended Action</div>
                          <p className="text-xs font-bold leading-snug">Increase SKU procurement for Wireless peripherals by Oct 15th.</p>
                       </div>
                    </CardContent>
                 </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="m-0 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Value"
                value="$245,000"
                icon={DollarSign}
                description="Estimated inventory valuation"
                highlight
              />
              <StatsCard
                title="Low Stock"
                value="12 SKUs"
                icon={Filter}
                description="Items below threshold"
                trendType="down"
                trend="Caution"
              />
              <StatsCard
                title="In Transit"
                value="450 Units"
                icon={Package}
                description="Confirmed logistics orders"
              />
              <StatsCard
                title="Return Rate"
                value="0.8%"
                icon={Activity}
                description="Rolling 30-day average"
              />
            </div>

            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/5 border-b py-4">
                <CardTitle className="text-lg font-bold">Inventory Reconciliation</CardTitle>
                <CardDescription>Current stock levels across major categories</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-muted/30 text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-b">
                      <tr>
                        <th className="px-6 py-4">Item ID</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Quantity</th>
                        <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {dummyInventoryData.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-black text-primary">{item.id}</td>
                          <td className="px-6 py-4 text-sm font-bold">{item.name}</td>
                          <td className="px-6 py-4">
                             <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.category}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm font-black">{item.qty}</td>
                          <td className="px-6 py-4 text-right">
                            <Badge className={cn(
                              "text-[10px] font-bold",
                              item.status === "In Stock" ? "bg-green-500/10 text-green-600 border-green-500/20" :
                              item.status === "Low Stock" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                              "bg-red-500/10 text-red-600 border-red-500/20"
                            )} variant="outline">
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default function ERPPage() {
  return (
    <div className="animate-in fade-in duration-700">
      <ERPDashboard />
    </div>
  );
}
