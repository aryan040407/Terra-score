"use client";
import { createContext, useContext } from "react";
export type ViewMode = "farmer" | "lender" | "insurer";
export const ViewModeContext = createContext<{ mode: ViewMode; setMode: (m: ViewMode) => void }>({ mode: "farmer", setMode: () => {} });
export const useViewMode = () => useContext(ViewModeContext);
