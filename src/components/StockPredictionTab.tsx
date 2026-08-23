import React, { useState, useMemo } from "react";
import { Order, StockPredictionItem } from "../types";
import { calculateStockPredictions } from "../lib/analyticsEngine";
import {
  Boxes,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Calculator,
  RefreshCw,
  PlusCircle,
  ShoppingCart,
} from "lucide-react";

interface StockPredictionTabProps {
  orders: Order[];
}

export const StockPredictionTab: React.FC<StockPredictionTabProps> = ({ orders }) => {
  const initialPredictions = useMemo(() => calculateStockPredictions(orders), [orders]);
  const [predictions, setPredictions] = useState<StockPredictionItem[]>(initialPredictions);

  const handleAdjustCurrentStock = (id: string, newStock: number) => {
    setPredictions((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedStock = Math.max(0, newStock);
          const deficit = Math.max(0, item.preporucena_zaliha - updatedStock);
          let status: "OK" | "UPOZORENJE" | "KRITIČNO" = "OK";
          if (updatedStock < item.dnevna_potrosnja) status = "KRITIČNO";
          else if (updatedStock < item.preporucena_zaliha) status = "UPOZORENJE";

          return {
            ...item,
            trenutna_zaliha: updatedStock,
            deficit,
            status,
          };
        }
        return item;
      })
    );
  };

  const criticalCount = predictions.filter((p) => p.status === "KRITIČNO").length;
  const warningCount = predictions.filter((p) => p.status === "UPOZORENJE").length;

  return (
    <div className="space-y-6">
      {/* Header & Formula Explanation */}
      <div className="glass-panel p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-[#4FC3F7] border border-cyan-500/30">
                FAZA 9: MATEMATIČKA PREDIKCIJA ZALIHA
              </span>
              <span className="text-xs text-slate-400">Sigurnosni Koeficijent = 2.5 • Baza = +5</span>
            </div>
            <h2 className="text-xl font-bold text-white">Predikcija Sigurnosnih Zaliha Blanko Tekstila</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Automatski izračun minimalne potrebne zalihe na skladištu kako bi se spriječili zastoji u tiskari.
            </p>
          </div>

          {/* Formula Display Badge */}
          <div className="px-4 py-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-center">
            <span className="text-[10px] text-cyan-300 block uppercase font-mono tracking-wider">
              Algoritamska Formula Nabave:
            </span>
            <span className="text-sm font-bold text-white font-mono">
              Sigurnosna Zaliha = ⌊ Dnevna Potrošnja × 2.5 ⌋ + 5
            </span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
          <div className="glass-panel-inset p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Ukupno Modela</span>
              <span className="text-lg font-bold text-white">{predictions.length} stavki</span>
            </div>
            <Boxes className="w-6 h-6 text-slate-500" />
          </div>

          <div className="glass-panel-inset p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Upozorenje Zalihe</span>
              <span className="text-lg font-bold text-amber-300">{warningCount} modela</span>
            </div>
            <AlertCircle className="w-6 h-6 text-amber-400/60" />
          </div>

          <div className="glass-panel-inset p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Kritični Deficit</span>
              <span className="text-lg font-bold text-rose-400">{criticalCount} modela</span>
            </div>
            <ShieldAlert className="w-6 h-6 text-rose-400/60" />
          </div>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#4FC3F7]" />
            Tablica Predikcije i Deficita Blanko Majica
          </h3>
          <span className="text-xs text-slate-400">Interaktivno prilagođavanje zalihe</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.08)]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[rgba(14,16,23,0.9)] text-[#4FC3F7] border-b border-[rgba(255,255,255,0.1)]">
                <th className="py-3 px-4 font-bold">Model Blanko Tekstila</th>
                <th className="py-3 px-4 font-bold">Boja</th>
                <th className="py-3 px-4 font-bold">Veličina</th>
                <th className="py-3 px-4 font-bold text-center">Dnevna Potrošnja</th>
                <th className="py-3 px-4 font-bold text-center">Trenutno na Stanju</th>
                <th className="py-3 px-4 font-bold text-center">Preporučena Zaliha (Formula)</th>
                <th className="py-3 px-4 font-bold text-center">Deficit za Narudžbu</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {predictions.map((p) => (
                <tr key={p.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">{p.naziv_artikla}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px]">
                      {p.boja}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono font-bold text-cyan-300 text-[11px]">
                      {p.velicina}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-300">{p.dnevna_potrosnja} kom</td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        value={p.trenutna_zaliha}
                        onChange={(e) => handleAdjustCurrentStock(p.id, parseInt(e.target.value, 10) || 0)}
                        className="w-16 glass-input py-1 px-2 text-center rounded font-mono font-bold text-xs"
                      />
                      <span className="text-slate-400 text-[10px]">kom</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#4FC3F7]">
                    {p.preporucena_zaliha} kom
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.deficit > 0 ? (
                      <span className="text-xs font-bold text-rose-400 font-mono">+{p.deficit} kom</span>
                    ) : (
                      <span className="text-xs text-emerald-400 font-bold">0 (Dovoljno)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.status === "KRITIČNO" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        KRITIČNO
                      </span>
                    ) : p.status === "UPOZORENJE" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        UPOZORENJE
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
