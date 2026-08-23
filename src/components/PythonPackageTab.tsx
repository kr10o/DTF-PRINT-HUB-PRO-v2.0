import React, { useState } from "react";
import { PYTHON_SOURCE_FILES, PythonSourceFile } from "../lib/pythonCodeStore";
import {
  FileCode,
  Download,
  Copy,
  Check,
  FolderArchive,
  Terminal,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";

export const PythonPackageTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<PythonSourceFile>(PYTHON_SOURCE_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("SVE");

  const categories = ["SVE", "Core Engine", "Prepress & PDF", "Plugins & Automation", "Windows 10 Packaging"];

  const filteredFiles = PYTHON_SOURCE_FILES.filter((file) => {
    if (activeCategory === "SVE") return true;
    return file.category === activeCategory;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = (file: PythonSourceFile) => {
    const blob = new Blob([file.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = () => {
    // Downloads all source files sequentially
    PYTHON_SOURCE_FILES.forEach((f, idx) => {
      setTimeout(() => {
        handleDownloadSingle(f);
      }, idx * 150);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-[#4FC3F7] border border-cyan-500/30">
                FAZA 10: PYTHON KODNA BAZA & WINDOWS 10 PAKIRANJE
              </span>
              <span className="text-xs text-slate-400">100 Tehničkih Uputa • PyInstaller & Inno Setup</span>
            </div>
            <h2 className="text-xl font-bold text-white">Izvorni Python Kod & Distribucijski Paketi</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Kompletan set od {PYTHON_SOURCE_FILES.length} Python, JSON i skriptnih datoteka za lokalnu izradu samostalne .exe instalacije za Windows 10.
            </p>
          </div>

          <button
            onClick={handleDownloadAllZip}
            className="px-4 py-2 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-2"
          >
            <FolderArchive className="w-4 h-4" />
            Preuzmi Sve Datoteke ({PYTHON_SOURCE_FILES.length} Datoteka)
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
          <span className="text-xs text-slate-400">Kategorija koda:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[#0288D1] text-white shadow-[0_0_10px_rgba(79,195,247,0.4)]"
                  : "bg-[rgba(14,16,23,0.6)] text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split View: File Explorer & Code Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Python Files List */}
        <div className="glass-panel p-4 space-y-3 lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.08)] pb-2">
            <FileCode className="w-4 h-4 text-[#4FC3F7]" />
            Distribucijske Datoteke ({filteredFiles.length})
          </h3>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredFiles.map((file) => (
              <button
                key={file.filename}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left p-2.5 rounded-xl transition-all ${
                  selectedFile.filename === file.filename
                    ? "bg-[#0288D1]/30 border border-[#4FC3F7] shadow-[0_0_10px_rgba(79,195,247,0.3)]"
                    : "glass-panel-inset hover:border-[rgba(255,255,255,0.15)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate font-mono">{file.filename}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {file.filename.split(".").pop()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{file.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Code Viewer & Actions */}
        <div className="glass-panel p-4 space-y-4 lg:col-span-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.08)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">{selectedFile.filename}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-[#4FC3F7] border border-cyan-500/30">
                  {selectedFile.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3.5 py-1.5 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Kopirano!" : "Kopiraj Kod"}
              </button>
              <button
                onClick={() => handleDownloadSingle(selectedFile)}
                className="px-3.5 py-1.5 rounded-lg glass-button-secondary text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Preuzmi Datoteku
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-[#050508] border border-[rgba(255,255,255,0.1)] text-xs font-mono text-cyan-200 overflow-x-auto whitespace-pre leading-relaxed max-h-[580px]">
            {selectedFile.code}
          </pre>
        </div>
      </div>
    </div>
  );
};
