import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Employee } from "@/lib/api";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface LeavesContentProps {
    employee: Employee | null;
}

export function LeavesContent({ employee }: LeavesContentProps) {
    if (!employee) {
        return <div className="text-muted-foreground">Loading leaves information...</div>;
    }
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        Leaves Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <p className="text-muted-foreground">
                            View your leave balance and history in the Leaves section.
                        </p>
                        <Link href="/hr/leaves">
                            <Button>Go to Leaves Management</Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
