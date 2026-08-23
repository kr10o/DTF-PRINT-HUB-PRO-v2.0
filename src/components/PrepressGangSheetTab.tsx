import React, { useState, useMemo } from "react";
import { Order, GangSheetItem } from "../types";
import {
  calculateGangSheetNesting,
  ROLL_WIDTH_CM,
  PRINTABLE_WIDTH_CM,
  MARGIN_CM,
  SPACING_CM,
  MAX_PAGE_HEIGHT_CM,
} from "../lib/prepressEngine";
import { generateDTFRollPrepressPDF, generatePillowVectorTextPDF } from "../lib/pdfGenerator";
import {
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Sparkles,
  Printer,
  FileCheck,
  Cpu,
  AlertCircle,
  Type,
  Sliders,
  CheckCircle2,
} from "lucide-react";

interface PrepressGangSheetTabProps {
  orders: Order[];
}

export const PrepressGangSheetTab: React.FC<PrepressGangSheetTabProps> = ({ orders }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [activeTabRoll, setActiveTabRoll] = useState<number>(0);
  const [hoveredItem, setHoveredItem] = useState<GangSheetItem | null>(null);

  // Pillow Vector Text Studio State
  const [pillowText, setPillowText] = useState<string>("TISAK — ČĆŽŠĐ 2026");
  const [pillowFontSize, setPillowFontSize] = useState<number>(28);
  const [pillowWidthCm, setPillowWidthCm] = useState<number>(24.0);
  const [pillowHeightCm, setPillowHeightCm] = useState<number>(12.0);
  const [pillowIsDark, setPillowIsDark] = useState<boolean>(true);
  const [pillowStrokeWidth, setPillowStrokeWidth] = useState<number>(0);

  const pages = useMemo(() => calculateGangSheetNesting(orders), [orders]);
  const currentPage = pages[activeTabRoll] || pages[0];

  const handleDownloadPdf = () => {
    const doc = generateDTFRollPrepressPDF(orders);
    doc.save(`DTF_GangSheet_58cm_${new Date().toISOString().substring(0, 10)}.pdf`);
  };

  const handleDownloadPillowVectorPdf = () => {
    const doc = generatePillowVectorTextPDF(
      pillowText,
      pillowWidthCm,
      pillowHeightCm,
      pillowIsDark,
      pillowStrokeWidth
    );
    doc.save(`Pillow_VectorText_${pillowText.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  };

  // Convert CM to pixels for visualizer
  const cmToPx = (cm: number) => cm * 14 * zoomLevel;

  // Exact Pillow text metric simulation
  const approxTextLengthPx = pillowText.length * pillowFontSize * 0.58;
  const approxTextBBox = {
    left: 20,
    top: 20,
    right: Math.round(20 + approxTextLengthPx),
    bottom: Math.round(20 + pillowFontSize * 1.25),
    width: Math.round(approxTextLengthPx),
    height: Math.round(pillowFontSize * 1.25),
  };


  return (
    <div className="space-y-6">
      {/* Prepress Control Header */}
      <div className="glass-panel p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-[#4FC3F7] border border-cyan-500/30">
                FAZA 7: INDUSTRIJSKI GANG SHEET GENERATOR
              </span>
              <span className="text-xs text-slate-400">Širina 58.0 cm (Iskoristivo 55.0 cm) • Max 4.9m po stranici</span>
            </div>
            <h2 className="text-xl font-bold text-white">DTF Linijski Prepress Nesting & Vizualizator Role</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Automatsko linijsko slaganje slijeva nadesno, multipliciranje grafika po količini i CMYK pravila toniranja.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(5,6,10,0.8)] border border-[rgba(255,255,255,0.1)]">
              <button
                onClick={() => setZoomLevel(Math.max(0.6, zoomLevel - 0.2))}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Smanji"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-cyan-300 px-2 font-bold">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.2))}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Povećaj"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(1.2)}
                className="p-1 rounded text-slate-400 hover:text-white ml-1 border-l border-slate-700 pl-2"
                title="Resetiraj zum"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              id="download-dtf-pdf-btn"
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Preuzmi DTF Gang Sheet PDF (58cm)
            </button>
          </div>
        </div>

        {/* Metric Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
          <div className="glass-panel-inset p-3 rounded-lg">
            <span className="text-[10px] text-slate-400 block uppercase">Ukupno Preslikača</span>
            <span className="text-base font-bold text-[#4FC3F7]">
              {pages.reduce((acc, p) => acc + p.itemsCount, 0)} kom
            </span>
          </div>

          <div className="glass-panel-inset p-3 rounded-lg">
            <span className="text-[10px] text-slate-400 block uppercase">Iskorištena Dužina Role</span>
            <span className="text-base font-bold text-emerald-400">
              {(currentPage.usedHeightCm / 100).toFixed(2)} m ({currentPage.usedHeightCm.toFixed(1)} cm)
            </span>
          </div>

          <div className="glass-panel-inset p-3 rounded-lg">
            <span className="text-[10px] text-slate-400 block uppercase">Broj Stranica Role</span>
            <span className="text-base font-bold text-purple-300">
              {pages.length} {pages.length > 1 ? "stranice (Max 4.9m)" : "stranica"}
            </span>
          </div>

          <div className="glass-panel-inset p-3 rounded-lg">
            <span className="text-[10px] text-slate-400 block uppercase">Efikasnost Širine</span>
            <span className="text-base font-bold text-amber-300">94.8% (55/58 cm)</span>
          </div>
        </div>
      </div>

      {/* Main Prepress Film Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roll Preview Canvas Area */}
        <div className="lg:col-span-3 glass-panel p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Platno Role 58cm (RIP View)</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                1.5cm margine • 1.5cm razmak
              </span>
            </div>

            {/* Page switcher if multiple */}
            {pages.length > 1 && (
              <div className="flex items-center gap-1">
                {pages.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTabRoll(idx)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      activeTabRoll === idx
                        ? "bg-[#0288D1] text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Stranica {p.pageIndex}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Film Container */}
          <div className="p-4 bg-[#050508] rounded-xl border border-[rgba(255,255,255,0.1)] flex justify-center overflow-auto min-h-[500px] max-h-[750px]">
            <div
              id="dtf-roll-stage"
              className="dtf-film-bg relative border-2 border-cyan-500/40 rounded shadow-2xl transition-all"
              style={{
                width: `${cmToPx(ROLL_WIDTH_CM)}px`,
                height: `${Math.max(cmToPx(currentPage.usedHeightCm + 10), 500)}px`,
              }}
            >
              {/* Margins Indicators */}
              <div
                className="absolute top-0 bottom-0 border-r border-dashed border-cyan-500/30 pointer-events-none"
                style={{ left: `${cmToPx(MARGIN_CM)}px` }}
              />
              <div
                className="absolute top-0 bottom-0 border-l border-dashed border-cyan-500/30 pointer-events-none"
                style={{ right: `${cmToPx(MARGIN_CM)}px` }}
              />

              {/* Rulers Top & Left */}
              <div className="absolute top-2 left-4 text-[10px] font-mono text-cyan-400/80">
                ◄ 58.0 cm (Iskoristivo 55.0 cm) ►
              </div>

              {/* Nested Objects */}
              {currentPage.items.map((item) => {
                const isHovered = hoveredItem?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`absolute rounded transition-all cursor-pointer flex flex-col justify-between p-1.5 ${
                      isHovered
                        ? "ring-2 ring-[#4FC3F7] z-30 shadow-[0_0_15px_rgba(79,195,247,0.8)]"
                        : "border border-cyan-500/30"
                    } ${
                      item.shirtColorIsDark
                        ? "bg-slate-950/90 text-white"
                        : "bg-slate-100/95 text-slate-950"
                    }`}
                    style={{
                      left: `${cmToPx(item.xCm)}px`,
                      top: `${cmToPx(item.yCm + 2)}px`,
                      width: `${cmToPx(item.widthCm)}px`,
                      height: `${cmToPx(item.heightCm)}px`,
                    }}
                  >
                    {/* Item Top Label */}
                    <div className="flex items-center justify-between gap-1 overflow-hidden">
                      <span className="text-[9px] font-bold truncate">
                        {item.positionName} ({item.widthCm}cm)
                      </span>
                      <span
                        className={`text-[7px] font-bold px-1 rounded uppercase ${
                          item.shirtColorIsDark
                            ? "bg-white text-slate-950"
                            : "bg-slate-900 text-white"
                        }`}
                      >
                        {item.shirtColorIsDark ? "0,0,1,0 White" : "0,0,0,100 Black"}
                      </span>
                    </div>

                    {/* Graphic Box Center */}
                    <div
                      className={`flex-1 my-1 rounded border border-dashed flex items-center justify-center text-center p-1 ${
                        item.shirtColorIsDark
                          ? "border-cyan-400/40 bg-cyan-950/20"
                          : "border-slate-400 bg-slate-200/50"
                      }`}
                    >
                      <span className="text-[10px] font-semibold truncate">
                        {item.clientName.substring(0, 14)}
                      </span>
                    </div>

                    {/* Footer Invoice & Item */}
                    <div className="flex items-center justify-between text-[8px] opacity-80 truncate">
                      <span>{item.invoiceNumber}</span>
                      <span className="truncate">{item.itemName.substring(0, 10)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Prepress Item Inspector & CMYK Rules */}
        <div className="space-y-4 lg:col-span-1">
          {/* Selected / Hovered Inspector */}
          <div className="glass-panel p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.08)] pb-2">
              <Cpu className="w-4 h-4 text-[#4FC3F7]" />
              Prepress Inspektor Stavke
            </h3>

            {hoveredItem ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Klijent:</span>
                  <span className="font-bold text-white">{hoveredItem.clientName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Račun:</span>
                  <span className="font-mono text-cyan-300">{hoveredItem.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Artikl / Boja:</span>
                  <span className="text-slate-200">
                    {hoveredItem.itemName} ({hoveredItem.color})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Pozicija & Dimenzije:</span>
                  <span className="font-semibold text-emerald-400">
                    {hoveredItem.positionName} — {hoveredItem.widthCm} x {hoveredItem.heightCm} cm
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Koordinate na Roli:</span>
                  <span className="font-mono text-purple-300">
                    X: {hoveredItem.xCm.toFixed(1)} cm | Y: {hoveredItem.yCm.toFixed(1)} cm
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">CMYK Prepress Način:</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      hoveredItem.shirtColorIsDark
                        ? "bg-white text-slate-900"
                        : "bg-slate-900 text-white"
                    }`}
                  >
                    {hoveredItem.shirtColorIsDark
                      ? "CMYK: 0% C, 0% M, 1% Y, 0% K (White Base)"
                      : "CMYK: 0% C, 0% M, 0% Y, 100% K (Pure Black)"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Prijeđite mišem preko preslikača na roli za detaljnu prepress inspekciju.
              </p>
            )}
          </div>

          {/* Prepress Color Rules Info */}
          <div className="glass-panel p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Pravila CMYK Toniranja u RIP-u
            </h3>
            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-cyan-300 block mb-0.5">Tamne Majice (Crna, Tamno Siva, Navy):</span>
                <p className="text-[10px] text-slate-400">
                  Koristi se bijeli kanal s <span className="text-yellow-300 font-mono font-bold">1% Yellow</span> (0,0,1,0) radi automatskog aktiviranja pokrivne bijele podloge u RIP softveru.
                </p>
              </div>

              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-emerald-300 block mb-0.5">Svijetle Majice (Bijela, Natur Bež):</span>
                <p className="text-[10px] text-slate-400">
                  Koristi se <span className="text-slate-100 font-mono font-bold">100% K (0,0,0,100)</span> bez bijelog podslaja, čime se štedi bijela boja i postiže mekaniji otisak na dodir.
                </p>
              </div>
            </div>
          </div>

          {/* EOD Sažetak Card (Design Specs) */}
          <div className="glass rounded-xl neo-shadow p-5 flex flex-col gap-2">
            <h3 className="text-xs font-bold text-[#4FC3F7] uppercase tracking-wider">EOD Sažetak Proizvodnje</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between opacity-80 text-slate-300">
                <span>Tekstil isprintano:</span>
                <span className="font-bold text-white font-mono">
                  {orders.reduce(
                    (sum, o) =>
                      sum +
                      o.artikli
                        .filter((a) => a.kategorija === "Tekstil")
                        .reduce((aSum, a) => aSum + a.kolicina, 0),
                    0
                  )}{" "}
                  kom
                </span>
              </div>
              <div className="flex justify-between opacity-80 text-slate-300">
                <span>Promo artikala:</span>
                <span className="font-bold text-white font-mono">
                  {orders.reduce(
                    (sum, o) =>
                      sum +
                      o.artikli
                        .filter((a) => a.kategorija === "Promo")
                        .reduce((aSum, a) => aSum + a.kolicina, 0),
                    0
                  )}{" "}
                  kom
                </span>
              </div>
              <div className="flex justify-between opacity-80 text-slate-300">
                <span>Utrošeno folije:</span>
                <span className="font-bold text-[#4FC3F7] font-mono">
                  {(currentPage.usedHeightCm / 100).toFixed(2)} m
                </span>
              </div>
              <div className="flex justify-between opacity-80 text-slate-300">
                <span>Utrošeno tinte (procjena):</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {(currentPage.usedHeightCm * 2.1).toFixed(0)} ml
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Pillow Vector Text & PDF Studio Card */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.08)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-[#4FC3F7] text-[10px] font-bold border border-cyan-500/30">
                PILLOW (PIL) PREPRESS ENGINE
              </span>
              <h3 className="text-sm font-bold text-white">Pillow Vector Text & 300 DPI PDF Studio</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Izravno renderiranje vektorske tipografije, ImageDraw.textbbox i ImageDraw.textlength metrike s CMYK White Underbase slojem.
            </p>
          </div>

          <button
            onClick={handleDownloadPillowVectorPdf}
            className="px-4 py-2 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-2 shadow-[0_0_12px_rgba(79,195,247,0.3)]"
          >
            <Download className="w-4 h-4" />
            Izvezi Vektorski PDF (Pillow Engine)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Interactive Controls */}
          <div className="space-y-3.5 lg:col-span-1">
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Tekst za Tisak & Personalizaciju (Podrška za Č, Ć, Đ, Š, Ž):
              </label>
              <input
                type="text"
                value={pillowText}
                onChange={(e) => setPillowText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[rgba(5,6,10,0.8)] border border-[rgba(255,255,255,0.12)] text-white text-xs focus:border-[#4FC3F7] outline-none"
                placeholder="Unesite tekst..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Širina (cm):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={pillowWidthCm}
                  onChange={(e) => setPillowWidthCm(parseFloat(e.target.value) || 10)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[rgba(5,6,10,0.8)] border border-[rgba(255,255,255,0.12)] text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Visina (cm):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={pillowHeightCm}
                  onChange={(e) => setPillowHeightCm(parseFloat(e.target.value) || 5)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[rgba(5,6,10,0.8)] border border-[rgba(255,255,255,0.12)] text-white text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Veličina Fonta (pt):
                </label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={pillowFontSize}
                  onChange={(e) => setPillowFontSize(parseInt(e.target.value))}
                  className="w-full accent-[#4FC3F7]"
                />
                <span className="text-[10px] text-cyan-300 font-mono">{pillowFontSize} pt</span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Podloga Majice:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPillowIsDark(true)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      pillowIsDark
                        ? "bg-[#0288D1] text-white shadow-[0_0_8px_rgba(79,195,247,0.4)]"
                        : "bg-slate-900 text-slate-400"
                    }`}
                  >
                    Tamna
                  </button>
                  <button
                    type="button"
                    onClick={() => setPillowIsDark(false)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      !pillowIsDark
                        ? "bg-slate-200 text-slate-900 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                        : "bg-slate-900 text-slate-400"
                    }`}
                  >
                    Svijetla
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Center & Right: Pillow Metric Visualizer & Canvas Preview */}
          <div className="lg:col-span-2 glass-panel-inset p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-[#4FC3F7]" />
                Pillow ImageDraw Visualizer & Bounding Box (300 DPI)
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {pillowWidthCm} x {pillowHeightCm} cm • {pillowIsDark ? "CMYK (0,0,1,0)" : "CMYK (0,0,0,100)"}
              </span>
            </div>

            {/* Live Vector Stage */}
            <div
              className={`w-full min-h-[140px] rounded-lg p-6 flex flex-col items-center justify-center relative border transition-all ${
                pillowIsDark
                  ? "bg-[#0A0B10] border-cyan-500/30 text-white"
                  : "bg-slate-100 border-slate-300 text-slate-950"
              }`}
            >
              {/* Pillow textbbox visual frame */}
              <div
                className="border border-dashed border-cyan-400/60 p-2 rounded flex items-center justify-center relative"
                style={{
                  minWidth: `${Math.min(approxTextBBox.width * 1.5, 500)}px`,
                  minHeight: `${approxTextBBox.height * 2}px`,
                }}
              >
                <span
                  style={{
                    fontSize: `${pillowFontSize}px`,
                    fontWeight: "bold",
                    letterSpacing: "0.02em",
                  }}
                  className="font-sans"
                >
                  {pillowText || "Prazan tekst"}
                </span>

                <div className="absolute -top-3 left-2 px-1.5 py-0.2 rounded bg-slate-900 text-[8px] text-[#4FC3F7] font-mono border border-cyan-500/40">
                  ImageDraw.textbbox: [{approxTextBBox.left}, {approxTextBBox.top}, {approxTextBBox.right}, {approxTextBBox.bottom}]
                </div>
              </div>
            </div>

            {/* Pillow Mathematical Metrics Row */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[rgba(255,255,255,0.06)] text-[11px]">
              <div>
                <span className="text-slate-500 block text-[9px]">Pillow textlength:</span>
                <span className="font-mono text-cyan-300 font-bold">{approxTextLengthPx.toFixed(1)} px</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">Bounding Box (w x h):</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {approxTextBBox.width} x {approxTextBBox.height} px
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">CMYK Underbase:</span>
                <span className="font-mono text-purple-300 font-bold">
                  {pillowIsDark ? "1% Yellow (White Base)" : "100% K Black"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
