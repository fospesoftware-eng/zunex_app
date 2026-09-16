// ---------------------------------------------------------------------------
// GPS → SVG coordinate helper.
// Equirectangular (Plate Carrée) projection into viewBox 0 0 512 512.
// Bounds extracted from world-atlas India geometry (Natural Earth 110m).
// THIS IS THE SAME PROJECTION used to generate INDIA_OUTLINE — every lat/lng
// pin lands exactly on the boundary, guaranteed.
// ---------------------------------------------------------------------------

// Geographic bounds (WGS84) — from world-atlas India MultiPolygon
const LAT_MIN = 6.75;
const LAT_MAX = 35.50;
const LNG_MIN = 68.16;
const LNG_MAX = 97.34;

const SVG_W = 512;
const SVG_H = 512;

export interface SvgPoint {
  x: number;
  y: number;
}

/** Convert WGS84 lat/lng to an x,y point inside the India outline SVG. */
export function gpsToSvg(lat: number, lng: number): SvgPoint {
  const x = (lng - LNG_MIN) * (SVG_W / (LNG_MAX - LNG_MIN));
  const y = (LAT_MAX - lat) * (SVG_H / (LAT_MAX - LAT_MIN));
  return {
    x: Math.max(4, Math.min(SVG_W - 4, x)),
    y: Math.max(4, Math.min(SVG_H - 4, y)),
  };
}
