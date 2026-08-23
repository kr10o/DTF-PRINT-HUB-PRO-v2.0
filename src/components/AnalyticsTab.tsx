import React, { useMemo } from "react";
import { Order } from "../types";
import { calculateAnalytics } from "../lib/analyticsEngine";
import {
  TrendingUp,
  Euro,
  Users,
  PieChart,
  BarChart3,
  Shirt,
  ShoppingBag,
  Award,
} from "lucide-react";

interface AnalyticsTabProps {
  orders: Order[];
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ orders }) => {
  const analytics = useMemo(() => calculateAnalytics(orders), [orders]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-[#4FC3F7] border border-cyan-500/30">
            FAZA 9: POSLOVNA ANALITIKA & METRIKE
          </span>
          <span className="text-xs text-slate-400">Pandas Engine • B2B/B2C Omjeri</span>
        </div>
        <h2 className="text-xl font-bold text-white">Poslovna & Proizvodna Analitika</h2>
        <p className="text-xs text-slate-300 mt-0.5">
          Pregled financijskih pokazatelja, strukture kupaca i najtraženijih veličina i boja tekstila.
        </p>

        {/* 4 Main KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="glass-panel-inset p-4 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Ukupni Prihod</span>
              <Euro className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{analytics.totalRevenue.toFixed(2)} €</div>
            <span className="text-[10px] text-slate-500">Na temelju {analytics.totalOrders} naloga</span>
          </div>

          <div className="glass-panel-inset p-4 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">B2B / B2C Omjer</span>
              <Users className="w-4 h-4 text-[#4FC3F7]" />
            </div>
            <div className="text-2xl font-black text-[#4FC3F7]">{analytics.b2bPercentage}% B2B</div>
            <span className="text-[10px] text-slate-400">
              {analytics.b2bOrdersCount} tvrtki • {analytics.b2cOrdersCount} privatnih
            </span>
          </div>

          <div className="glass-panel-inset p-4 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Tekstilni Artikli</span>
              <Shirt className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-sky-400">{analytics.totalGarments} kom</div>
            <span className="text-[10px] text-slate-500">Majice, hudice, pregače</span>
          </div>

          <div className="glass-panel-inset p-4 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Promo & UV Artikli</span>
              <ShoppingBag className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400">{analytics.totalPromo} kom</div>
            <span className="text-[10px] text-slate-500">Kape, torbe, ručnici, vrećice</span>
          </div>
        </div>
      </div>

      {/* Grid: Top Clients & Sizes/Colors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients Ranking */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Rang Lista Klijenata po Vrijednosti
            </h3>
            <span className="text-xs text-slate-400">Top naručitelji</span>
          </div>

          <div className="space-y-2.5">
            {analytics.topClients.map((client, idx) => {
              const maxSpent = analytics.topClients[0]?.totalSpent || 1;
              const pct = Math.round((client.totalSpent / maxSpent) * 100);

              return (
                <div key={idx} className="glass-panel-inset p-3 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-[#4FC3F7]">
                        {idx + 1}
                      </span>
                      {client.name}
                    </span>
                    <span className="font-bold text-emerald-400">{client.totalSpent.toFixed(2)} €</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0288D1] to-[#4FC3F7] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Naručeno artikala: {client.itemsCount} kom</span>
                    <span>{pct}% od vodećeg</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Requested Sizes & Colors */}
        <div className="glass-panel p-5 space-y-5">
          {/* Sizes Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#4FC3F7]" />
                Distribucija Veličina Tekstila (S–XXL)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {analytics.sizeDistribution.map((s, idx) => (
                <div key={idx} className="glass-panel-inset p-2.5 rounded-lg text-center">
                  <span className="text-xs font-mono font-bold text-cyan-300 block">{s.size}</span>
                  <span className="text-sm font-bold text-white">{s.count} kom</span>
                </div>
              ))}
            </div>
          </div>

          {/* Colors Breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" />
                Najpopularnije Boje Artikala
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {analytics.colorDistribution.map((c, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg glass-panel-inset text-xs font-medium text-slate-200 flex items-center gap-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4FC3F7]" />
                  <span>{c.color}:</span>
                  <span className="font-bold text-white">{c.count} kom</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
