import React from "react";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppContextProvider, useAppContext } from "./AppContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppContextProvider>
      <SidebarProvider className="h-full">
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AppContextProvider>
  );
}
