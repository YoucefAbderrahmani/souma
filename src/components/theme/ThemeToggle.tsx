"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-3 bg-gray-1 ${className}`}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-3 bg-gray-1 text-dark transition-colors hover:border-blue hover:text-blue dark:border-gray-6 dark:bg-gray-7 dark:text-gray-3 dark:hover:border-blue dark:hover:text-blue ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to night mode"}
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M12 2V3M12 21V22M4.22 4.22L4.93 4.93M19.07 19.07L19.78 19.78M2 12H3M21 12H22M4.22 19.78L4.93 19.07M19.07 4.93L19.78 4.22"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 14.5C19.5 15.5 17.5 16 15.5 16C10.5 16 6.5 12 6.5 7C6.5 5 7 3 8 1.5C4.5 3 2 6.5 2 10.5C2 16.5 6.5 21 12.5 21C16.5 21 20 18.5 21 14.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
