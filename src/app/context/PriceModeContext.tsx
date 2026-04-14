 "use client";

import React, { createContext, useContext, useState } from "react";

type PriceMode = "detail" | "jomla";

type PriceModeContextValue = {
  mode: PriceMode;
  setMode: (mode: PriceMode) => void;
  toggleMode: () => void;
};

const PriceModeContext = createContext<PriceModeContextValue | undefined>(
  undefined
);

export const PriceModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [mode, setMode] = useState<PriceMode>("detail");

  const toggleMode = () => {
    setMode((prev) => (prev === "detail" ? "jomla" : "detail"));
  };

  return (
    <PriceModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </PriceModeContext.Provider>
  );
};

export const usePriceMode = () => {
  const ctx = useContext(PriceModeContext);
  if (!ctx) {
    throw new Error("usePriceMode must be used within a PriceModeProvider");
  }
  return ctx;
};
