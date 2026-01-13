"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { User, Shield } from "lucide-react";

interface SettingsLayoutProps {
    children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();

    const tabs = [
        {
            title: "Profile",
            href: "/hr/settings/profile",
            icon: User,
        },
        {
            title: "Security",
            href: "/hr/settings/password",
            icon: Shield,
        },
    ];

    return (
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0 p-6">
            <aside className="-mx-4 lg:w-1/5 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
                <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                    {tabs.map((item) => (
                        <Button
                            key={item.href}
                            variant={pathname === item.href ? "secondary" : "ghost"}
                            className={cn(
                                "justify-start",
                                pathname === item.href && "bg-muted hover:bg-muted"
                            )}
                            onClick={() => router.push(item.href)}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.title}
                        </Button>
                    ))}
                </nav>
            </aside>
            <div className="flex-1 lg:max-w-4xl">{children}</div>
        </div>
    );
}
