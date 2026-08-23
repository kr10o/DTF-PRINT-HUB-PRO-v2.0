import React, { useState } from "react";
import { Order } from "../types";
import {
  generateAnsiSqlExport,
  generateErpXmlExport,
  generateEodShiftReport,
} from "../lib/analyticsEngine";
import {
  Database,
  FileCode,
  ClipboardCheck,
  Download,
  Copy,
  Check,
  Layers,
  Sparkles,
} from "lucide-react";

interface IntegrationsEodTabProps {
  orders: Order[];
}

export const IntegrationsEodTab: React.FC<IntegrationsEodTabProps> = ({ orders }) => {
  const [activeSubTab, setActiveSubTab] = useState<"sql" | "xml" | "eod">("eod");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const sqlContent = generateAnsiSqlExport(orders);
  const xmlContent = generateErpXmlExport(orders);
  const eodReport = generateEodShiftReport(orders);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-[#4FC3F7] border border-cyan-500/30">
                FAZA 9: INTEGRACIJE, ERP IZVOZ & EOD ZAKLJUČAK
              </span>
              <span className="text-xs text-slate-400">ANSI SQL (Transakcije) • ERP XML • Dnevni Izvještaj</span>
            </div>
            <h2 className="text-xl font-bold text-white">Izvoz Podataka & Zaključenje Smjene (EOD)</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Generiranje strukturiranih datoteka za ERP računovodstvo, SQL baze i operativni sažetak smjene za tiskaru.
            </p>
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[rgba(5,6,10,0.8)] border border-[rgba(255,255,255,0.1)]">
            <button
              onClick={() => setActiveSubTab("eod")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === "eod"
                  ? "bg-[#0288D1] text-white shadow-[0_0_10px_rgba(79,195,247,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📋 EOD Izvještaj Smjene
            </button>
            <button
              onClick={() => setActiveSubTab("sql")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === "sql"
                  ? "bg-[#0288D1] text-white shadow-[0_0_10px_rgba(79,195,247,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🗄️ ANSI SQL (Transakcije)
            </button>
            <button
              onClick={() => setActiveSubTab("xml")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === "xml"
                  ? "bg-[#0288D1] text-white shadow-[0_0_10px_rgba(79,195,247,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📄 ERP XML Export
            </button>
          </div>
        </div>
      </div>

      {/* Content Area Based on Sub-Tab */}
      {activeSubTab === "eod" && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                Dnevni Izvještaj Smjene (End-of-Day Shift Summary)
              </h3>
              <p className="text-xs text-slate-400">Tekstualni sažetak spreman za kopiranje u e-mail ili chat</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(eodReport, "eod")}
                className="px-3.5 py-1.5 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-1.5"
              >
                {copiedType === "eod" ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedType === "eod" ? "Kopirano!" : "Kopiraj u Međuspremnik"}
              </button>
              <button
                onClick={() => downloadFile(eodReport, `EOD_Izvjestaj_${new Date().toISOString().substring(0, 10)}.txt`, "text/plain")}
                className="px-3.5 py-1.5 rounded-lg glass-button-secondary text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Spremi .txt
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-[#050508] border border-[rgba(255,255,255,0.1)] text-xs font-mono text-cyan-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {eodReport}
          </pre>
        </div>
      )}

      {activeSubTab === "sql" && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-[#4FC3F7]" />
                ANSI SQL Izvoz s Transakcijama (BEGIN...COMMIT)
              </h3>
              <p className="text-xs text-slate-400">Tablice: invoices, order_items • PostgreSQL & MySQL kompatibilno</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(sqlContent, "sql")}
                className="px-3.5 py-1.5 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-1.5"
              >
                {copiedType === "sql" ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedType === "sql" ? "Kopirano!" : "Kopiraj SQL"}
              </button>
              <button
                onClick={() => downloadFile(sqlContent, `dtf_orders_export_${new Date().toISOString().substring(0, 10)}.sql`, "text/sql")}
                className="px-3.5 py-1.5 rounded-lg glass-button-secondary text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Spremi .sql
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-[#050508] border border-[rgba(255,255,255,0.1)] text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed max-h-[500px]">
            {sqlContent}
          </pre>
        </div>
      )}

      {activeSubTab === "xml" && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                ERP XML Izvoz (DokumentiExport Schema)
              </h3>
              <p className="text-xs text-slate-400">Strukturirani XML za računovodstvene i ERP sustave</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(xmlContent, "xml")}
                className="px-3.5 py-1.5 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-1.5"
              >
                {copiedType === "xml" ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedType === "xml" ? "Kopirano!" : "Kopiraj XML"}
              </button>
              <button
                onClick={() => downloadFile(xmlContent, `DokumentiExport_${new Date().toISOString().substring(0, 10)}.xml`, "application/xml")}
                className="px-3.5 py-1.5 rounded-lg glass-button-secondary text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Spremi .xml
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-[#050508] border border-[rgba(255,255,255,0.1)] text-xs font-mono text-purple-200 overflow-x-auto whitespace-pre leading-relaxed max-h-[500px]">
            {xmlContent}
          </pre>
        </div>
      )}
    </div>
  );
};
