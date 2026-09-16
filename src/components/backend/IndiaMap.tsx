"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gpsToSvg } from "@/lib/core/gps";

export interface StationMapPoint {
  x: number;
  y: number;
  name: string;
  city: string;
  status: "available" | "busy" | "offline";
  deviceModel: "core" | "plus";
  installType: "car" | "mall" | "retail" | "outdoor" | "highway" | "office";
  stationId: string;
}

const statusColors: Record<string, string> = {
  available: "#7dedc4",
  busy: "#fbbf24",
  offline: "#f87171",
};

const modelBadge: Record<string, { bg: string; label: string }> = {
  core: { bg: "#4a63ff", label: "Core" },
  plus: { bg: "#a855f7", label: "Plus" },
};

/**
 * India boundary — world-atlas (Natural Earth 110m), equirectangular projection.
 * Projection is IDENTICAL to gpsToSvg in @/lib/core/gps — every lat/lng pin
 * lands exactly on the boundary, guaranteed.
 */
const INDIA_OUTLINE =
  "M0.0,207.3L2.1,206.0L5.7,205.3L9.8,205.4L10.1,199.5L10.8,199.2L11.6,200.0L12.9,199.5L15.5,199.7L18.8" +
  ",200.0L24.4,199.9L27.2,201.7L31.0,201.7L33.4,200.5L37.3,198.4L41.8,197.3L41.9,198.9L43.8,200.4L45.7," +
  "200.4L47.8,198.6L49.5,198.3L50.5,197.1L49.3,196.1L49.2,194.6L49.8,193.1L50.1,191.3L47.6,185.8L44.5,1" +
  "81.1L43.7,175.8L43.0,174.6L41.1,174.7L37.9,174.7L34.0,170.7L33.5,167.9L34.8,162.9L34.8,160.1L33.2,15" +
  "8.8L27.5,158.0L23.6,155.9L22.9,154.8L24.1,149.1L25.6,147.3L27.4,145.7L33.1,138.9L35.6,135.4L37.8,133" +
  ".8L40.7,133.1L43.2,134.6L44.3,137.6L46.2,138.7L53.0,136.5L59.3,135.8L65.0,134.2L66.4,130.3L70.4,126." +
  "0L72.4,121.1L78.3,117.5L84.0,114.1L88.9,105.9L90.4,101.9L93.1,98.4L99.1,96.2L101.2,93.9L100.3,91.6L1" +
  "00.6,90.2L106.2,84.2L109.1,82.0L113.5,79.5L113.1,78.1L111.5,76.8L112.8,71.8L111.4,67.4L112.1,65.5L11" +
  "5.4,63.2L122.4,60.4L125.6,58.4L125.3,56.6L121.8,54.8L116.2,54.1L114.0,53.0L114.0,48.8L112.7,48.9L108" +
  ".6,48.6L108.2,46.9L107.7,44.6L106.3,44.1L103.2,41.9L102.2,40.5L103.3,39.1L104.9,36.4L104.7,34.8L102." +
  "5,33.2L102.0,31.6L103.8,29.5L106.8,27.6L106.1,26.6L101.5,26.3L100.7,25.3L101.3,24.1L101.9,22.4L99.1," +
  "20.9L99.1,19.1L100.3,17.2L103.3,14.5L107.6,13.0L112.8,13.9L119.1,15.1L123.2,15.3L127.9,17.1L132.4,17" +
  ".7L136.4,15.7L140.5,14.8L146.4,13.4L149.7,12.6L150.8,11.0L153.1,9.9L155.6,7.7L158.0,5.8L162.5,3.5L16" +
  "7.3,1.0L169.1,0.1L170.0,0.6L171.6,0.4L173.3,0.3L172.7,3.4L173.9,6.4L176.8,13.0L178.3,15.9L184.3,17.4" +
  "L187.7,19.7L189.6,21.3L189.6,22.6L185.8,25.1L185.3,26.4L186.4,30.1L186.7,35.6L188.7,37.6L190.3,39.3L" +
  "192.1,40.4L192.3,42.5L192.0,44.1L193.7,45.4L193.7,47.9L194.3,49.7L194.0,53.2L193.1,53.4L191.3,55.4L1" +
  "88.7,55.9L186.1,54.0L185.5,52.3L183.6,52.0L179.8,52.3L179.4,53.0L180.4,55.2L181.1,58.1L184.5,61.9L18" +
  "5.5,63.0L184.6,65.7L185.8,68.2L185.8,70.3L185.9,72.3L185.8,74.7L187.4,74.7L189.2,74.1L190.3,72.7L192" +
  ".0,72.9L196.1,78.2L197.0,78.9L200.1,81.0L204.0,80.7L206.2,82.0L206.4,82.1L210.3,83.8L211.3,85.7L211." +
  "1,87.8L214.8,88.8L218.4,89.9L220.8,91.5L225.0,93.7L224.6,94.7L222.6,95.4L219.7,98.0L217.3,99.7L213.3" +
  ",105.5L212.2,110.0L210.7,113.5L209.2,115.8L208.9,118.7L211.6,120.6L215.0,122.6L216.4,122.2L218.0,121" +
  ".9L220.4,123.6L223.4,125.2L228.2,127.5L229.4,129.2L233.7,132.4L238.5,135.0L240.9,135.8L242.6,135.0L2" +
  "44.7,135.9L250.7,139.3L254.6,139.3L255.7,142.1L261.5,143.4L265.4,144.7L267.0,143.4L270.0,143.2L274.9" +
  ",144.6L278.3,143.1L281.9,143.7L288.6,146.0L289.3,147.7L289.9,150.6L295.8,153.5L297.6,153.8L298.5,155" +
  ".2L299.6,155.8L303.4,154.9L306.8,154.4L307.8,156.4L309.3,158.4L313.1,157.6L317.2,158.5L320.2,159.2L3" +
  "25.3,161.4L330.8,159.2L332.1,161.4L335.6,162.7L339.5,161.9L343.6,161.5L347.9,162.3L349.0,161.5L350.9" +
  ",156.2L350.0,152.6L347.8,148.9L349.3,141.2L350.7,138.0L350.7,136.3L349.8,135.2L350.5,134.4L355.5,133" +
  ".3L357.4,132.5L358.9,131.9L362.2,133.4L362.9,135.9L361.2,142.0L362.7,144.9L363.5,146.0L361.0,148.2L3" +
  "62.3,149.5L363.1,152.0L366.3,153.7L371.4,154.0L373.9,154.8L375.9,155.3L376.2,155.9L378.1,156.4L382.1" +
  ",156.2L386.7,154.0L389.2,153.3L393.0,155.0L396.1,155.4L403.0,154.8L408.2,153.7L409.8,154.7L413.9,154" +
  ".3L416.5,153.8L418.2,153.9L419.5,152.8L418.8,150.6L418.1,149.5L418.8,147.5L419.0,144.8L417.4,143.1L4" +
  "13.7,143.4L411.1,141.4L411.2,139.3L411.8,137.8L415.2,138.0L417.9,138.3L421.0,136.9L422.6,136.3L424.3" +
  ",136.7L426.7,136.3L429.9,134.4L430.3,133.1L429.6,132.4L430.6,130.9L436.4,127.7L438.5,124.8L440.2,122" +
  ".3L447.4,121.2L451.6,119.2L453.6,117.4L455.3,116.1L458.5,113.1L464.2,110.1L466.2,111.2L466.8,112.6L4" +
  "70.9,113.0L475.8,114.8L477.7,115.0L478.9,113.9L480.0,113.0L483.3,110.1L489.1,107.7L490.7,108.9L492.5" +
  ",111.3L494.7,111.3L493.2,112.8L490.6,114.2L490.8,117.1L494.5,115.2L496.6,115.3L498.1,118.7L495.4,122" +
  ".7L494.2,124.7L493.3,125.9L494.1,126.6L495.3,126.9L499.0,125.3L502.0,127.0L505.6,127.5L508.5,127.4L5" +
  "11.6,129.6L511.3,132.0L512.0,133.8L511.4,135.2L508.8,136.4L505.3,138.9L503.8,140.9L504.2,143.5L507.8" +
  ",149.3L505.2,149.0L502.5,146.1L500.1,145.3L491.8,146.7L487.9,149.1L485.6,151.1L479.0,155.7L474.4,157" +
  ".7L472.5,159.8L471.8,162.9L472.8,167.5L473.2,168.4L471.6,170.2L470.7,173.2L468.5,176.3L465.1,178.8L4" +
  "63.5,181.2L463.0,183.1L464.1,184.0L465.7,185.2L465.0,188.2L462.0,193.4L459.9,196.3L457.2,202.7L455.6" +
  ",207.0L453.5,206.5L449.1,205.2L446.9,204.6L444.5,205.2L442.0,203.4L441.2,204.4L443.1,210.4L442.6,216" +
  ".5L441.9,221.1L440.2,222.3L438.7,222.0L438.7,224.2L437.1,227.6L437.6,230.6L438.7,235.2L437.9,236.7L4" +
  "36.6,237.1L435.2,240.3L433.2,240.2L430.9,238.0L430.1,238.5L429.3,240.2L428.1,239.5L427.2,231.0L426.4" +
  ",227.3L425.1,224.4L424.3,221.3L424.1,216.8L422.6,210.4L420.9,209.7L419.0,210.5L417.0,210.3L417.2,213" +
  ".6L414.5,216.1L414.0,218.8L413.9,221.6L411.6,222.9L409.7,222.0L408.3,219.0L407.2,219.0L407.1,221.2L4" +
  "06.6,221.2L405.2,215.9L403.5,210.8L404.7,206.2L406.8,203.7L407.6,203.0L410.7,202.9L412.4,201.4L414.3" +
  ",201.0L416.1,201.3L417.1,199.0L418.3,198.2L419.7,197.9L420.3,196.0L422.2,191.0L422.2,189.1L425.0,189" +
  ".7L426.6,189.3L426.5,187.9L421.9,185.0L414.1,184.1L407.6,184.2L401.4,183.8L393.9,184.0L390.8,184.1L3" +
  "85.2,183.0L380.8,181.7L379.9,181.5L379.6,180.3L379.7,172.0L378.1,166.1L376.4,165.3L375.7,166.8L375.2" +
  ",169.0L372.1,169.0L368.9,167.2L367.4,163.6L365.9,161.8L364.7,161.8L364.7,163.1L365.1,164.7L363.8,164" +
  ".5L361.4,164.1L360.0,163.9L358.9,161.5L355.4,158.9L354.1,160.2L354.8,160.7L355.9,162.0L354.7,163.6L3" +
  "52.2,166.0L350.3,168.8L349.5,171.1L350.7,172.5L354.5,174.5L356.9,177.4L361.5,178.2L362.5,180.4L364.6" +
  ",181.8L364.4,183.0L362.4,183.8L359.9,183.7L356.0,183.6L353.6,189.1L351.4,188.4L348.8,192.1L348.5,193" +
  ".6L350.6,196.1L353.1,196.2L355.0,197.8L359.3,199.0L360.9,200.6L360.6,203.5L359.0,207.9L358.5,211.8L3" +
  "59.2,212.8L361.0,214.8L360.8,218.0L363.8,218.8L363.0,221.8L363.9,225.4L364.3,228.4L365.1,231.3L366.6" +
  ",237.0L366.1,241.5L365.9,243.3L366.5,246.5L364.0,246.5L362.7,246.4L360.6,247.1L360.2,245.1L360.9,239" +
  ".7L359.6,239.2L358.0,243.4L358.3,246.4L353.4,245.3L352.9,245.8L350.2,246.8L349.8,244.0L351.5,237.9L3" +
  "47.9,235.7L347.4,235.8L349.5,237.1L349.9,239.5L347.1,243.5L342.4,246.5L332.3,249.3L328.0,254.0L328.7" +
  ",258.8L330.1,263.5L327.6,266.5L326.5,269.7L321.7,272.9L319.6,275.9L317.2,275.0L318.3,277.0L316.7,277" +
  ".9L305.5,281.5L304.4,280.9L305.2,278.4L303.5,277.9L298.3,282.7L299.4,283.1L303.1,282.1L299.4,284.8L2" +
  "91.0,292.9L288.6,295.9L281.0,304.5L271.8,310.4L267.1,315.4L259.9,321.2L249.1,327.7L247.7,330.6L248.9" +
  ",332.5L248.7,334.7L247.3,337.3L238.6,341.4L232.3,340.7L229.4,342.5L225.8,349.3L224.8,351.5L222.9,351" +
  ".1L221.4,349.6L219.0,349.1L212.8,352.4L208.6,363.7L210.5,372.6L210.7,376.6L209.7,379.1L211.6,385.4L2" +
  "12.0,388.5L212.3,391.4L210.4,388.0L209.7,391.2L213.7,394.2L210.2,410.4L207.3,414.3L203.7,424.0L204.0" +
  ",428.3L202.3,430.7L204.8,431.5L205.1,440.4L203.4,448.7L200.4,448.5L197.0,448.6L194.6,451.0L190.1,459" +
  ".7L188.7,463.8L190.5,466.0L194.9,466.8L197.3,468.5L189.8,467.1L177.4,472.1L175.0,477.9L173.7,482.9L1" +
  "65.3,487.4L160.3,487.1L154.5,482.4L147.2,473.6L145.7,469.0L144.9,468.2L143.2,463.9L141.8,455.4L143.5" +
  ",457.2L144.1,462.3L145.5,462.3L141.8,453.8L140.9,452.5L141.0,450.5L139.2,446.9L134.7,435.3L131.3,427" +
  ".9L127.4,421.8L123.9,418.0L119.0,408.4L116.5,401.1L114.3,391.6L114.1,388.8L111.1,382.0L110.6,379.0L1" +
  "09.1,374.0L107.3,371.3L104.0,366.8L101.5,363.7L98.9,358.0L99.8,356.5L98.4,354.8L97.7,353.3L95.5,349." +
  "5L92.8,344.5L89.1,325.9L87.6,318.4L84.7,309.9L83.8,305.1L82.6,300.2L83.1,297.7L85.0,293.4L83.1,293.5" +
  "L81.4,292.4L81.2,289.3L84.6,288.9L80.7,286.5L81.3,284.5L79.5,280.3L79.0,279.0L82.8,266.0L82.7,261.2L" +
  "81.7,256.7L80.5,255.9L78.3,251.5L80.2,249.8L78.1,250.0L81.5,247.2L86.8,244.8L82.1,246.0L77.7,242.6L7" +
  "9.6,240.9L76.4,240.8L78.3,236.8L81.5,236.2L77.6,235.4L73.2,235.6L71.6,236.0L72.1,238.8L70.1,240.6L68" +
  ".6,242.8L69.1,244.0L71.0,245.2L71.8,248.7L67.6,255.4L56.7,260.5L47.6,263.3L40.7,261.0L32.8,255.0L24." +
  "2,246.1L18.0,240.5L14.2,235.2L15.5,232.6L18.1,234.4L19.5,235.3L26.2,233.2L29.0,232.3L33.7,230.5L38.0" +
  ",225.9L41.2,222.5L40.8,221.0L39.2,222.0L38.2,223.6L35.6,223.2L29.6,225.1L26.3,226.8L11.4,221.6L6.4,2" +
  "16.1L5.1,211.4L10.7,207.4L5.8,209.3L3.2,211.6L0.5,209.6Z M451.4,510.5L448.3,507.5L447.3,505.1L450.2," +
  "503.3L452.1,508.0Z M448.6,501.2L446.2,501.8L447.2,500.7L448.6,501.2L448.6,501.2Z M438.3,485.3L437.8," +
  "485.8L437.1,483.9L438.3,485.3L438.3,485.3Z M443.6,491.9L441.8,491.2L441.6,489.6L443.4,490.6L443.6,49" +
  "1.9L443.6,491.9Z M445.2,488.7L444.2,489.3L444.0,488.4L443.8,486.6L445.1,485.9L445.2,488.7L445.2,488." +
  "7Z M432.1,469.5L430.8,469.0L431.2,467.8L432.0,467.6L432.1,469.5L432.1,469.5Z M427.0,444.2L424.7,444." +
  "4L424.4,440.7L426.1,438.7L428.0,439.8L427.0,444.2L427.0,444.2Z M430.4,429.5L428.7,429.4L429.5,427.2L" +
  "430.3,429.0Z M431.0,426.7L429.9,426.7L428.0,421.4L428.2,419.7L429.3,418.2L430.1,415.0L431.7,414.6L43" +
  "1.9,413.1L430.9,412.1L431.1,407.5L431.2,404.6L432.4,402.8L432.5,400.0L433.3,394.3L436.3,391.0L437.0," +
  "392.9L436.1,394.7L437.0,396.7L435.9,399.1L434.2,401.1L435.2,403.3L434.6,410.4L433.7,414.4L432.3,417." +
  "1L431.3,418.6L432.2,419.9L431.7,422.7L431.0,426.7L431.0,426.7Z M436.1,417.8L435.5,419.2L435.7,417.9Z" +
  " M430.8,403.1L430.2,401.7L430.7,401.3L430.8,403.1L430.8,403.1Z M81.0,432.7L80.9,432.5L81.2,431.6L81." +
  "2,432.0L81.0,432.7L81.0,432.7Z M86.0,484.9L85.5,485.2L85.3,485.0L85.5,485.0L86.2,484.3L86.3,484.2L86" +
  ".0,484.9L86.0,484.9Z";



/** Main Indian cities — real lat/lng, projected through gpsToSvg so labels
 *  stay perfectly aligned with station pins regardless of calibration updates. */
const MAIN_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Delhi",     lat: 28.61, lng: 77.21 },
  { name: "Mumbai",    lat: 19.08, lng: 72.88 },
  { name: "Bangalore", lat: 12.97, lng: 77.59 },
  { name: "Chennai",   lat: 13.08, lng: 80.27 },
  { name: "Kolkata",   lat: 22.57, lng: 88.36 },
  { name: "Hyderabad", lat: 17.39, lng: 78.49 },
  { name: "Ahmedabad", lat: 23.02, lng: 72.57 },
  { name: "Jaipur",    lat: 26.91, lng: 75.79 },
  { name: "Pune",      lat: 18.52, lng: 73.86 },
  { name: "Lucknow",   lat: 26.85, lng: 80.95 },
];

// Pre-compute SVG positions once at module load
const MAIN_CITY_POSITIONS = MAIN_CITIES.map((c) => {
  const { x, y } = gpsToSvg(c.lat, c.lng);
  return { name: c.name, x, y };
});

export function IndiaMap({ stations }: { stations: StationMapPoint[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ?? hovered;

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#0a0f22] via-[#0b1028] to-[#0c1330]">
      {/* Radial glow backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 45% 40%, rgba(36,71,255,0.22), transparent 70%)",
        }}
      />

      {/* Soft tech grid overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(74, 99, 255, 0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* India outline — viewBox 0 0 512 512 (real CC0 outline from SVGRepo) */}
      <svg
        viewBox="0 0 512 512"
        className="relative w-full h-full z-10"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="indiaFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#13204a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0b1430" stopOpacity="0.95" />
          </linearGradient>
          <filter id="indiaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Glow shadow layer */}
        <path
          d={INDIA_OUTLINE}
          fill="none"
          stroke="rgba(36,71,255,0.35)"
          strokeWidth="6"
          filter="url(#indiaGlow)"
          transform="translate(2, 2)"
        />

        {/* Main India outline */}
        <path
          d={INDIA_OUTLINE}
          fill="url(#indiaFill)"
          stroke="rgba(122, 145, 255, 0.55)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Interior subtle grid lines on landmass for premium look */}
        <g opacity="0.05" pointerEvents="none">
          <line x1="0" y1="128" x2="512" y2="128" stroke="white" strokeWidth="0.6" />
          <line x1="0" y1="256" x2="512" y2="256" stroke="white" strokeWidth="0.6" />
          <line x1="0" y1="384" x2="512" y2="384" stroke="white" strokeWidth="0.6" />
          <line x1="128" y1="0" x2="128" y2="512" stroke="white" strokeWidth="0.6" />
          <line x1="256" y1="0" x2="256" y2="512" stroke="white" strokeWidth="0.6" />
          <line x1="384" y1="0" x2="384" y2="512" stroke="white" strokeWidth="0.6" />
        </g>

        {/* Main city labels (decorative, always visible) — derived from real GPS */}
        {MAIN_CITY_POSITIONS.map((c) => (
          <g key={c.name} pointerEvents="none">
            <text
              x={c.x + 6}
              y={c.y - 6}
              fill="rgba(255,255,255,0.55)"
              fontSize="10"
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
              style={{ letterSpacing: "0.02em" }}
            >
              {c.name}
            </text>
          </g>
        ))}

        {/* Pins — scaled for 512×512 viewBox */}
        {stations.map((s) => {
          const color = statusColors[s.status];
          const isActive = active === s.stationId;
          return (
            <g
              key={s.stationId}
              transform={`translate(${s.x}, ${s.y})`}
              onMouseEnter={() => setHovered(s.stationId)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected(selected === s.stationId ? null : s.stationId)}
              style={{ cursor: "pointer" }}
            >
              {/* Pulsing outer halo */}
              <motion.circle
                cx={0}
                cy={0}
                r={13}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0.05, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Middle glow ring */}
              <motion.circle
                cx={0}
                cy={0}
                r={7}
                fill="#2447ff"
                fillOpacity={0.35}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
              />
              {/* Inner status dot */}
              <motion.circle
                cx={0}
                cy={0}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth={0.8}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
              />
              {/* Label above when active */}
              <AnimatePresence>
                {isActive && (
                  <motion.g
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <rect x={-24} y={-28} width={48} height={14} rx={4} fill="rgba(10,15,34,0.92)" stroke={color} strokeWidth={0.6} />
                    <text x={0} y={-18} textAnchor="middle" fill="white" fontSize={6.5} fontWeight={700}>
                      {s.city.slice(0, 10)}
                    </text>
                  </motion.g>
                )}
              </AnimatePresence>
            </g>
          );
        })}
      </svg>

      {/* Tooltip card for selected pin */}
      <AnimatePresence>
        {active && (() => {
          const s = stations.find((p) => p.stationId === active);
          if (!s) return null;
          const color = statusColors[s.status];
          const mb = modelBadge[s.deviceModel];
          return (
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-4 left-4 z-20 pointer-events-none"
              style={{ maxWidth: 260 }}
            >
              <div
                className="rounded-xl border border-white/15 px-4 py-3 backdrop-blur-xl"
                style={{ background: "rgba(10,15,34,0.92)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{s.name}</div>
                    <div className="text-xs text-paper-dim">{s.city}</div>
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
                  >
                    {s.status}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: mb.bg }}
                  >
                    {mb.label}
                  </span>
                  <span className="text-[10px] text-paper-dim uppercase tracking-wider">{s.installType}</span>
                </div>
                <div className="text-[10px] font-mono text-paper-dim/60 mt-1">{s.stationId}</div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
