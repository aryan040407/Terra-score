"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_DEMO_REGION_ID, DEMO_REGIONS, getDemoRegion, type DemoRegion } from "@/lib/demoRegions";

const REGION_STORAGE_KEY = "terrascore-demo-region";

type RegionContextValue = {
  regions: DemoRegion[];
  selectedRegion: DemoRegion;
  setSelectedRegionId: (id: string) => void;
};

const RegionContext = createContext<RegionContextValue | undefined>(undefined);

export function RegionProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState(DEFAULT_DEMO_REGION_ID);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromStorage = window.localStorage.getItem(REGION_STORAGE_KEY);
    if (fromStorage && DEMO_REGIONS.some((region) => region.id === fromStorage)) {
      setSelectedId(fromStorage);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(REGION_STORAGE_KEY, selectedId);
  }, [selectedId]);

  const value = useMemo<RegionContextValue>(() => ({
    regions: DEMO_REGIONS,
    selectedRegion: getDemoRegion(selectedId),
    setSelectedRegionId: setSelectedId,
  }), [selectedId]);

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error("useRegion must be used inside RegionProvider");
  }
  return context;
}
