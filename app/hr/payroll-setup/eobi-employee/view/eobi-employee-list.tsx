"use client";

import { useState } from "react";
import DataTable from "@/components/common/data-table";
import { columns } from "./columns";
import { EOBIEmployee } from "@/lib/actions/eobi-employee";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { recalculateEOBIContributions } from "@/lib/actions/eobi-employee";

interface EOBIEmployeeListProps {
    initialData: EOBIEmployee[];
}

export function EOBIEmployeeList({ initialData }: EOBIEmployeeListProps) {
    const [data] = useState<EOBIEmployee[]>(initialData);
    const [isSyncing, setIsSyncing] = useState(false);
    const router = useRouter();

    const handleSyncEOBIRates = async () => {
        setIsSyncing(true);
        try {
            const res = await recalculateEOBIContributions();
            if (res.status) {
                toast.success(res.message || "EOBI contributions synced with employee regions!");
                router.refresh();
            } else {
                toast.error(res.message || "Failed to sync EOBI contributions.");
            }
        } catch (err) {
            console.error("Sync error:", err);
            toast.error("Failed to sync EOBI contributions.");
        } finally {
            setIsSyncing(false);
        }
    };

    // Calculate summary statistics
    const totalEmployees = data.length;
    const totalEOBIBalance = data.reduce((sum, emp) => sum + emp.totalEOBIBalance, 0);
    const totalEmployeeContribution = data.reduce((sum, emp) => sum + emp.employeeContribution, 0);
    const totalEmployerContribution = data.reduce((sum, emp) => sum + emp.employerContribution, 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PK", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEmployees}</div>
                        <p className="text-xs text-muted-foreground">
                            With active EOBI accounts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total EOBI Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(totalEOBIBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Employee + Employer contributions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Employee Contribution</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(totalEmployeeContribution)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total employee deductions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Employer Contribution</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(totalEmployerContribution)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total employer contributions
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>EOBI Employee Balances</CardTitle>
                        <CardDescription>
                            View total EOBI balances for all employees with EOBI enabled
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSyncEOBIRates} disabled={isSyncing}>
                        {isSyncing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2 text-primary" />
                        )}
                        Sync EOBI Rates by Region
                    </Button>
                </CardHeader>
                <CardContent>
                    <DataTable<EOBIEmployee>
                        columns={columns}
                        data={data}
                        searchFields={[
                            { key: "employeeDetails", label: "Employee" },
                        ]}
                        tableId="eobi-employee-list"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
