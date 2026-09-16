"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface Props {
  data: number[];
  color?: string;
  height?: number;
  label?: string;
  xLabels?: string[];
}

// Catmull-Rom to Bezier spline — smooth bezier curve approximation
function catmullRomToBezier(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const d = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

export function SparklineChart({
  data,
  color = "#2447ff",
  height = 200,
  label,
  xLabels,
}: Props) {
  const width = 600;
  const padding = { top: 20, right: 20, bottom: 32, left: 12 };

  const { linePath, areaPath, points, maxVal, lastPoint } = useMemo(() => {
    const max = Math.max(...data, 1);
    const min = 0;
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;
    const pts = data.map((v, i) => ({
      x: padding.left + i * stepX,
      y: padding.top + chartH - ((v - min) / (max - min)) * chartH,
    }));

    const line = catmullRomToBezier(pts);
    const area = `${line} L ${pts[pts.length - 1].x} ${padding.top + chartH} L ${pts[0].x} ${padding.top + chartH} Z`;

    return {
      linePath: line,
      areaPath: area,
      points: pts,
      maxVal: max,
      lastPoint: pts[pts.length - 1],
    };
  }, [data, height]);

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-paper-dim/70 uppercase">
            {label}
          </div>
          <div className="text-[11px] text-paper-dim/50">Peak: {maxVal}</div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`spark-fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Animated area fill */}
        <motion.path
          d={areaPath}
          fill={`url(#spark-fill-${color.replace("#", "")})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
        />

        {/* Animated line stroke */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Last data point — glowing circle */}
        <motion.circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={5}
          fill={color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        />
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={10}
          fill={color}
          opacity={0.2}
        />

        {/* X labels */}
        {xLabels &&
          xLabels.map((l, i) => {
            const p = points[i];
            if (!p) return null;
            return (
              <text
                key={i}
                x={p.x}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(170, 179, 207, 0.5)"
                fontFamily="var(--font-space), system-ui"
              >
                {l}
              </text>
            );
          })}
      </svg>
    </div>
  );
}
