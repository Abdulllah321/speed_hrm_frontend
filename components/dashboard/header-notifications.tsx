"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

type NotificationStatus = "unread" | "read";

type NotificationItem = {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  status: NotificationStatus;
  actionType?: string | null;
  actionPayload?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
};

export function HeaderNotifications() {
  const { user, isAuthenticated, fetchWithAuth } = useAuth();
  const router = useRouter();

  const API_BASE = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
    []
  );

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    const res = await fetchWithAuth(`${API_BASE}/notifications?limit=10`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return;
    const json = (await res.json()) as {
      status: boolean;
      data?: { items: NotificationItem[]; unreadCount: number };
    };
    if (!json?.status || !json.data) return;
    setItems(json.data.items || []);
    setUnreadCount(json.data.unreadCount || 0);
  }, [API_BASE, fetchWithAuth, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    refresh();
    const timer = setInterval(() => {
      refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [isAuthenticated, refresh]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      if (!isAuthenticated) return;
      const current = items.find((n) => n.id === id);
      if (!current) return;

      const res = await fetchWithAuth(`${API_BASE}/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return;

      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" } : n))
      );
      if (current.status === "unread") {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    },
    [API_BASE, fetchWithAuth, isAuthenticated, items]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!isAuthenticated) return;
    const res = await fetchWithAuth(`${API_BASE}/notifications/read-all`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      cache: "no-store",
    });
    if (!res.ok) return;

    setItems((prev) => prev.map((n) => ({ ...n, status: "read" })));
    setUnreadCount(0);
  }, [API_BASE, fetchWithAuth, isAuthenticated]);

  const getActionRoute = useCallback((n: NotificationItem) => {
    if (!n.actionType) return null;
    if (n.actionType.startsWith("leave-application.")) return "/hr/leaves/requests";
    return null;
  }, []);

  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {badgeText}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {items.length === 0 ? (
            <DropdownMenuItem disabled className="text-sm text-muted-foreground">
              No notifications
            </DropdownMenuItem>
          ) : (
            items.map((n) => {
              const route = getActionRoute(n);
              const isUnread = n.status === "unread";
              return (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-1"
                  onSelect={async () => {
                    await handleMarkRead(n.id);
                    if (route) router.push(route);
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className={isUnread ? "font-semibold" : "font-medium"}>
                      {n.title}
                    </span>
                    <Badge variant={isUnread ? "default" : "secondary"} className="capitalize">
                      {n.category || "general"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {n.message}
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async (e) => {
            e.preventDefault();
            await handleMarkAllRead();
          }}
          disabled={unreadCount === 0}
        >
          Mark all as read
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

