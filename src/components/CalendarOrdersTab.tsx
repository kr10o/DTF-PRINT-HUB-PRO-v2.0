import React, { useState } from "react";
import { Order, OrderItem } from "../types";
import {
  Sparkles,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  User,
  Phone,
  Layers,
  Tag,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Zap,
  RotateCcw,
  Eraser,
} from "lucide-react";
import { SAMPLE_CSV_CONTENT, INITIAL_ORDERS } from "../lib/mockSampleOrders";
import { parseWorkOrdersOffline } from "../lib/offlineParser";

interface CalendarOrdersTabProps {
  orders: Order[];
  onOrdersChange: (orders: Order[]) => void;
  selectedDate: string;
  isAiProcessing: boolean;
  onParseCsv: (csvContent: string) => Promise<void>;
}

export const CalendarOrdersTab: React.FC<CalendarOrdersTabProps> = ({
  orders,
  onOrdersChange,
  selectedDate,
  isAiProcessing,
  onParseCsv,
}) => {
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV_CONTENT);
  const [showCsvBox, setShowCsvBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"SVE" | "Tekstil" | "Promo">("SVE");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // New Order Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.naziv_klijenta.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.broj_racuna.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.oib && order.oib.includes(searchQuery));

    if (!matchesSearch) return false;
    if (selectedCategory === "SVE") return true;

    return order.artikli.some((item) => item.kategorija === selectedCategory);
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvInput(text);
        setShowCsvBox(true);
      };
      reader.readAsText(file);
    }
  };

  const handleRunAiParsing = async () => {
    if (!csvInput.trim()) return;
    await onParseCsv(csvInput);
    setShowCsvBox(false);
  };

  const handleRunOfflineParsing = () => {
    if (!csvInput.trim()) return;
    const parsedOrders = parseWorkOrdersOffline(csvInput);
    if (parsedOrders.length > 0) {
      onOrdersChange(parsedOrders);
      setShowCsvBox(false);
    } else {
      alert("Nije pronađen nijedan valjan redak narudžbe za parsiranje.");
    }
  };

  const handleDeleteOrder = (invoiceNumber: string) => {
    if (confirm(`Jeste li sigurni da želite obrisati račun ${invoiceNumber}?`)) {
      onOrdersChange(orders.filter((o) => o.broj_racuna !== invoiceNumber));
    }
  };

  const handleClearAllOrders = () => {
    if (confirm("Jeste li sigurni da želite ukloniti sve trenutne naloge i raditi s praznim kalendarom?")) {
      onOrdersChange([]);
    }
  };

  const handleLoadSampleOrders = () => {
    onOrdersChange(INITIAL_ORDERS);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & AI Ingestion Trigger */}
      <div className="glass-panel p-5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-[#4FC3F7] border border-cyan-500/30">
                FAZA 4: DVOSTRUKI PARSING ENGINE
              </span>
              <span className="text-xs text-slate-400">Gemini 2.5 Flash + Offline Deterministički NLP / Regex Pipeline</span>
            </div>
            <h2 className="text-xl font-bold text-white">Centralni Kalendar & AI Obrada Naloga</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Automatizirana prepress analiza sirovih narudžbi, ekstrahiranje dimenzija pozicija i klasifikacija artikala.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="toggle-csv-btn"
              onClick={() => setShowCsvBox(!showCsvBox)}
              className="px-3 py-2 rounded-lg glass-button-secondary text-xs font-medium flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-[#4FC3F7]" />
              {showCsvBox ? "Zatvori CSV Unos" : "Učitaj / Zalijepi CSV"}
            </button>

            <button
              id="offline-parse-btn"
              onClick={handleRunOfflineParsing}
              title="Brzi offline deterministički NLP + Regex parser bez potrebe za API ključem"
              className="px-3.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ⚡ Offline NLP Parser
            </button>

            <button
              id="ai-parse-btn"
              onClick={handleRunAiParsing}
              disabled={isAiProcessing}
              className="px-4 py-2 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-2"
            >
              <Sparkles className={`w-4 h-4 ${isAiProcessing ? "animate-spin" : ""}`} />
              {isAiProcessing ? "AI Obrada u tijeku..." : "🚀 Parsiraj s Gemini 2.5 Flash"}
            </button>

            <button
              id="add-manual-order-btn"
              onClick={() => {
                setEditingOrder({
                  broj_racuna: `2026-R${Math.floor(Math.random() * 900 + 100)}`,
                  naziv_klijenta: "Novi Klijent d.o.o.",
                  oib: "12345678901",
                  kontakt_ime: "Kontakt Osoba",
                  kontakt_broj: "+385 91 123 4567",
                  ukupan_iznos: 120.0,
                  datum_racuna: selectedDate,
                  datum_uplate: selectedDate,
                  zahtijeva_vizual: false,
                  nedostaje_priprema: false,
                  artikli: [
                    {
                      kategorija: "Tekstil",
                      naziv_artikla: "Pamučna Majica 180g",
                      kolicina: 10,
                      velicina: "L",
                      boja: "Crna",
                      pozicije_tiska: [
                        { naziv_pozicije: "Lijevo Srce (9cm)", sirina_cm: 9 },
                        { naziv_pozicije: "Muško Leđa (26cm)", sirina_cm: 26 },
                      ],
                      personalizacija_imena: [],
                    },
                  ],
                });
                setIsModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-medium border border-emerald-400/40 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Novi Nalog
            </button>

            {orders.length > 0 ? (
              <button
                id="clear-calendar-orders-btn"
                onClick={handleClearAllOrders}
                title="Isprazni sve trenutne naloge iz kalendara"
                className="px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden xl:inline">Isprazni Naloge</span>
              </button>
            ) : (
              <button
                id="restore-calendar-sample-btn"
                onClick={handleLoadSampleOrders}
                title="Učitaj ogledne demo naloge"
                className="px-3 py-2 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#4FC3F7]" />
                <span className="hidden xl:inline">Učitaj Demo</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible CSV Input & Presets Area */}
        {showCsvBox && (
          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300">
                Sirovi CSV format (Stupci: Broj Računa, Klijent, OIB, Artikl, Količina, Veličina, Boja, Pozicije Tiska...)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".csv,.txt"
                  id="csv-file-input"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer text-[11px] px-2.5 py-1 rounded bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-[#4FC3F7] border border-[rgba(255,255,255,0.1)]"
                >
                  Odaberi .csv s računala
                </label>
                <button
                  onClick={() => setCsvInput(SAMPLE_CSV_CONTENT)}
                  className="text-[11px] px-2.5 py-1 rounded bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-slate-300"
                >
                  Učitaj Primjer Naloga
                </button>
                <button
                  onClick={() => setCsvInput("")}
                  className="text-[11px] px-2.5 py-1 rounded bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-500/20 flex items-center gap-1"
                >
                  <Eraser className="w-3 h-3" />
                  Očisti Tekst
                </button>
              </div>
            </div>

            <textarea
              id="raw-csv-textarea"
              rows={6}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              className="w-full glass-input p-3 rounded-lg text-xs font-mono resize-y"
              placeholder="Zalijepite CSV sadržaj ovdje..."
            />
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-orders-input"
            type="text"
            placeholder="Pretraži po klijentu, broju računa ili OIB-u..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 glass-input rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">Kategorija:</span>
          {(["SVE", "Tekstil", "Promo"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-[#0288D1] text-white shadow-[0_0_10px_rgba(79,195,247,0.4)]"
                  : "bg-[rgba(14,16,23,0.6)] text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Container (Compact Table & Card representations) */}
      <section className="glass rounded-xl neo-shadow flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="font-semibold text-sm sm:text-base text-white">Aktivni Nalozi u Obradi</h2>
            <p className="text-[11px] text-slate-400">Prikaz radnih naloga i statusa grafičke pripreme</p>
          </div>
          <button
            onClick={handleRunAiParsing}
            disabled={isAiProcessing}
            className="btn-gradient px-4 py-1.5 rounded text-xs font-bold neo-shadow border border-white/20 uppercase tracking-tight flex items-center gap-1.5"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiProcessing ? "animate-spin" : ""}`} />
            <span>🚀 Parsiraj s Gemini</span>
          </button>
        </div>

        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-[#4FC3F7] text-[10px] uppercase font-bold tracking-wider border-b border-white/10">
              <tr>
                <th className="px-5 py-3">Nalog #</th>
                <th className="px-5 py-3">Klijent</th>
                <th className="px-5 py-3">Artikl / Količina</th>
                <th className="px-5 py-3">Pozicije Tiska</th>
                <th className="px-5 py-3">Iznos</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Radnje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-slate-400">
                    <div className="max-w-md mx-auto space-y-2">
                      <p className="text-slate-300 font-medium">Trenutno nema naloga u kalendaru.</p>
                      <p className="text-slate-500 text-[11px]">
                        Možete učitati novi CSV, kreirati nalog ručno ili vratiti ogledne demo podatke.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={handleLoadSampleOrders}
                          className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1 hover:bg-cyan-900/60"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Učitaj Ogledne Podatke
                        </button>
                        <button
                          onClick={() => setShowCsvBox(true)}
                          className="px-3 py-1.5 rounded-lg glass-button-secondary text-xs flex items-center gap-1"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#4FC3F7]" />
                          Učitaj CSV
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const totalPieces = order.artikli.reduce((sum, item) => sum + item.kolicina, 0);
                  const firstItem = order.artikli[0];
                  const positionsSummary = order.artikli
                    .flatMap((i) => i.pozicije_tiska)
                    .map((p) => `${p.naziv_pozicije} (${p.sirina_cm}cm)`)
                    .join(", ");

                  return (
                    <tr key={order.broj_racuna} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-200">
                        {order.broj_racuna}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-xs text-white">{order.naziv_klijenta}</div>
                        {order.oib && <div className="text-[10px] text-slate-400 font-mono">OIB: {order.oib}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs text-slate-200">
                          {firstItem ? `${firstItem.naziv_artikla} (${firstItem.boja || ""})` : "Razni artikli"}
                        </div>
                        <div className="text-[10px] text-[#4FC3F7] font-semibold">
                          {totalPieces} kom ({order.artikli.length} stavki)
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs text-slate-300 max-w-xs truncate" title={positionsSummary}>
                          {positionsSummary || "Standardni tisak"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-xs text-emerald-400">
                        {order.ukupan_iznos.toFixed(2)} €
                      </td>
                      <td className="px-5 py-3.5">
                        {order.nedostaje_priprema ? (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] border border-orange-500/30 uppercase font-semibold">
                            Fali Vizual
                          </span>
                        ) : order.zahtijeva_vizual ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30 uppercase font-semibold">
                            Čeka Odobrenje
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-[10px] border border-green-500/30 uppercase font-semibold">
                            Spreman
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingOrder(order);
                              setIsModalOpen(true);
                            }}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                            title="Uredi nalog"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.broj_racuna)}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                            title="Obriši"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detailed Orders Cards Grid */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Detaljne Specifikacije Artikala i Pozicija Tiska
        </h3>
        {filteredOrders.length === 0 ? (
          <div className="glass-panel p-10 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">Nema pronađenih naloga</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Učitajte CSV, unesite novi nalog ručno ili učitajte ogledne demo podatke za testiranje DTF proizvodnje.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleLoadSampleOrders}
                className="px-3.5 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#4FC3F7]" />
                Učitaj Ogledne Podatke
              </button>
              <button
                onClick={() => setShowCsvBox(true)}
                className="px-3.5 py-2 rounded-lg glass-button-primary text-xs font-semibold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Učitaj CSV
              </button>
            </div>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.broj_racuna;
            const totalPieces = order.artikli.reduce((sum, item) => sum + item.kolicina, 0);

            return (
              <div
                key={order.broj_racuna}
                id={`order-card-${order.broj_racuna}`}
                className="glass-panel p-5 transition-all hover:border-[rgba(79,195,247,0.4)]"
              >
                {/* Order Top Line */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-xs font-bold text-[#4FC3F7]">
                      {order.broj_racuna.split("-")[1] || "RN"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{order.naziv_klijenta}</h3>
                        {order.oib && (
                          <span className="text-[11px] text-slate-400 font-mono">OIB: {order.oib}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-[#4FC3F7]" />
                          {order.kontakt_ime || "N/A"}
                        </span>
                        {order.kontakt_broj && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            {order.kontakt_broj}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {order.datum_racuna}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {order.zahtijeva_vizual && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Zahtijeva Vizual
                      </span>
                    )}

                    {order.nedostaje_priprema && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Fali Priprema
                      </span>
                    )}

                    {order.datum_uplate ? (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Plaćeno
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-700/50 text-slate-300 border border-slate-600">
                        Čeka uplatu
                      </span>
                    )}

                    <div className="text-right ml-2">
                      <span className="text-sm font-bold text-emerald-400">{order.ukupan_iznos.toFixed(2)} €</span>
                      <p className="text-[10px] text-slate-400">{totalPieces} kom</p>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => {
                          setEditingOrder(order);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-slate-300 hover:text-white"
                        title="Uredi nalog"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.broj_racuna)}
                        className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                        title="Obriši nalog"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {order.artikli.map((item, idx) => (
                    <div
                      key={idx}
                      className="glass-panel-inset p-3 rounded-lg space-y-2 border border-[rgba(255,255,255,0.06)]"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.kategorija === "Tekstil"
                              ? "bg-sky-500/20 text-[#4FC3F7]"
                              : "bg-purple-500/20 text-purple-300"
                          }`}
                        >
                          {item.kategorija}
                        </span>
                        <span className="text-xs font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded">
                          {item.kolicina} kom
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-200">{item.naziv_artikla}</h4>
                        <p className="text-[11px] text-slate-400">
                          Boja: <span className="text-slate-200">{item.boja || "N/A"}</span> • Veličina:{" "}
                          <span className="text-slate-200">{item.velicina || "N/A"}</span>
                        </p>
                      </div>

                      {/* Print Positions */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          Pozicije Tiska:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.pozicije_tiska.map((pos, pIdx) => (
                            <span
                              key={pIdx}
                              className="text-[10px] px-2 py-0.5 rounded bg-[rgba(2,136,209,0.2)] text-[#4FC3F7] border border-[rgba(79,195,247,0.3)] flex items-center gap-1"
                            >
                              <Layers className="w-2.5 h-2.5" />
                              {pos.naziv_pozicije} ({pos.sirina_cm}cm
                              {pos.visina_cm ? `x${pos.visina_cm}cm` : ""})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Personalization */}
                      {item.personalizacija_imena && item.personalizacija_imena.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-[rgba(255,255,255,0.06)]">
                          <span className="text-[10px] text-amber-300 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" />
                            Personalizacija ({item.personalizacija_imena.length} imena):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.personalizacija_imena.map((name, nIdx) => (
                              <span
                                key={nIdx}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-200 border border-amber-500/20"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Order Modal */}
      {isModalOpen && editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
              <h3 className="text-base font-bold text-white">Uredi / Dodaj Nalog</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Broj Računa</label>
                <input
                  type="text"
                  value={editingOrder.broj_racuna}
                  onChange={(e) => setEditingOrder({ ...editingOrder, broj_racuna: e.target.value })}
                  className="w-full glass-input p-2 rounded text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Naziv Klijenta</label>
                <input
                  type="text"
                  value={editingOrder.naziv_klijenta}
                  onChange={(e) => setEditingOrder({ ...editingOrder, naziv_klijenta: e.target.value })}
                  className="w-full glass-input p-2 rounded text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">OIB Klijenta</label>
                <input
                  type="text"
                  value={editingOrder.oib || ""}
                  onChange={(e) => setEditingOrder({ ...editingOrder, oib: e.target.value })}
                  className="w-full glass-input p-2 rounded text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Ukupan Iznos (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingOrder.ukupan_iznos}
                  onChange={(e) => setEditingOrder({ ...editingOrder, ukupan_iznos: parseFloat(e.target.value) || 0 })}
                  className="w-full glass-input p-2 rounded text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingOrder.zahtijeva_vizual}
                  onChange={(e) => setEditingOrder({ ...editingOrder, zahtijeva_vizual: e.target.checked })}
                  className="rounded text-cyan-500"
                />
                Zahtijeva probni vizual
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingOrder.nedostaje_priprema}
                  onChange={(e) => setEditingOrder({ ...editingOrder, nedostaje_priprema: e.target.checked })}
                  className="rounded text-rose-500"
                />
                Nedostaje priprema
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.1)]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg glass-button-secondary text-xs"
              >
                Odustani
              </button>
              <button
                onClick={() => {
                  const existingIdx = orders.findIndex((o) => o.broj_racuna === editingOrder.broj_racuna);
                  if (existingIdx >= 0) {
                    const copy = [...orders];
                    copy[existingIdx] = editingOrder;
                    onOrdersChange(copy);
                  } else {
                    onOrdersChange([editingOrder, ...orders]);
                  }
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg glass-button-primary text-xs font-bold"
              >
                Spremi Nalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
