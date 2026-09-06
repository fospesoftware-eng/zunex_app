"use client";

import type { ReactNode } from "react";

/**
 * Brand marks. Per the ZUNEX identity rules the supplied artwork is used
 * as-is (approved SVG files) — never re-set, recoloured or rebuilt.
 */
export function BrandWordmark({ className = "h-4" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/zunex-wordmark.svg"
      alt="ZUNEX"
      className={className}
      draggable={false}
    />
  );
}

export function BrandSymbol({ className = "h-5" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/zunex-symbol.svg"
      alt="ZUNEX mark"
      className={className}
      draggable={false}
    />
  );
}

export function BrandContainer({ className = "h-9 w-9" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/zunex-icon.svg"
      alt="ZUNEX"
      className={`${className} rounded-[26.8%]`}
      draggable={false}
    />
  );
}

/**
 * BrandHeader — the full wordmark, top and centre, with a soft ambient glow.
 * Optional absolute left/right slots keep secondary chips off the mark.
 */
export function BrandHeader({
  left,
  right,
  size = "h-4",
}: {
  left?: ReactNode;
  right?: ReactNode;
  size?: string;
}) {
  return (
    <header className="relative flex items-center justify-center min-h-11 pt-1">
      {left ? (
        <div className="absolute left-0 top-1 flex items-center">{left}</div>
      ) : null}
      {right ? (
        <div className="absolute right-0 top-1 flex items-center">{right}</div>
      ) : null}
      <div className="relative flex items-center justify-center">
        <span
          className="absolute -inset-x-8 -inset-y-3 rounded-full bg-[rgba(157,180,255,0.16)] blur-xl pointer-events-none"
          aria-hidden="true"
        />
        <BrandWordmark className={`${size} relative`} />
      </div>
    </header>
  );
}
