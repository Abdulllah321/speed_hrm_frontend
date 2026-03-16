"use client";

import React, { useState } from "react";
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
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Line, LineChart as ReLineChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- Mock Data ---

const revenueData = [
  { name: 'Jan', revenue: 45000, profit: 13000 },
  { name: 'Feb', revenue: 52000, profit: 18000 },
  { name: 'Mar', revenue: 48000, profit: 17000 },
  { name: 'Apr', revenue: 61000, profit: 23000 },
  { name: 'May', revenue: 55000, profit: 20000 },
  { name: 'Jun', revenue: 67000, profit: 27000 },
  { name: 'Jul', revenue: 72000, profit: 30000 },
];

const categoryData = [
  { name: 'Electronics', value: 45, color: "var(--primary)" },
  { name: 'Fashion', value: 25, color: "oklch(0.6721 0.1944 294.4928)" },
  { name: 'Home', value: 15, color: "oklch(0.8003 0.1821 151.7110)" },
  { name: 'Beauty', value: 10, color: "oklch(0.7106 0.1661 22.2162)" },
  { name: 'Other', value: 5, color: "oklch(0.8077 0.1035 19.5706)" },
];

// --- Internal Components (Matching project design) ---

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendType,
  highlight
}: {
  title: string,
  value: string | number,
  icon: any,
  description: string,
  trend?: string,
  trendType?: 'up' | 'down',
  highlight?: boolean
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
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-black tracking-tight">{value}</div>
          {trend && (
            <div className={cn(
              "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              trendType === 'up' ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
            )}>
              {trendType === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend}
            </div>
          )}
        </div>
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
      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
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
            <Button variant="ghost" size="icon-sm">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="animate-in fade-in duration-500">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* KPI Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title="Total Revenue"
                  value="$1,280,450"
                  icon={DollarSign}
                  description="Net profit after tax"
                  trend="12.5%"
                  trendType="up"
                  highlight
                />
                <StatsCard
                  title="Active Users"
                  value="14,235"
                  icon={Users}
                  description="Across all platforms"
                  trend="7.2%"
                  trendType="up"
                />
                <StatsCard
                  title="Inventory Value"
                  value="$420,120"
                  icon={Package}
                  description="Estimated market value"
                  trend="2.4%"
                  trendType="down"
                />
                <StatsCard
                  title="Total Orders"
                  value="4,820"
                  icon={ShoppingCart}
                  description="Processing completion"
                  trend="18.3%"
                  trendType="up"
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
                          <CardDescription>Revenue vs Profit (Monthly Trend)</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ChartContainer config={{
                        revenue: { label: "Revenue", color: "var(--primary)" },
                        profit: { label: "Profit", color: "#10b981" }
                      }} className="h-[280px] w-full">
                        <ReLineChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight={500} dy={10} />
                          <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight={500} tickFormatter={(v) => `$${v / 1000}k`} />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </ReLineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Assets Table */}
                  <Card className="border-border/50 shadow-sm overflow-hidden min-h-[400px]">
                    <CardHeader className="bg-muted/5 border-b py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg font-bold">Strategic Assets</CardTitle>
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
                            {[
                              { id: "TX-9901", name: "Warehouse Bulk Restock", cat: "Inventory", val: "$45,200" },
                              { id: "TX-9842", name: "Corporate Client Licensing", cat: "Service", val: "$12,400" },
                              { id: "TX-9831", name: "Global Logistics Gateway", cat: "Shipping", val: "$8,900" },
                              { id: "TX-9810", name: "Platform Infrastructure", cat: "Operations", val: "$22,150" },
                            ].map((item) => (
                              <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs font-black text-primary">{item.id}</td>
                                <td className="px-6 py-4 text-sm font-bold">{item.name}</td>
                                <td className="px-6 py-4">
                                  <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.cat}</Badge>
                                </td>
                                <td className="px-6 py-4 text-sm font-black text-right">{item.val}</td>
                              </tr>
                            ))}
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
                      <CardTitle className="text-lg font-bold">Market Share</CardTitle>
                      <CardDescription>Revenue distribution by category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={{
                        electronics: { label: "Electronics", color: "var(--primary)" },
                        fashion: { label: "Fashion", color: "oklch(0.6721 0.1944 294.4928)" },
                        home: { label: "Home", color: "oklch(0.8003 0.1821 151.7110)" },
                        beauty: { label: "Beauty", color: "oklch(0.7106 0.1661 22.2162)" },
                        other: { label: "Other", color: "oklch(0.8077 0.1035 19.5706)" }
                      }} className="h-[250px] w-full">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="grid gap-2 mt-4">
                        {categoryData.slice(0, 3).map((item) => (
                          <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-xs font-bold text-muted-foreground">{item.name}</span>
                            </div>
                            <span className="text-xs font-black">{item.value}%</span>
                          </div>
                        ))}
                      </div>
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
                        Based on current trends, warehouse throughput is expected to increase by <span className="text-primary font-bold">14%</span> next month. Consider accelerating bulk restock timelines.
                      </p>
                      <Button size="sm" className="w-full text-xs font-bold">Review Logistics</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
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