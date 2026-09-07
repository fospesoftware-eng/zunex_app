import App from "@/components/App";

/** QR codes link here: /s/ZNX-A1 — station identified from the path. */
export default async function StationEntry({
  params,
  searchParams,
}: {
  params: Promise<{ stationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { stationId } = await params;
  const sp = await searchParams;
  const demo = typeof sp.demo === "string" && sp.demo !== "0";
  const preview = typeof sp.preview === "string" && sp.preview !== "0";
  return <App stationId={stationId} demo={demo} preview={preview} />;
}
