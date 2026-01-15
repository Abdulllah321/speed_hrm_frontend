"use client";

import { useEffect, useState } from "react";
import { Users, Clock, AlertCircle, FileText, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { dashboardApi, DashboardStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function DashboardContent() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadStats() {
            try {
                const data = await dashboardApi.getStats();
                setStats(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load dashboard data.");
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (error || !stats) {
        return <div className="p-4 text-red-500">{error || "No data available"}</div>;
    }

    const attendanceData = [
        { name: "Present", value: stats.overview.presentToday, color: "#22c55e" }, // green-500
        { name: "Absent", value: stats.overview.absentToday, color: "#ef4444" }, // red-500
    ];

    // If no attendance data, show empty state or placeholder? 
    // We'll just show what we have.

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Employees"
                    value={stats.overview.totalEmployees}
                    icon={Users}
                    description={`${stats.overview.inactiveEmployees} inactive`}
                />
                <StatsCard
                    title="Present Today"
                    value={stats.overview.presentToday}
                    icon={CheckCircle}
                    description="Checked in employees"
                />
                <StatsCard
                    title="Pending Leaves"
                    value={stats.overview.pendingLeaves}
                    icon={FileText}
                    description="Requires approval"
                />
                <StatsCard
                    title="Pending Queries"
                    value={stats.overview.pendingAttendanceQueries}
                    icon={AlertCircle}
                    description="Attendance regularizations"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Department Distribution Chart */}
                <Card className="col-span-4 transition-all hover:shadow-md">
                    <CardHeader>
                        <CardTitle>Department Distribution</CardTitle>
                        <CardDescription>Employee count per department</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={{}} className="h-[300px] w-full">
                            <BarChart data={stats.departmentStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}

                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Attendance Pie Chart */}
                <Card className="col-span-3 transition-all hover:shadow-md">
                    <CardHeader>
                        <CardTitle>Today's Attendance</CardTitle>
                        <CardDescription>Real-time status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            {attendanceData.every(d => d.value === 0) ? (
                                <div className="text-muted-foreground text-sm">No attendance data for today</div>
                            ) : (
                                <ChartContainer config={{
                                    present: { label: "Present", color: "#22c55e" },
                                    absent: { label: "Absent", color: "#ef4444" }
                                }} className="h-[300px] w-full">
                                    <PieChart>
                                        <Pie
                                            data={attendanceData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {attendanceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        {/* We can add a legend manually or use Recharts Legend */}
                                    </PieChart>
                                </ChartContainer>
                            )}
                        </div>
                        <div className="flex justify-center gap-4 text-sm text-muted-foreground mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span>Present: {stats.overview.presentToday}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span>Absent: {stats.overview.absentToday}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, description }: { title: string, value: number, icon: any, description: string }) {
    return (
        <Card className="hover:-translate-y-1 transition-transform duration-200 shadow-sm hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Skeleton className="col-span-4 h-[400px]" />
                <Skeleton className="col-span-3 h-[400px]" />
            </div>
        </div>
    );
}
