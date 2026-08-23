import React from "react";
import { Sparkles, Printer, Calendar, ShieldCheck, Database, Download, Trash2, PanelLeft, Folder, Cloud, CloudCheck, User as UserIcon, LogIn, LogOut } from "lucide-react";
import { User } from "firebase/auth";

interface NavbarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  ordersCount: number;
  totalRevenue: number;
  isAiProcessing: boolean;
  onOpenQuickExport: () => void;
  onOpenClearModal: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  activeWorkspaceName?: string;
  isCloudSynced?: boolean;
  currentUser?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedDate,
  onDateChange,
  ordersCount,
  totalRevenue,
  isAiProcessing,
  onOpenQuickExport,
  onOpenClearModal,
  isSidebarCollapsed,
  onToggleSidebar,
  activeWorkspaceName,
  isCloudSynced = true,
  currentUser,
  onSignIn,
  onSignOut,
}) => {

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-40 px-4 py-2.5 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(8,9,13,0.92)] backdrop-blur-2xl"
      style={{
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.8)",
      }}
    >
      <div className="w-full mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo, Workspace Pill & Sidebar Toggle */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="navbar-toggle-sidebar-btn"
              onClick={onToggleSidebar}
              title={isSidebarCollapsed ? "Otvori File System Mape" : "Sažmi File System Mape"}
              className={`p-2 rounded-xl border transition-all ${
                !isSidebarCollapsed
                  ? "bg-[#0288D1]/30 border-[#4FC3F7]/50 text-[#4FC3F7] shadow-[0_0_10px_rgba(79,195,247,0.3)]"
                  : "glass-panel-inset hover:border-white/20 text-slate-400 hover:text-white"
              }`}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0288D1] to-[#4FC3F7] flex items-center justify-center neo-shadow border border-white/20 shadow-[0_0_12px_rgba(79,195,247,0.4)]">
              <span className="text-black font-black text-xs tracking-wider">PH</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-[#4FC3F7]">
                  DTF PRINT HUB
                </h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[rgba(79,195,247,0.15)] text-[#4FC3F7] border border-[rgba(79,195,247,0.3)] font-mono">
                  PRO
                </span>
                {activeWorkspaceName && (
                  <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-300">
                    <Folder className="w-3 h-3 text-[#4FC3F7]" />
                    <span className="font-medium text-white">{activeWorkspaceName}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                58cm Gang Sheet • AI Prepress Inženjering • Tamni Neomorfno-Stakleni Dizajn
              </p>
            </div>
          </div>
        </div>

        {/* Center Stats Bar */}
        <div className="hidden md:flex items-center gap-4 px-4 py-1.5 rounded-xl bg-[rgba(14,16,23,0.65)] border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Nalozi:</span>
            <span className="font-bold text-[#4FC3F7]">{ordersCount}</span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Promet:</span>
            <span className="font-bold text-emerald-400">{totalRevenue.toFixed(2)} €</span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Sparkles className={`w-3.5 h-3.5 ${isAiProcessing ? "text-amber-400 animate-spin" : "text-[#4FC3F7]"}`} />
            <span>Gemini 2.5 Flash</span>
          </div>
        </div>

        {/* Date Selector & Actions */}
        <div className="flex items-center gap-2">
          {/* Cloud Sync Status */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(14,16,23,0.7)] border border-cyan-500/20 text-xs"
            title="Firebase Firestore Cloud Baza je aktivna i sinkronizirana u stvarnom vremenu"
          >
            <Cloud className={`w-3.5 h-3.5 ${isCloudSynced ? "text-emerald-400" : "text-amber-400"}`} />
            <span className="text-[10px] font-mono text-slate-300">
              {isCloudSynced ? "Cloud Sinhro" : "Lokalno"}
            </span>
          </div>

          {/* User Auth Profile / Login */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs">
              <span className="text-[10px] text-cyan-300 font-bold max-w-[80px] truncate">
                {currentUser.displayName || currentUser.email?.split("@")[0] || "Korisnik"}
              </span>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title="Odjava"
                  className="text-slate-400 hover:text-rose-400 p-0.5"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            onSignIn && (
              <button
                onClick={onSignIn}
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white text-xs transition-all"
                title="Prijava putem Google računa"
              >
                <LogIn className="w-3.5 h-3.5 text-[#4FC3F7]" />
                <span className="text-[10px] font-medium">Prijava</span>
              </button>
            )
          )}

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[rgba(5,6,10,0.8)] border border-[rgba(255,255,255,0.1)] text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-[#4FC3F7]" />
            <input
              id="calendar-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            />
          </div>

          <button
            id="clear-all-data-nav-btn"
            onClick={onOpenClearModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-400 text-rose-300 hover:text-white text-xs font-semibold transition-all shadow-[0_0_10px_rgba(244,63,94,0.15)]"
            title="Očisti sve privremene i ogledne podatke iz aplikacije"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Očisti</span>
          </button>

          <button
            id="quick-export-btn"
            onClick={onOpenQuickExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-button-primary text-xs font-semibold shadow-[0_0_15px_rgba(79,195,247,0.3)]"
            title="Brzi izvoz svih dokumenata"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Izvoz Paketa</span>
          </button>
        </div>

      </div>
    </header>
  );
};
