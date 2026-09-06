"use client";

import { useEffect } from "react";
import Backdrop from "@/components/visuals/Backdrop";
import DeviceGate from "@/components/screens/DeviceGate";
import Experience from "@/components/Experience";
import DemoPanel from "@/components/DemoPanel";
import { useDemoStore } from "@/lib/client/demoStore";

// ---------------------------------------------------------------------------
// App shell — ambient scene + device gate + the experience + demo controls.
// ---------------------------------------------------------------------------

export default function App({
  stationId,
  demo,
  preview,
}: {
  stationId?: string;
  demo?: boolean;
  preview?: boolean;
}) {
  const hydrate = useDemoStore((s) => s.hydrate);

  useEffect(() => {
    hydrate({ demo });
    if (preview) {
      try {
        localStorage.setItem("zunex:preview", "1");
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Backdrop />
      <div className="relative z-10">
        <DeviceGate>
          <Experience stationId={stationId} />
        </DeviceGate>
      </div>
      <DemoPanel />
    </>
  );
}
