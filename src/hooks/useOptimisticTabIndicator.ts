"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Tab indicator updates on click before parent re-render (0 perceived delay on buttons).
 */
export function useOptimisticTabIndicator<T extends string>(syncedTab: T) {
  const [indicatorTab, setIndicatorTab] = useState(syncedTab);

  useEffect(() => {
    setIndicatorTab(syncedTab);
  }, [syncedTab]);

  const selectTab = useCallback((tab: T, notifyParent: (tab: T) => void) => {
    setIndicatorTab(tab);
    notifyParent(tab);
  }, []);

  return { indicatorTab, selectTab };
}
