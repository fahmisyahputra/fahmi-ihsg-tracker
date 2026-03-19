"use client";

import { Bell, LogOut, User } from "lucide-react";
import { logout } from "@/app/login/actions";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tracking-tight text-foreground">
          Stock<span className="text-primary">Tracker</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
        </button>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Profile"
        >
          <User className="size-5" />
        </button>
        <form action={logout}>
          <button
            type="submit"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Log out"
          >
            <LogOut className="size-5" />
          </button>
        </form>
      </div>
    </header>
  );
}
