import { useEffect } from "react";

// One delegated listener paints a local highlight without re-rendering the game.
export default function useGlassLight() {
  useEffect(() => {
    const media = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let frame = 0;
    let current = null;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      current?.style.removeProperty("--glass-x");
      current?.style.removeProperty("--glass-y");
      current = null;
    };
    const move = (event) => {
      if (!media.matches) return;
      const pane =
        event.target instanceof Element
          ? event.target.closest("[data-glass]")
          : null;
      if (!pane) {
        reset();
        return;
      }
      if (current !== pane) {
        reset();
        current = pane;
      }
      cancelAnimationFrame(frame);
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        const bounds = pane.getBoundingClientRect();
        pane.style.setProperty("--glass-x", `${clientX - bounds.left}px`);
        pane.style.setProperty("--glass-y", `${clientY - bounds.top}px`);
      });
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    media.addEventListener("change", reset);
    return () => {
      reset();
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", reset);
      media.removeEventListener("change", reset);
    };
  }, []);
}
