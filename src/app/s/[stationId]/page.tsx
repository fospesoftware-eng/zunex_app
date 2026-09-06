import App from "@/components/App";

/** QR codes link here: /s/ZNX-A1 — station identified from the path. */
export default async function StationEntry({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  return <App stationId={stationId} demo={false} preview={false} />;
}
