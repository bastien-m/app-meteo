import { produce } from "immer";
import { createContext, useState } from "react";

type AppContext = {
  selectedStations: string[];
};

const AppContext = createContext<AppContext>({
  selectedStations: [],
});

export function useAppContext() {
  const [ctx, setCtx] = useState<AppContext>({
    selectedStations: [],
  });

  function addSelectedStation(numPost: string) {
    setCtx(
      produce((draft) => {
        draft.selectedStations.push(numPost);
      }),
    );
  }

  function removeSelectedStation(numPost: string) {
    setCtx(
      produce((draft) => {
        draft.selectedStations = draft.selectedStations.filter(
          (s) => s !== numPost,
        );
      }),
    );
  }

  return {
    context: ctx,
    addSelectedStation,
    removeSelectedStation,
  };
}

export default AppContext;
