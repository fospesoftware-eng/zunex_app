import App from "@/components/App";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const s = typeof params.s === "string" ? params.s : undefined;
  const demo = typeof params.demo === "string" && params.demo !== "0";
  const preview = typeof params.preview === "string" && params.preview !== "0";
  return <App stationId={s} demo={demo} preview={preview} />;
}
