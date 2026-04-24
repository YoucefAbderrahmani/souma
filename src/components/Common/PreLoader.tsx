import React from "react";

const PreLoader = () => {
  return (
    <div
      className="fixed left-0 top-0 z-999999 flex h-screen w-screen items-center justify-center bg-white dark:bg-gray-7"
      suppressHydrationWarning
    >
      <div
        className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue border-t-transparent"
        suppressHydrationWarning
      />
    </div>
  );
};

export default PreLoader;
