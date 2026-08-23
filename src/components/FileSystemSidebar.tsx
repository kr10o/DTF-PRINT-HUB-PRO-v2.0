import React, { useState, useEffect } from "react";
import { Order, WorkspaceFolder } from "../types";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Flame,
  Building2,
  ShoppingBag,
  Gift,
  Archive,
  Sparkles,
  Layers,
  Search,
  Plus,
  Trash2,
  Edit2,
  Copy,
  HardDrive,
  FileText,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  Filter,
  Calendar,
  X,
  Database,
  RefreshCw,
  Package,
} from "lucide-react";

interface FileSystemSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  workspaces: WorkspaceFolder[];
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (workspace: Omit<WorkspaceFolder, "id" | "createdAt">) => void;
  onUpdateWorkspace: (workspaceId: string, updates: Partial<WorkspaceFolder>) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onDuplicateWorkspace: (workspaceId: string) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  activeTab: string;
  onSelectTab: (tabId: any) => void;
  currentOrders: Order[];
  onFilterMissingArtwork?: () => void;
  onFilterRequireVisual?: () => void;
}

export function FileSystemSidebar({
  isCollapsed,
  onToggleCollapse,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onDuplicateWorkspace,
  selectedDate,
  onSelectDate,
  activeTab,
  onSelectTab,
  currentOrders,
}: FileSystemSidebarProps) {
  // Folder expansion states in the file tree
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    workspaces: true,
    archives: true,
    modules: true,
    smartFilters: false,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceFolder | null>(null);

  // Form states for workspace modal
  const [newWsName, setNewWsName] = useState("");
  const [newWsDescription, setNewWsDescription] = useState("");
  const [newWsColor, setNewWsColor] = useState("#4FC3F7");
  const [newWsIcon, setNewWsIcon] = useState<WorkspaceFolder["icon"]>("folder");
  const [newWsCopyCurrentOrders, setNewWsCopyCurrentOrders] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleOpenCreateModal = () => {
    setNewWsName("");
    setNewWsDescription("");
    setNewWsColor("#4FC3F7");
    setNewWsIcon("folder");
    setNewWsCopyCurrentOrders(false);
    setIsCreateModalOpen(true);
  };

  const handleSaveNewWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    onCreateWorkspace({
      name: newWsName.trim(),
      description: newWsDescription.trim(),
      color: newWsColor,
      icon: newWsIcon,
      orders: newWsCopyCurrentOrders ? [...currentOrders] : [],
      date: selectedDate,
      tag: "Korisnički",
    });

    setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = (ws: WorkspaceFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkspace(ws);
    setNewWsName(ws.name);
    setNewWsDescription(ws.description || "");
    setNewWsColor(ws.color || "#4FC3F7");
    setNewWsIcon(ws.icon || "folder");
    setIsEditModalOpen(true);
  };

  const handleSaveEditWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace || !newWsName.trim()) return;

    onUpdateWorkspace(editingWorkspace.id, {
      name: newWsName.trim(),
      description: newWsDescription.trim(),
      color: newWsColor,
      icon: newWsIcon,
    });

    setIsEditModalOpen(false);
    setEditingWorkspace(null);
  };

  const getWorkspaceIcon = (iconType?: WorkspaceFolder["icon"], colorClass: string = "text-[#4FC3F7]") => {
    switch (iconType) {
      case "flame":
        return <Flame className={`w-4 h-4 ${colorClass}`} />;
      case "building":
        return <Building2 className={`w-4 h-4 ${colorClass}`} />;
      case "shopping-bag":
        return <ShoppingBag className={`w-4 h-4 ${colorClass}`} />;
      case "gift":
        return <Gift className={`w-4 h-4 ${colorClass}`} />;
      case "archive":
        return <Archive className={`w-4 h-4 ${colorClass}`} />;
      case "sparkles":
        return <Sparkles className={`w-4 h-4 ${colorClass}`} />;
      case "layers":
        return <Layers className={`w-4 h-4 ${colorClass}`} />;
      case "folder":
      default:
        return <Folder className={`w-4 h-4 ${colorClass}`} />;
    }
  };

  // Date archives list (simulated prepress history in file system format)
  const archiveDates = [
    { date: "2026-04-12", label: "Danas (2026-04-12)", count: currentOrders.length, status: "Aktivno" },
    { date: "2026-04-11", label: "2026-04-11 (Subota)", count: 18, status: "Arhivirano" },
    { date: "2026-04-10", label: "2026-04-10 (Petak)", count: 24, status: "Arhivirano" },
    { date: "2026-04-09", label: "2026-04-09 (Četvrtak)", count: 15, status: "Arhivirano" },
    { date: "2026-04-08", label: "2026-04-08 (Srijeda)", count: 21, status: "Arhivirano" },
  ];

  // System modules
  const systemModules = [
    { id: "calendar", name: "Centralni Kalendar", path: "/modules/calendar/", icon: Calendar },
    { id: "assets", name: "Klijenti & Asseti", path: "/client_assets/", icon: FolderOpen },
    { id: "prepress", name: "Proizvodnja (58cm)", path: "/prepress/gang_sheet_58cm/", icon: Layers },
    { id: "warehouse", name: "Skladišna Pick-Lista", path: "/warehouse/pick_lists/", icon: Package },
    { id: "analytics", name: "Poslovna Analitika", path: "/reports/analytics/", icon: FileText },
    { id: "plugins", name: "Plugin Studio", path: "/plugins/python/", icon: FileCode },
  ];

  // Filter workspaces based on search
  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ws.description && ws.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Missing artwork count & visual count
  const missingArtCount = currentOrders.filter((o) => o.nedostaje_priprema).length;
  const requireVisualCount = currentOrders.filter((o) => o.zahtijeva_vizual).length;
  const textileOrdersCount = currentOrders.filter((o) => o.artikli.some((a) => a.kategorija === "Tekstil")).length;
  const promoOrdersCount = currentOrders.filter((o) => o.artikli.some((a) => a.kategorija === "Promo")).length;

  if (isCollapsed) {
    return (
      <aside
        id="file-system-sidebar-collapsed"
        className="w-14 lg:w-16 bg-[#08090D]/90 backdrop-blur-xl border-r border-[rgba(255,255,255,0.08)] flex flex-col items-center py-4 space-y-4 neo-shadow transition-all duration-300 z-30 flex-shrink-0"
      >
        {/* Toggle Expand Button */}
        <button
          id="btn-expand-sidebar"
          onClick={onToggleCollapse}
          title="Proširi File System Explorer"
          className="w-10 h-10 rounded-xl glass-panel-inset hover:border-[#4FC3F7] text-slate-300 hover:text-[#4FC3F7] flex items-center justify-center transition-all group"
        >
          <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
        </button>

        <div className="w-8 h-[1px] bg-white/10" />

        {/* Workspaces Quick Icons */}
        <div className="flex-1 overflow-y-auto space-y-2.5 w-full px-2 scrollbar-none flex flex-col items-center">
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspaceId;
            return (
              <button
                key={ws.id}
                onClick={() => onSelectWorkspace(ws.id)}
                title={`${ws.name} (${ws.orders?.length || 0} naloga)`}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-gradient-to-br from-[#0288D1]/80 to-[#4FC3F7]/50 border border-[#4FC3F7] shadow-[0_0_12px_rgba(79,195,247,0.4)] text-white scale-105"
                    : "glass-panel-subtle hover:border-white/20 text-slate-400 hover:text-white"
                }`}
              >
                {getWorkspaceIcon(ws.icon, isActive ? "text-white" : "text-[#4FC3F7]")}
                {ws.orders && ws.orders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0288D1] text-[9px] font-bold text-white flex items-center justify-center border border-black shadow">
                    {ws.orders.length > 9 ? "9+" : ws.orders.length}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={handleOpenCreateModal}
            title="Dodaj novu mapu / workspace"
            className="w-10 h-10 rounded-xl border border-dashed border-white/20 hover:border-[#4FC3F7] text-slate-400 hover:text-[#4FC3F7] flex items-center justify-center transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Disk Info Indicator */}
        <div className="w-10 h-10 rounded-xl glass-panel-inset flex items-center justify-center text-slate-400" title="Lokalna SQLite Baza / Repozitorij: Aktivan">
          <HardDrive className="w-4 h-4 text-emerald-400" />
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside
        id="file-system-sidebar-expanded"
        className="w-72 lg:w-80 bg-[#08090D]/95 backdrop-blur-2xl border-r border-[rgba(255,255,255,0.08)] flex flex-col h-full neo-shadow transition-all duration-300 z-30 flex-shrink-0 select-none overflow-hidden"
      >
        {/* Top Header: File System Root & Collapse Toggle */}
        <div className="p-3.5 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0288D1]/40 to-[#4FC3F7]/20 border border-[#4FC3F7]/40 flex items-center justify-center flex-shrink-0 text-[#4FC3F7]">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">
                  DTF-HUB://FS
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                Prepress Workspace Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenCreateModal}
              title="Nova Proizvodna Mapa"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-[#4FC3F7] transition-all"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              id="btn-collapse-sidebar"
              onClick={onToggleCollapse}
              title="Sažmi stablo mapa"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Pretraži mape, naloge, arhive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#05060A]/80 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#4FC3F7] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Tree View Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 text-xs">
          {/* SECTION 1: WORKSPACES / FOLDERS */}
          <div className="space-y-1">
            <div
              onClick={() => toggleSection("workspaces")}
              className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer rounded hover:bg-white/5"
            >
              <div className="flex items-center gap-1.5">
                {expandedSections.workspaces ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#4FC3F7]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>📂 Radne Mape & Projekti</span>
              </div>
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] font-mono text-slate-300">
                {filteredWorkspaces.length}
              </span>
            </div>

            {expandedSections.workspaces && (
              <div className="space-y-1 pl-2 border-l border-white/5 ml-3">
                {filteredWorkspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspaceId;
                  const count = ws.orders ? ws.orders.length : 0;
                  const totalPcs = ws.orders
                    ? ws.orders.flatMap((o) => o.artikli).reduce((sum, a) => sum + (a.kolicina || 1), 0)
                    : 0;

                  return (
                    <div
                      key={ws.id}
                      onClick={() => onSelectWorkspace(ws.id)}
                      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                        isActive
                          ? "bg-gradient-to-r from-[#0288D1]/25 to-transparent border-[#4FC3F7]/50 text-white shadow-[0_0_12px_rgba(79,195,247,0.15)]"
                          : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ws.color || "#4FC3F7" }}
                        />
                        {getWorkspaceIcon(ws.icon, isActive ? "text-[#4FC3F7]" : "text-slate-400")}
                        <div className="truncate flex-1">
                          <p className={`text-xs truncate font-medium ${isActive ? "text-white font-semibold" : ""}`}>
                            {ws.name}
                          </p>
                          {ws.description && (
                            <p className="text-[10px] text-slate-500 truncate">{ws.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Right Meta & Hover Controls */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1 group-hover:hidden">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              isActive
                                ? "bg-[#0288D1]/40 text-[#4FC3F7] border border-[#4FC3F7]/30"
                                : "bg-black/40 text-slate-400"
                            }`}
                          >
                            {count} {totalPcs > 0 ? `(${totalPcs}k)` : ""}
                          </span>
                        </div>

                        {/* Actions on hover */}
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateWorkspace(ws.id);
                            }}
                            title="Kloniraj mapu"
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {!ws.isSystem && (
                            <>
                              <button
                                onClick={(e) => handleOpenEditModal(ws, e)}
                                title="Uredi mapu"
                                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-[#4FC3F7]"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteWorkspace(ws.id);
                                }}
                                title="Obriši mapu"
                                className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add new Workspace button */}
                <button
                  onClick={handleOpenCreateModal}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-dashed border-white/10 hover:border-[#4FC3F7]/40 text-slate-400 hover:text-[#4FC3F7] text-[11px] transition-all hover:bg-white/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova radna mapa...</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: SMART QUEUES & STATUS */}
          <div className="space-y-1">
            <div
              onClick={() => toggleSection("smartFilters")}
              className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer rounded hover:bg-white/5"
            >
              <div className="flex items-center gap-1.5">
                {expandedSections.smartFilters ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#4FC3F7]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>⚡ Pametni Redovi (Smart Queues)</span>
              </div>
            </div>

            {expandedSections.smartFilters && (
              <div className="space-y-1 pl-2 border-l border-white/5 ml-3">
                <div
                  onClick={() => onSelectTab("calendar")}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer text-slate-300 hover:text-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nedostaje Priprema</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                    {missingArtCount}
                  </span>
                </div>

                <div
                  onClick={() => onSelectTab("calendar")}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Zahtijeva Vizual</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                    {requireVisualCount}
                  </span>
                </div>

                <div
                  onClick={() => onSelectTab("prepress")}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer text-slate-300 hover:text-emerald-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>DTF Tekstil (58cm)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    {textileOrdersCount}
                  </span>
                </div>

                <div
                  onClick={() => onSelectTab("warehouse")}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer text-slate-300 hover:text-purple-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5 text-purple-400" />
                    <span>Promo Program (UV/Laser)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                    {promoOrdersCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: SYSTEM DIRECTORIES & MODULES */}
          <div className="space-y-1">
            <div
              onClick={() => toggleSection("modules")}
              className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer rounded hover:bg-white/5"
            >
              <div className="flex items-center gap-1.5">
                {expandedSections.modules ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#4FC3F7]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>📂 Sistemski Direktoriji</span>
              </div>
            </div>

            {expandedSections.modules && (
              <div className="space-y-0.5 pl-2 border-l border-white/5 ml-3">
                {systemModules.map((mod) => {
                  const Icon = mod.icon;
                  const isActive = activeTab === mod.id;

                  return (
                    <div
                      key={mod.id}
                      onClick={() => onSelectTab(mod.id)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                        isActive
                          ? "bg-white/10 text-[#4FC3F7] font-semibold border-l-2 border-[#4FC3F7]"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{mod.name}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-600 truncate max-w-[80px]">
                        {mod.path}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 4: DATE ARCHIVES (archives/<YYYY-MM-DD>/) */}
          <div className="space-y-1">
            <div
              onClick={() => toggleSection("archives")}
              className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer rounded hover:bg-white/5"
            >
              <div className="flex items-center gap-1.5">
                {expandedSections.archives ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#4FC3F7]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>📁 Arhive Naloga (/archives/)</span>
              </div>
            </div>

            {expandedSections.archives && (
              <div className="space-y-0.5 pl-2 border-l border-white/5 ml-3">
                {archiveDates.map((item) => {
                  const isSelected = selectedDate === item.date;

                  return (
                    <div
                      key={item.date}
                      onClick={() => {
                        onSelectDate(item.date);
                        onSelectTab("calendar");
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#0288D1]/20 text-[#4FC3F7] font-medium border border-[#4FC3F7]/30"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-[#4FC3F7]" : "text-slate-500"}`} />
                        <span className="truncate font-mono text-[11px]">{item.date}/</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.count} nal.
                        </span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4FC3F7]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer: SQLite Cache & Storage Status */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.08)] bg-black/50 text-[11px] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#4FC3F7]" />
              <span>Lokalni Keš & Baza:</span>
            </span>
            <span className="text-emerald-400 font-mono font-medium">Usklađeno</span>
          </div>

          <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/5">
            <div className="bg-gradient-to-r from-[#0288D1] to-[#4FC3F7] h-full w-[28%]" />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>DTF RIP 58cm Ready</span>
            <span>{currentOrders.length} naloga / {workspaces.length} mapa</span>
          </div>
        </div>
      </aside>

      {/* CREATE WORKSPACE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 border border-[#4FC3F7]/30 shadow-[0_0_40px_rgba(79,195,247,0.2)] animate-fade-in">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0288D1]/30 border border-[#4FC3F7]/40 flex items-center justify-center text-[#4FC3F7]">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nova Proizvodna Mapa / Workspace</h3>
                  <p className="text-[11px] text-slate-400">Kreirajte novu organizacijsku mapu za grupiranje naloga</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewWorkspace} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Naziv Mape / Radnog Prostora *</label>
                <input
                  type="text"
                  required
                  placeholder="npr. Hitni DTF Nalozi, Veleprodaja Majica, Promocije..."
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-[#05060A] border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4FC3F7]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Opis / Svrha (opcionalno)</label>
                <input
                  type="text"
                  placeholder="npr. Prioritetna smjena ili narudžbe za vikend sajam"
                  value={newWsDescription}
                  onChange={(e) => setNewWsDescription(e.target.value)}
                  className="w-full bg-[#05060A] border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4FC3F7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Ikona Mape</label>
                  <select
                    value={newWsIcon}
                    onChange={(e) => setNewWsIcon(e.target.value as any)}
                    className="w-full bg-[#05060A] border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4FC3F7]"
                  >
                    <option value="folder">📁 Standardna Mapa</option>
                    <option value="flame">🔥 Hitno / Rush</option>
                    <option value="building">🏢 B2B Veleprodaja</option>
                    <option value="shopping-bag">🛍️ Webshop / Maloprodaja</option>
                    <option value="gift">🎁 Promo / Pokloni</option>
                    <option value="layers">🎞️ DTF Gang Sheet</option>
                    <option value="archive">🗄️ Arhiva</option>
                    <option value="sparkles">✨ Specijalni Projekti</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Boja Oznake</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      "#4FC3F7", // Cyan
                      "#F43F5E", // Rose
                      "#F59E0B", // Amber
                      "#10B981", // Emerald
                      "#A855F7", // Purple
                      "#3B82F6", // Blue
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewWsColor(c)}
                        className={`w-6 h-6 rounded-full border transition-all ${
                          newWsColor === c ? "scale-110 border-white ring-2 ring-[#4FC3F7]" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={newWsCopyCurrentOrders}
                    onChange={(e) => setNewWsCopyCurrentOrders(e.target.checked)}
                    className="rounded bg-[#05060A] border-white/20 text-[#0288D1] focus:ring-0"
                  />
                  <span>Kopiraj trenutnih {currentOrders.length} naloga u novu mapu</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg glass-button-secondary text-xs"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(79,195,247,0.4)]"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Kreiraj Mapu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WORKSPACE MODAL */}
      {isEditModalOpen && editingWorkspace && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 border border-[#4FC3F7]/30 shadow-[0_0_40px_rgba(79,195,247,0.2)] animate-fade-in">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0288D1]/30 border border-[#4FC3F7]/40 flex items-center justify-center text-[#4FC3F7]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Uređivanje Radne Mape</h3>
                  <p className="text-[11px] text-slate-400">Prilagodite naziv i vizualne oznake mape</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditWorkspace} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Naziv Mape *</label>
                <input
                  type="text"
                  required
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-[#05060A] border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4FC3F7]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Opis / Svrha</label>
                <input
                  type="text"
                  value={newWsDescription}
                  onChange={(e) => setNewWsDescription(e.target.value)}
                  className="w-full bg-[#05060A] border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4FC3F7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Ikona Mape</label>
                  <select
                    value={newWsIcon}
                    onChange={(e) => setNewWsIcon(e.target.value as any)}
                    className="w-full bg-[#05060A] border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4FC3F7]"
                  >
                    <option value="folder">📁 Standardna Mapa</option>
                    <option value="flame">🔥 Hitno / Rush</option>
                    <option value="building">🏢 B2B Veleprodaja</option>
                    <option value="shopping-bag">🛍️ Webshop / Maloprodaja</option>
                    <option value="gift">🎁 Promo / Pokloni</option>
                    <option value="layers">🎞️ DTF Gang Sheet</option>
                    <option value="archive">🗄️ Arhiva</option>
                    <option value="sparkles">✨ Specijalni Projekti</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Boja Oznake</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      "#4FC3F7",
                      "#F43F5E",
                      "#F59E0B",
                      "#10B981",
                      "#A855F7",
                      "#3B82F6",
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewWsColor(c)}
                        className={`w-6 h-6 rounded-full border transition-all ${
                          newWsColor === c ? "scale-110 border-white ring-2 ring-[#4FC3F7]" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg glass-button-secondary text-xs"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Spremi Promjene
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
