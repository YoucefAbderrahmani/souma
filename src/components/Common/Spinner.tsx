import React from "react";

interface SpinnerProps {
  className?: string;
}

export const Spinner = ({ className = "" }: SpinnerProps) => {
  return (
    <div
      className={`h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue border-t-transparent ${className}`}
    ></div>
  );
};
