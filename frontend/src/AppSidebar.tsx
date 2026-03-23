import {
  ChartArea,
  ChevronRight,
  Home,
  Map,
  Settings,
  Terminal,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import weatherIcon from "./assets/images/weather-icon.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "./components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";

export function AppSidebar() {
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={toggleSidebar}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden shrink-0">
                <img className="size-full object-contain" src={weatherIcon} />
              </div>
              {/* <div className="grid flex-1 text-left">
                  <span className="font-semibold">Meteo Data</span>
                  <span className="text-xs">Enterprise</span>
                </div> */}
            </SidebarMenuButton>
            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden shrink-0">
                    <img
                      className="size-full object-contain"
                      src={weatherIcon}
                    />
                  </div>
                  <div className="grid flex-1 text-left">
                    <span className="font-semibold">Meteo Data</span>
                    <span className="text-xs">Enterprise</span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="right" align="start">
                <DropdownMenuLabel>Teams</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <PlusIcon />
                  <span>Acme Inc</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ⌘1
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <PlusIcon />
                  <span>Acme Corp.</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ⌘2
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <PlusIcon />
                  <span>Evil Corp.</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ⌘3
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <PlusIcon />
                  <span>Add team</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> */}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {/* <SidebarGroupLabel>Platform</SidebarGroupLabel> */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Accueil">
                <NavLink to="/">
                  <Home />
                  <span>Accueil</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Cartes">
                <NavLink to="/map">
                  <Map />
                  <span>Cartes</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenu>
            <Collapsible asChild defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Graphes">
                    <ChartArea />
                    <span>Graphiques</span>
                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <NavLink to="/graphs/station">
                        <SidebarMenuSubButton>Station</SidebarMenuSubButton>
                      </NavLink>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <NavLink to="/graphs/comparison">
                        <SidebarMenuSubButton>Comparaison</SidebarMenuSubButton>
                      </NavLink>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
          <SidebarMenu>
            <Collapsible asChild defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Playground">
                    <Terminal />
                    <span>Playground</span>
                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      {" "}
                      <SidebarMenuSubButton>History</SidebarMenuSubButton>{" "}
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      {" "}
                      <SidebarMenuSubButton>Starred</SidebarMenuSubButton>{" "}
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      {" "}
                      <SidebarMenuSubButton>Settings</SidebarMenuSubButton>{" "}
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Configuration">
              <NavLink to="/settings">
                <Settings />
                <span>Configuration</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar className="h-8 w-8">
                {" "}
                <AvatarImage src="..." />{" "}
              </Avatar>
              <div className="grid flex-1 text-left">
                <span className="font-semibold">shadcn</span>
                <span className="text-xs">m@example.com</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu> */}
      </SidebarFooter>
    </Sidebar>
  );
}
