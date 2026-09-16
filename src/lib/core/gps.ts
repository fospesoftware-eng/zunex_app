// ---------------------------------------------------------------------------
// GPS → SVG coordinate helper.
// India roughly spans: lat 8°N–36°N, lng 68°E–97°E.
// Linear mapping into the 241×260 viewBox of the real India outline.
// ---------------------------------------------------------------------------

const LAT_MIN = 8;
const LAT_MAX = 36;
const LNG_MIN = 68;
const LNG_MAX = 97;
const SVG_W = 241;
const SVG_H = 260;

export interface SvgPoint {
  x: number;
  y: number;
}

/** Convert WGS84 lat/lng to an x,y point inside the India outline SVG viewBox. */
export function gpsToSvg(lat: number, lng: number): SvgPoint {
  const x = (lng - LNG_MIN) * (SVG_W / (LNG_MAX - LNG_MIN));
  const y = (LAT_MAX - lat) * (SVG_H / (LAT_MAX - LAT_MIN));
  // Clamp so pins never render outside the outline
  return {
    x: Math.max(2, Math.min(SVG_W - 2, x)),
    y: Math.max(2, Math.min(SVG_H - 2, y)),
  };
}
