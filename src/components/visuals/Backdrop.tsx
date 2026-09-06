"use client";

/** Ambient scene: drifting light beams over deep ink, grain and vignette. */
export default function Backdrop() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="beam beam-a" />
      <div className="beam beam-b" />
      <div className="beam beam-c" />
      <div className="vignette" />
      <div className="grain" />
    </div>
  );
}
