import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Info } from "lucide-react";
import { useState } from "react";
import { BrowserOpenURL } from "../wailsjs/runtime/runtime";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { ScrollArea } from "./components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { columns } from "./settings/departments/columns";
import { Department, departments, sources } from "./settings/departments/data";
import { DataTable } from "./settings/departments/data-table";

export default function SettingsView() {
  const [selectedDpt, setSelectedDpt] = useState<Department | undefined>();

  const handleImportAll = () => {};

  const handleDptChange = (value: string | null) => {
    const id = value?.split(" - ")[0];
    setSelectedDpt(departments.find((d) => d.id === id));
  };

  return (
    <ScrollArea className="h-full">
      <div>
        <div className="shadow-md rounded p-10 m-10 bg-secondary/10">
          <p className="text-2xl mb-4">Source de données</p>
          <Item variant="outline" className="mb-2">
            <ItemMedia variant="icon">
              <Info />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Informations</ItemTitle>
              <ItemDescription
                className="line-clamp-3"
                style={{ textWrap: "initial" }}
              >
                Vous pouvez importer tous les départements via le bouton
                "Importer tout" ou importer les départements un par un via la
                liste déroulante (seul les départements non chargés sont dans la
                liste).
              </ItemDescription>
            </ItemContent>
          </Item>
          <Item variant="outline">
            <ItemMedia variant="icon">
              <Info />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Informations</ItemTitle>
              <ItemDescription
                className="line-clamp-3"
                style={{ textWrap: "initial" }}
              >
                Vous avez également la possibilité d'importer vos propres
                fichiers via "Importer mon fichier". Il faut respecter le format
                de fichier défini ici{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    BrowserOpenURL(
                      "https://www.data.gouv.fr/datasets/donnees-climatologiques-de-base-quotidiennes",
                    );
                  }}
                >
                  data.gouv
                </a>
              </ItemDescription>
            </ItemContent>
          </Item>

          <div className="mb-5" />

          <div>
            <Tabs defaultValue="source-existings" className="w-full">
              <TabsList>
                <TabsTrigger value="source-existings">
                  Sources utilisées
                </TabsTrigger>
                <TabsTrigger value="source-import">Importer source</TabsTrigger>
              </TabsList>
              <TabsContent value="source-existings">
                <div className="p-2 bg-secondary/20 shadow-md rounded-md">
                  <div className="h-75 overflow-auto">
                    <DataTable columns={columns} data={sources} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="source-import">
                <div className="mt-4 rounded-md border divide-y">
                  {/* Section 1 — Importer tout */}
                  <div className="flex items-center justify-between gap-6 p-6">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">Importer tout</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Charge tous les départements de France métropolitaine
                        avec des données depuis 1950.
                      </p>
                    </div>
                    <Button className="shrink-0">Importer tout</Button>
                  </div>

                  {/* Section 2 — Par département */}
                  <div className="flex items-center justify-between gap-6 p-6">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">
                        Importer par département
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 mb-3">
                        Importe les données d'un seul département depuis 1950.
                      </p>
                      <Combobox
                        items={departments}
                        onValueChange={handleDptChange}
                      >
                        <ComboboxInput placeholder="Sélectionnez un département" />
                        <ComboboxContent>
                          <ComboboxEmpty>
                            Aucun département trouvé.
                          </ComboboxEmpty>
                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem
                                key={item.id}
                                value={`${item.id} - ${item.name}`}
                              >
                                {item.id} - {item.name}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </div>
                    <Button className="shrink-0 self-end">
                      Importer département
                    </Button>
                  </div>

                  {/* Section 3 — Mon fichier */}
                  <div className="flex items-center justify-between gap-6 p-6 opacity-60">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          Importer mon fichier
                        </p>
                        <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                          Bientôt disponible
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 mb-3">
                        Format data.gouv requis. Aucun fichier sélectionné.
                      </p>
                      <Input type="file" disabled className="max-w-xs" />
                    </div>
                    <Button disabled className="shrink-0 self-end">
                      Importer fichier
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
