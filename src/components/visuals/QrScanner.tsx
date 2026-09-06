"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/kit";

// ---------------------------------------------------------------------------
// QrScanner — full-screen camera overlay that reads the QR code on a ZUNEX
// station and jumps to that station. Uses the native BarcodeDetector API
// (Chrome/Android/Safari 18+); degrades to a friendly message where absent.
// ---------------------------------------------------------------------------

/* BarcodeDetector is not yet in the default TS DOM lib. */
interface DetectedCode {
  rawValue?: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedCode[]>;
}

type ScanError = "unsupported" | "camera" | "invalid" | null;

/** Extract a station id from a scanned QR payload (URL or raw code). */
export function stationFromPayload(raw: string): string | null {
  const value = raw.trim();
  // Direct station code, e.g. "ZNX-A1"
  if (/^[A-Z0-9]{2,10}-?[A-Z0-9]{0,10}$/i.test(value) && value.includes("-")) {
    return value.toUpperCase();
  }
  try {
    const url = new URL(value, window.location.origin);
    const match = url.pathname.match(/\/s\/([A-Z0-9-]+)/i);
    if (match) return match[1].toUpperCase();
  } catch {
    /* not a URL */
  }
  return null;
}

export default function QrScanner({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const rafRef = useRef(0);
  const lastInvalidRef = useRef(0);
  const [error, setError] = useState<ScanError>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    doneRef.current = false;
    lastInvalidRef.current = 0;
    setError(null);

    const stopStream = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    async function start() {
      const BD = (
        window as unknown as { BarcodeDetector?: new (opts?: unknown) => BarcodeDetectorLike }
      ).BarcodeDetector;

      if (!BD || !navigator.mediaDevices?.getUserMedia) {
        setError("unsupported");
        return;
      }

      let detector: BarcodeDetectorLike;
      try {
        detector = new BD({ formats: ["qr_code"] });
      } catch {
        detector = new BD();
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
            /* autoplay/gesture — the scan loop still attaches when ready */
          });
        }

        const tick = async () => {
          if (cancelled || doneRef.current) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              const payload = codes?.[0]?.rawValue;
              if (payload) {
                const id = stationFromPayload(payload);
                if (id) {
                  doneRef.current = true;
                  navigator.vibrate?.(70);
                  streamRef.current?.getTracks().forEach((t) => t.stop());
                  window.location.href = `/s/${id}`;
                  return;
                }
                // Not a ZUNEX code — flash a hint but keep scanning.
                const now = Date.now();
                if (now - lastInvalidRef.current > 1600) {
                  lastInvalidRef.current = now;
                  setError("invalid");
                  setTimeout(() => {
                    if (!cancelled && !doneRef.current) setError(null);
                  }, 1600);
                }
              }
            } catch {
              /* frame not ready — keep scanning */
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setError("camera");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="qr-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-label="Scan station QR code"
        >
          <video ref={videoRef} className="qr-video" playsInline muted autoPlay />

          <div className="qr-scrim" aria-hidden="true" />

          {/* Top bar */}
          <div className="qr-topbar">
            <span className="qr-title font-display">
              <Icon name="qr" size={16} />
              Scan station code
            </span>
            <button
              type="button"
              className="qr-close"
              aria-label="Close scanner"
              onClick={onClose}
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* Viewfinder */}
          {!error && (
            <div className="qr-frame" aria-hidden="true">
              {[
                "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
                "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
                "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
                "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl",
              ].map((pos) => (
                <span
                  key={pos}
                  className={`absolute w-10 h-10 border-signal-300 drop-shadow-[0_0_8px_rgba(125,151,255,0.7)] ${pos}`}
                />
              ))}
              <motion.span
                className="absolute left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-transparent via-signal-300 to-transparent shadow-[0_0_12px_rgba(125,151,255,0.9)]"
                animate={{ top: ["10%", "88%", "10%"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          )}

          {/* Bottom hint / error states */}
          <div className="qr-footer">
            {!error && (
              <p className="qr-hint">Point your camera at the QR code on the ZUNEX station</p>
            )}
            {error === "camera" && (
              <div className="qr-message">
                <Icon name="power" size={26} className="text-ember-400" />
                <p className="font-display font-semibold mt-2">Camera unavailable</p>
                <p className="text-paper-dim text-sm mt-1">
                  Allow camera access in your browser settings to scan.
                </p>
              </div>
            )}
            {error === "unsupported" && (
              <div className="qr-message">
                <Icon name="qr" size={26} className="text-signal-300" />
                <p className="font-display font-semibold mt-2">Scanning not supported</p>
                <p className="text-paper-dim text-sm mt-1">
                  Open the station link directly or use Chrome on Android.
                </p>
              </div>
            )}
            {error === "invalid" && (
              <div className="qr-message">
                <Icon name="info" size={26} className="text-amber-400" />
                <p className="font-display font-semibold mt-2">Not a ZUNEX code</p>
                <p className="text-paper-dim text-sm mt-1">Try scanning the station QR again.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
