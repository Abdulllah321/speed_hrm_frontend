import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InventoryPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Inventory Explorer</h2>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Stock Levels</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Inventory list table placeholder...</p>
                </CardContent>
            </Card>
        </div>
    );
}
