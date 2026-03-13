import React from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import AppContext, { useAppContext } from "./AppContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { context } = useAppContext();
  return (
    <AppContext value={context}>
      <SidebarProvider className="h-full">
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AppContext>
  );
}
