import React, { useEffect, useRef, useState } from "react";
import tileRain from "./assets/images/tile-rain.png";
import tileStation from "./assets/images/tile-station.png";
import station from "./assets/images/station.png";
import comparision from "./assets/images/comparison.png";
import settingsScreenshot from "./assets/images/settings-screen.png";
import { ScrollArea } from "./components/ui/scroll-area";
import { ChevronDown } from "lucide-react";

export default function AppView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;

    const check = () => {
      setCanScrollDown(
        viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 1,
      );
    };

    check();
    viewport.addEventListener("scroll", check);
    const ro = new ResizeObserver(check);
    ro.observe(viewport);

    return () => {
      viewport.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full">
      <ScrollArea className="h-full">
        <AppSection title="Cartes" imagePosition="right" image={tileStation}>
          Une carte interactive pour afficher les stations et calques relatifs à
          la météo.
        </AppSection>
        <AppSection title="Calques" imagePosition="left" image={tileRain}>
          Le calque pour afficher la pluviométrie permet d'afficher du vert
          foncé au rouge foncé la pluviométrie moyenne par station
        </AppSection>
        <AppSection
          title="Comparaison"
          imagePosition="right"
          image={comparision}
        >
          La vue comparaison permet de sélectionner plusieurs stations à
          comparer avec la possibilité de modifier l'affichage des graphes.
        </AppSection>
        <AppSection title="Station" imagePosition="left" image={station}>
          La vue station permet d'afficher le maximum d'informations sur une
          station.
        </AppSection>
        <AppSection
          title="Configurations"
          imagePosition="right"
          image={settingsScreenshot}
        >
          Permet de gérer les sources de données de l'application
        </AppSection>
      </ScrollArea>
      {canScrollDown && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce text-muted-foreground">
          <ChevronDown size={28} />
        </div>
      )}
    </div>
  );
}

interface AppSectionProps {
  children: React.ReactNode;
  title: string;
  image: string;
  imagePosition: "right" | "left";
}
function AppSection({
  title,
  children,
  image,
  imagePosition,
}: AppSectionProps) {
  return (
    <div className="flex m-10 gap-5 items-center shadow-md rounded-sm bg-secondary/40">
      <div
        className={`flex-2 ${imagePosition === "right" ? "order-last" : "order-first"}`}
      >
        <img src={image} className="w-full object-contain rounded-r-sm" />
      </div>
      <div className="flex-2 flex flex-col gap-2 p-2">
        <p className="text-2xl">{title}</p>
        <p className="text-base">{children}</p>
      </div>
    </div>
  );
}
