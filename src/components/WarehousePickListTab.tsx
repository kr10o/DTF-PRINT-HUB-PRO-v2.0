import React, { useMemo } from "react";
import { Order, AggregatedWarehouseItem } from "../types";
import { generateWarehousePickListPDF } from "../lib/pdfGenerator";
import {
  Package,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle,
  Layers,
  ArrowUpDown,
} from "lucide-react";

interface WarehousePickListTabProps {
  orders: Order[];
}

export const WarehousePickListTab: React.FC<WarehousePickListTabProps> = ({ orders }) => {
  const { aggregatedItems, grandTotalPieces, missingVisuals, missingPreps } = useMemo(() => {
    const aggMap: Record<string, AggregatedWarehouseItem> = {};
    let total = 0;
    const visuals: { invoice: string; client: string }[] = [];
    const preps: { invoice: string; client: string }[] = [];

    for (const order of orders) {
      if (order.zahtijeva_vizual) {
        visuals.push({ invoice: order.broj_racuna, client: order.naziv_klijenta });
      }
      if (order.nedostaje_priprema) {
        preps.push({ invoice: order.broj_racuna, client: order.naziv_klijenta });
      }

      for (const item of order.artikli) {
        const key = `${item.naziv_artikla}__${item.boja || "N/A"}__${item.velicina || "N/A"}__${item.kategorija}`;
        if (!aggMap[key]) {
          aggMap[key] = {
            naziv_artikla: item.naziv_artikla,
            boja: item.boja || "-",
            velicina: item.velicina || "-",
            kategorija: item.kategorija,
            ukupno_komada: 0,
            narudzbe_popis: [],
          };
        }
        aggMap[key].ukupno_komada += item.kolicina;
        if (!aggMap[key].narudzbe_popis.includes(order.broj_racuna)) {
          aggMap[key].narudzbe_popis.push(order.broj_racuna);
        }
        total += item.kolicina;
      }
    }

    return {
      aggregatedItems: Object.values(aggMap).sort((a, b) => b.ukupno_komada - a.ukupno_komada),
      grandTotalPieces: total,
      missingVisuals: visuals,
      missingPreps: preps,
    };
  }, [orders]);

  const handleDownloadPdf = () => {
    const doc = generateWarehousePickListPDF(orders);
    doc.save(`Skladisna_PickLista_${new Date().toISOString().substring(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-[#4FC3F7] border border-cyan-500/30">
                FAZA 8: SKLADIŠNA PICK-LISTA & FPDF2 EXPORT
              </span>
              <span className="text-xs text-slate-400">A4 Format • Unicode HR Dijakritici (Č, Ć, Đ, Š, Ž)</span>
            </div>
            <h2 className="text-xl font-bold text-white">Skladišna Pick-Lista za Izuzimanje Blanko Tekstila</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Konsolidirani popis artikala po modelima, bojama i veličinama s referencama računa.
            </p>
          </div>

          <button
            id="download-warehouse-pdf-btn"
            onClick={handleDownloadPdf}
            className="px-4 py-2 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Preuzmi Skladišni A4 PDF
          </button>
        </div>

        {/* Quick Numbers Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
          <div className="glass-panel-inset p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Ukupno Komada</span>
              <span className="text-lg font-bold text-[#4FC3F7]">{grandTotalPieces} kom</span>
            </div>
            <Package className="w-6 h-6 text-[#4FC3F7]/50" />
          </div>

          <div className="glass-panel-inset p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Različitih Stavki</span>
              <span className="text-lg font-bold text-purple-300">{aggregatedItems.length} modela</span>
            </div>
            <Layers className="w-6 h-6 text-purple-400/50" />
          </div>

          <div className="glass-panel-inset p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Upozorenja Prepressa</span>
              <span className="text-lg font-bold text-amber-300">
                {missingVisuals.length + missingPreps.length} naloga
              </span>
            </div>
            <AlertTriangle className="w-6 h-6 text-amber-400/50" />
          </div>
        </div>
      </div>

      {/* Warnings & Alerts */}
      {(missingVisuals.length > 0 || missingPreps.length > 0) && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-2">
          <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            UPOZORENJA ZA SKLADIŠTARA I OPERATERA TISKA:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-200/90">
            {missingVisuals.map((v, i) => (
              <div key={i} className="p-2 rounded bg-black/40 border border-amber-500/20">
                ⚠️ <span className="font-bold">{v.invoice}</span> ({v.client}): Čeka odobrenje vizuala prije tiska!
              </div>
            ))}
            {missingPreps.map((p, i) => (
              <div key={i} className="p-2 rounded bg-black/40 border border-rose-500/20 text-rose-300">
                🚨 <span className="font-bold">{p.invoice}</span> ({p.client}): Nedostaje grafička priprema!
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warehouse Aggregated Table */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#4FC3F7]" />
            Tablica Skladišnog Izuzimanja
          </h3>
          <span className="text-xs text-slate-400">Sortirano po količini padajuće</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 neo-shadow">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-white/5 text-[#4FC3F7] text-[10px] uppercase font-bold tracking-wider border-b border-white/10">
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-4">Naziv Modela Artikla</th>
                <th className="py-3 px-4">Boja</th>
                <th className="py-3 px-4">Veličina</th>
                <th className="py-3 px-4">Kategorija</th>
                <th className="py-3 px-4 text-right">Količina</th>
                <th className="py-3 px-4">Pripadajući Računi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {aggregatedItems.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-white/5 transition-colors text-slate-200"
                >
                  <td className="py-3 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-3 px-4 font-semibold text-white">{item.naziv_artikla}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px]">
                      {item.boja}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono font-bold text-[#4FC3F7] text-[11px]">
                      {item.velicina}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.kategorija === "Tekstil"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      {item.kategorija}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-bold text-[#4FC3F7]">{item.ukupno_komada} kom</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {item.narudzbe_popis.map((rn, rIdx) => (
                        <span
                          key={rIdx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono border border-white/10"
                        >
                          {rn}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-white/5 border-t border-white/15">
                <td colSpan={5} className="py-3 px-4 font-bold text-white text-right">
                  UKUPNO ZA IZUZIMANJE:
                </td>
                <td className="py-3 px-4 text-right font-bold text-base text-emerald-400">
                  {grandTotalPieces} kom
                </td>
                <td className="py-3 px-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
