// ---------------------------------------------------------------------------
// GPS → SVG coordinate helper.
// India roughly spans: lat 8°N–36°N, lng 67°E–93°E.
// Calibrated against the CC0 SVGRepo India outline (viewBox 0 0 512 512)
// by extracting the landmass bounding box and running linear regression
// with 10 known city positions from a proper geographic reference map.
// ---------------------------------------------------------------------------

// Geographic bounds (WGS84) — calibrated, not arbitrary
const LAT_MIN = 8.1;
const LAT_MAX = 36.0;
const LNG_MIN = 67.2;
const LNG_MAX = 92.5;

// Actual landmass bounding box of the SVG path (not the full 512×512 viewBox).
// Extracted by parsing the SVG path d-attribute.
const LAND_X_MIN = 26.39;
const LAND_X_MAX = 485.72;
const LAND_Y_MIN = -0.38;
const LAND_Y_MAX = 512.0;
const LAND_W = LAND_X_MAX - LAND_X_MIN;
const LAND_H = LAND_Y_MAX - LAND_Y_MIN;

// Fallback viewBox dimensions (used for clamping only)
const SVG_W = 512;
const SVG_H = 512;

export interface SvgPoint {
  x: number;
  y: number;
}

/** Convert WGS84 lat/lng to an x,y point inside the India outline SVG viewBox. */
export function gpsToSvg(lat: number, lng: number): SvgPoint {
  // Map longitude → landmass-local X, then offset into viewBox
  const x = LAND_X_MIN + (lng - LNG_MIN) * (LAND_W / (LNG_MAX - LNG_MIN));
  // Map latitude (inverted — higher lat = lower SVG y) → landmass-local Y
  const y = LAND_Y_MIN + (LAT_MAX - lat) * (LAND_H / (LAT_MAX - LAT_MIN));
  // Clamp so pins never render outside the landmass + small padding
  return {
    x: Math.max(4, Math.min(SVG_W - 4, x)),
    y: Math.max(4, Math.min(SVG_H - 4, y)),
  };
}
