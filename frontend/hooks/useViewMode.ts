"use client";
import { createContext, useContext } from "react";
import { getSession, type UserRole } from "@/lib/auth";

export type ViewMode = UserRole;

export const ViewModeContext = createContext<{ mode: ViewMode; setMode: (m: ViewMode) => void }>({
  mode: "farmer",
  setMode: () => {},
});

export const useViewMode = () => {
  const session = typeof window !== "undefined" ? getSession() : null;
  const ctx = useContext(ViewModeContext);
  return {
    mode: (session?.role || ctx.mode || "farmer") as ViewMode,
    setMode: ctx.setMode,
  };
};
