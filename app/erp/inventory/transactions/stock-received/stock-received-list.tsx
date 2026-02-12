"use client";

import { StockLedgerEntry } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";

interface StockReceivedListProps {
    initialEntries: StockLedgerEntry[];
}

export function StockReceivedList({ initialEntries }: StockReceivedListProps) {
    // We can use state here if we want potential client-side sorting/filtering later
    const [entries] = useState<StockLedgerEntry[]>(initialEntries);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Inbound Transactions</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Reference</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">
                                    No stock received records found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            entries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>
                                        {format(new Date(entry.createdAt), "dd MMM yyyy, HH:mm")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{entry.item?.sku || entry.item?.itemId || 'Unknown Item'}</span>
                                            <span className="text-xs text-muted-foreground">{entry.item?.description || entry.itemId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{entry.warehouse?.name || entry.warehouseId}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            +{Number(entry.qty).toFixed(2)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {entry.referenceType} #{entry.referenceId.slice(0, 8)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
