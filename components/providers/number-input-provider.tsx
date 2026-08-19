"use client";

import { useEffect } from "react";

/**
 * NumberInputProvider:
 * Globally prevents numeric inputs (<input type="number">) from
 * accidentally changing values when scrolling the mouse wheel or pressing ArrowUp/ArrowDown keys.
 */
export function NumberInputProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Disable mouse wheel value changes on number inputs
    const handleWheel = (e: WheelEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && active.type === "number") {
        active.blur();
      }
    };

    // 2. Disable Up/Down arrow key value increments/decrements on number inputs
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const active = document.activeElement;
        if (
          active instanceof HTMLInputElement &&
          active.type === "number" &&
          !active.dataset.allowArrows
        ) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return <>{children}</>;
}
