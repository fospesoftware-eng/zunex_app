"use client";

import { useState } from "react";
import { FileSpreadsheet, Wallet, Wifi, Download } from "lucide-react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Button } from "@/components/backend/Button";
import { Modal } from "@/components/backend/Modal";
import { TextField } from "@/components/backend/TextField";
import { useToast } from "@/components/backend/Toast";

interface ReportCard {
  title: string;
  description: string;
  icon: typeof FileSpreadsheet;
  iconBgFrom: string;
  iconBgTo: string;
  iconColor: string;
  format: string;
}

const reports: ReportCard[] = [
  {
    title: "Daily operations report",
    description: "Sessions, revenue, utilization",
    icon: FileSpreadsheet,
    iconBgFrom: "from-[#4a63ff]/30",
    iconBgTo: "to-[#2447ff]/5",
    iconColor: "#a9bcff",
    format: "CSV · XLSX",
  },
  {
    title: "Revenue summary",
    description: "PDF with plan breakdown, hourly distribution",
    icon: Wallet,
    iconBgFrom: "from-[#7dedc4]/30",
    iconBgTo: "to-[#7dedc4]/5",
    iconColor: "#7dedc4",
    format: "PDF",
  },
  {
    title: "Hardware health",
    description: "Device connectivity, firmware, MQTT status",
    icon: Wifi,
    iconBgFrom: "from-[#ffb020]/30",
    iconBgTo: "to-[#ffb020]/5",
    iconColor: "#ffb020",
    format: "PDF",
  },
];

export default function ReportsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportCard | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const toast = useToast();

  const openGenerate = (r: ReportCard) => {
    setActiveReport(r);
    // Default date range: last 7 days
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    setToDate(today.toISOString().slice(0, 10));
    setFromDate(weekAgo.toISOString().slice(0, 10));
    setModalOpen(true);
  };

  const handleGenerate = () => {
    const name = activeReport?.title ?? "Report";
    setModalOpen(false);
    setActiveReport(null);
    toast.show("success", `${name} queued · you'll receive it via email`);
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Generate scheduled or on-demand operational reports."
      />

      <div className="grid md:grid-cols-3 gap-6">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <GlassCard key={r.title} className="hover:border-white/20 transition group">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${r.iconBgFrom} ${r.iconBgTo} border border-white/10 mb-4`}
              >
                <Icon size={20} style={{ color: r.iconColor }} />
              </div>
              <h3 className="font-display text-lg font-semibold text-paper tracking-tight mb-1.5">
                {r.title}
              </h3>
              <p className="text-sm text-paper-dim mb-4">{r.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-paper-dim/60 uppercase tracking-wider">
                  {r.format}
                </span>
                <Button
                  size="sm"
                  onClick={() => openGenerate(r)}
                  className="opacity-90 group-hover:opacity-100"
                >
                  <Download size={14} />
                  Generate
                </Button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={activeReport?.title ?? "Generate report"}>
        <div className="space-y-4">
          <p className="text-sm text-paper-dim">
            Select the date range for your report. It will be processed and emailed to your admin account.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="From"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <TextField
              label="To"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate}>Generate report</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
