import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-soft bg-white shadow-warm ${className}`}
      {...props}
    />
  );
}
