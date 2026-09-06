"use client";

import { memo } from "react";

// ---------------------------------------------------------------------------
// DotDigits — dot-matrix numerals, the signature ZUNEX instrument look.
// All dots are rendered; unlit dots stay faintly visible like etched points.
// ---------------------------------------------------------------------------

const G: Record<string, number[][]> = {
  "0": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  "1": [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  "2": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  "3": [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  "4": [
    [0, 0, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
  "5": [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  "6": [
    [0, 0, 1, 1, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  "7": [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
  ],
  "8": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  "9": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
  ],
  ":": [[0], [0], [1], [0], [1], [0], [0]],
};

interface DotDigitsProps {
  value: string;
  /** dot radius in svg units */
  r?: number;
  /** gap between dot centers in svg units */
  gap?: number;
  className?: string;
  dimOpacity?: number;
  glow?: boolean;
}

function DotDigitsImpl({
  value,
  r = 1.55,
  gap = 4.4,
  className,
  dimOpacity = 0.13,
  glow = true,
}: DotDigitsProps) {
  const unit = r * 2 + gap;
  const chars = [...value];

  // Layout pass
  const xs: number[] = [];
  let x = 0;
  for (const c of chars) {
    const glyph = G[c] ?? G["0"];
    xs.push(x);
    x += glyph[0].length * unit + unit * 1.15;
  }
  const width = x - unit * 1.15;
  const height = 7 * unit;

  const dim: React.ReactElement[] = [];
  const lit: React.ReactElement[] = [];
  chars.forEach((c, ci) => {
    const glyph = G[c];
    if (!glyph) return;
    glyph.forEach((row, ri) => {
      row.forEach((v, vi) => {
        const cx = xs[ci] + vi * unit + r;
        const cy = ri * unit + r;
        const el = (
          <circle key={`${ci}-${ri}-${vi}`} cx={cx} cy={cy} r={r} />
        );
        if (v) lit.push(el);
        else dim.push(el);
      });
    });
  });

  return (
    <svg
      viewBox={`0 0 ${Math.max(width, 1)} ${height}`}
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible", color: "currentColor" }}
    >
      <g fill="currentColor" opacity={dimOpacity}>
        {dim}
      </g>
      <g
        fill="currentColor"
        style={glow ? { filter: "drop-shadow(0 0 5px currentColor)" } : undefined}
      >
        {lit}
      </g>
    </svg>
  );
}

export const DotDigits = memo(DotDigitsImpl);
