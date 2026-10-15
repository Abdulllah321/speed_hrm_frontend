'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    ShoppingCart, 
    PhoneCall, 
    Layers, 
    CheckCircle2, 
    Clock, 
    ArrowRightLeft,
    Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OnlineOrderNavProps {
    counts?: {
        totalOrders?: number;
        needsConfirmation?: number;
        stockShortage?: number;
    };
}

export function OnlineOrderNav({ counts }: OnlineOrderNavProps) {
    const pathname = usePathname();

    const isMainOrders = pathname === '/pos/online-order-management';
    const isConfirmations = pathname.startsWith('/pos/online-order-management/confirmations');
    const isSourcing = pathname.startsWith('/pos/online-order-management/inventory-sourcing');

    const navItems = [
        {
            title: 'Orders & POS Invoicing',
            href: '/pos/online-order-management',
            icon: ShoppingCart,
            active: isMainOrders,
            description: 'Import Shopify orders, apply vouchers, post sales',
            badge: counts?.totalOrders ? `${counts.totalOrders}` : undefined,
            badgeVariant: 'secondary' as const,
        },
        {
            title: 'Calling & Confirmation Hub',
            href: '/pos/online-order-management/confirmations',
            icon: PhoneCall,
            active: isConfirmations,
            description: 'Fast telephonic verification & 1-click customer logs',
            badge: counts?.needsConfirmation ? `${counts.needsConfirmation} pending` : undefined,
            badgeVariant: 'destructive' as const,
        },
        {
            title: 'Stock Sourcing & Consolidated Transfers',
            href: '/pos/online-order-management/inventory-sourcing',
            icon: Layers,
            active: isSourcing,
            description: 'Multi-store stock consolidation into 1 single STN',
            badge: counts?.stockShortage ? `${counts.stockShortage} items` : undefined,
            badgeVariant: 'outline' as const,
        },
    ];

    return (
        <div className="w-full bg-card border rounded-2xl p-2.5 shadow-xs mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group relative flex items-start gap-3.5 p-3.5 rounded-xl transition-all duration-200 border ${
                                item.active
                                    ? 'bg-primary/10 border-primary/40 text-foreground shadow-xs ring-1 ring-primary/20'
                                    : 'bg-background/60 hover:bg-muted/60 border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <div
                                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                    item.active
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                                }`}
                            >
                                <Icon className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`font-semibold text-sm truncate ${
                                            item.active ? 'text-primary' : 'text-foreground'
                                        }`}
                                    >
                                        {item.title}
                                    </span>
                                    {item.badge && (
                                        <Badge
                                            variant={item.badgeVariant}
                                            className="text-[10px] py-0 px-1.5 shrink-0 uppercase tracking-wider"
                                        >
                                            {item.badge}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {item.description}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
