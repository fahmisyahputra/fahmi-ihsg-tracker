"use client";

import { BottomNav } from "./bottom-nav";
import { TopHeader } from "./top-header";
import { ActionFab } from "@/components/dashboard/action-fab";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <TopHeader />

      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {children}
      </main>

      <ActionFab />
      <BottomNav />
    </div>
  );
}

