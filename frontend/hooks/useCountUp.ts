"use client";
import { useEffect, useRef, useState } from "react";

/** Animates a number towards `target` with ease-out cubic. */
export function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current; const start = performance.now(); let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration); const e = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * e; setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick); else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
