"use client";

import { useCallback, useState } from "react";

export function useInstantTab<T extends string>(initial: T) {
  const [active, setActive] = useState(initial);
  const [visited, setVisited] = useState<Set<T>>(() => new Set([initial]));

  const select = useCallback((tab: T) => {
    setActive(tab);
    setVisited((current) => {
      if (current.has(tab)) return current;
      const next = new Set(current);
      next.add(tab);
      return next;
    });
  }, []);

  const ensureVisited = useCallback((tab: T) => {
    setVisited((current) => {
      if (current.has(tab)) return current;
      const next = new Set(current);
      next.add(tab);
      return next;
    });
  }, []);

  return { active, visited, select, ensureVisited, setActive };
}
