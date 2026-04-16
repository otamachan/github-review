import { useCallback, useState } from "react";

export function useViewedFiles() {
  const [viewed, setViewed] = useState<Set<string>>(new Set());

  const toggleViewed = useCallback((filename: string) => {
    setViewed((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  }, []);

  const markViewed = useCallback((filename: string) => {
    setViewed((prev) => {
      if (prev.has(filename)) return prev;
      return new Set(prev).add(filename);
    });
  }, []);

  return { viewed, toggleViewed, markViewed };
}
