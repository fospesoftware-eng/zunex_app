// ---------------------------------------------------------------------------
// GPS → SVG coordinate helper.
// India roughly spans: lat 8°N–36°N, lng 68°E–97°E.
// Linear mapping into the 800×600 viewBox used by the stylized outline map.
// ---------------------------------------------------------------------------

const LAT_MIN = 8;
const LAT_MAX = 36;
const LNG_MIN = 68;
const LNG_MAX = 97;
const SVG_W = 800;
const SVG_H = 600;

export interface SvgPoint {
  x: number;
  y: number;
}

/** Convert WGS84 lat/lng to an x,y point inside the India outline SVG viewBox. */
export function gpsToSvg(lat: number, lng: number): SvgPoint {
  const x = (lng - LNG_MIN) * (SVG_W / (LNG_MAX - LNG_MIN));
  const y = (LAT_MAX - lat) * (SVG_H / (LAT_MAX - LAT_MIN));
  return { x: Math.round(x), y: Math.round(y) };
}
