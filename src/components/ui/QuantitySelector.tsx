"use client";

import { useState } from "react";

export function QuantitySelector({
  max,
  onChange,
}: {
  max?: number;
  onChange?: (value: number) => void;
}) {
  const [value, setValue] = useState(1);

  function update(next: number) {
    const clamped = Math.max(1, max ? Math.min(next, max) : next);
    setValue(clamped);
    onChange?.(clamped);
  }

  return (
    <div className="inline-flex items-center gap-3 rounded-soft bg-cream px-3 py-1">
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => update(value - 1)}
        className="text-lg text-brown-dark"
      >
        −
      </button>
      <span className="w-6 text-center">{value}</span>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => update(value + 1)}
        className="text-lg text-brown-dark"
      >
        +
      </button>
    </div>
  );
}
