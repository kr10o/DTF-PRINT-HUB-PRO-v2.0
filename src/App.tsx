import React, { useState, useEffect } from "react";
import { Order, ClientAsset, PluginDefinition, WorkspaceFolder } from "./types";
import { INITIAL_ORDERS, INITIAL_CLIENT_ASSETS, INITIAL_PLUGINS, INITIAL_WORKSPACES } from "./lib/mockSampleOrders";
import { Navbar } from "./components/Navbar";
import { FileSystemSidebar } from "./components/FileSystemSidebar";
import { CalendarOrdersTab } from "./components/CalendarOrdersTab";
import { ClientAssetsTab } from "./components/ClientAssetsTab";
import { PrepressGangSheetTab } from "./components/PrepressGangSheetTab";
import { WarehousePickListTab } from "./components/WarehousePickListTab";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { StockPredictionTab } from "./components/StockPredictionTab";
import { IntegrationsEodTab } from "./components/IntegrationsEodTab";
import { PluginStudioTab } from "./components/PluginStudioTab";
import { PythonPackageTab } from "./components/PythonPackageTab";
import { generateDTFRollPrepressPDF, generateWarehousePickListPDF } from "./lib/pdfGenerator";
import { generateAnsiSqlExport, generateErpXmlExport } from "./lib/analyticsEngine";
import { cleanClientName, parseWorkOrdersOffline } from "./lib/offlineParser";
import {
  auth,
  signInWithGoogle,
  logOut,
  syncAllOrdersToFirestore,
  subscribeToOrders,
  testFirestoreConnection,
} from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  Calendar,
  FolderOpen,
  Layers,
  Package,
  BarChart3,
  Boxes,
  Database,
  Plug,
  FileCode,
  Download,
  Sparkles,
  CheckCircle2,
  X,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Eraser,
  Folder,
} from "lucide-react";

export function App() {
  const [selectedDate, setSelectedDate] = useState<string>("2026-04-12");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);


  // Workspaces state
  const [workspaces, setWorkspaces] = useState<WorkspaceFolder[]>(() => {
    try {
      const saved = localStorage.getItem("dtf_workspaces_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Error loading workspaces from localStorage:", e);
    }
    return INITIAL_WORKSPACES;
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("dtf_active_ws_id");
      if (saved) return saved;
    } catch (e) {}
    return "ws_main";
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("dtf_sidebar_collapsed");
      if (saved !== null) return saved === "true";
    } catch (e) {}
    return false;
  });

  // Current active orders and assets
  const [orders, setOrders] = useState<Order[]>(() => {
    const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || INITIAL_WORKSPACES[0];
    return activeWs.orders && activeWs.orders.length > 0 ? activeWs.orders : INITIAL_ORDERS;
  });

  const [assets, setAssets] = useState<ClientAsset[]>(INITIAL_CLIENT_ASSETS);
  const [plugins, setPlugins] = useState<PluginDefinition[]>(INITIAL_PLUGINS);
  const [activeTab, setActiveTab] = useState<
    "calendar" | "assets" | "prepress" | "warehouse" | "analytics" | "stock" | "integrations" | "plugins" | "python"
  >("calendar");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isQuickExportOpen, setIsQuickExportOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Sync workspaces to localStorage and Firestore
  useEffect(() => {
    try {
      localStorage.setItem("dtf_workspaces_v1", JSON.stringify(workspaces));
    } catch (e) {
      console.warn("Storage error for workspaces:", e);
    }
  }, [workspaces]);

  // Auth listener and Firestore connection check
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    testFirestoreConnection().then((connected) => {
      setIsCloudSynced(connected);
    });

    // Subscribe to real-time Firestore orders
    const unsubFirestore = subscribeToOrders(
      (cloudOrders) => {
        if (cloudOrders && cloudOrders.length > 0) {
          setIsCloudSynced(true);
        }
      },
      () => {
        setIsCloudSynced(false);
      }
    );

    return () => {
      unsubAuth();
      unsubFirestore();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("dtf_active_ws_id", activeWorkspaceId);
    } catch (e) {}
  }, [activeWorkspaceId]);

  useEffect(() => {
    try {
      localStorage.setItem("dtf_sidebar_collapsed", String(isSidebarCollapsed));
    } catch (e) {}
  }, [isSidebarCollapsed]);

  const showNotification = (message: string, type: "success" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Helper to update orders and sync to active workspace + Firestore
  const handleOrdersChange = (newOrders: Order[]) => {
    setOrders(newOrders);
    setWorkspaces((prev) =>
      prev.map((ws) => (ws.id === activeWorkspaceId ? { ...ws, orders: newOrders } : ws))
    );

    // Sync to Firestore cloud
    syncAllOrdersToFirestore(newOrders).catch((err) => {
      console.warn("Firestore sync notice (local mode active):", err);
    });
  };

  const handleSignIn = async () => {
    const user = await signInWithGoogle();
    if (user) {
      showNotification(`Dobrodošli, ${user.displayName || user.email}!`);
    }
  };

  const handleSignOut = async () => {
    await logOut();
    showNotification("Uspješno ste se odjavili.");
  };


  // Workspace actions
  const handleSelectWorkspace = (wsId: string) => {
    if (wsId === activeWorkspaceId) return;

    // Save current orders to currently active workspace
    setWorkspaces((prev) =>
      prev.map((ws) => (ws.id === activeWorkspaceId ? { ...ws, orders } : ws))
    );

    const targetWs = workspaces.find((ws) => ws.id === wsId);
    if (targetWs) {
      setActiveWorkspaceId(wsId);
      setOrders(targetWs.orders || []);
      if (targetWs.date) {
        setSelectedDate(targetWs.date);
      }
      showNotification(`Otvorena radna mapa: "${targetWs.name}" (${targetWs.orders?.length || 0} naloga)`, "info");
    }
  };

  const handleCreateWorkspace = (newWsData: Omit<WorkspaceFolder, "id" | "createdAt">) => {
    const newId = `ws_${Date.now()}`;
    const newWs: WorkspaceFolder = {
      ...newWsData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspaceId(newId);
    setOrders(newWs.orders || []);
    showNotification(`Kreirana nova radna mapa: "${newWs.name}"`);
  };

  const handleUpdateWorkspace = (wsId: string, updates: Partial<WorkspaceFolder>) => {
    setWorkspaces((prev) =>
      prev.map((ws) => (ws.id === wsId ? { ...ws, ...updates } : ws))
    );
    showNotification("Radna mapa je uspješno ažurirana.");
  };

  const handleDeleteWorkspace = (wsId: string) => {
    const target = workspaces.find((ws) => ws.id === wsId);
    if (target?.isSystem) {
      showNotification("Sistemske primarne mape se ne mogu obrisati.", "info");
      return;
    }

    const updated = workspaces.filter((ws) => ws.id !== wsId);
    setWorkspaces(updated);

    if (activeWorkspaceId === wsId) {
      const fallback = updated[0] || INITIAL_WORKSPACES[0];
      setActiveWorkspaceId(fallback.id);
      setOrders(fallback.orders || []);
    }

    showNotification("Radna mapa je uspješno uklonjena.");
  };

  const handleDuplicateWorkspace = (wsId: string) => {
    const target = workspaces.find((ws) => ws.id === wsId);
    if (!target) return;

    const newId = `ws_${Date.now()}`;
    const duplicated: WorkspaceFolder = {
      ...target,
      id: newId,
      name: `${target.name} (Kopija)`,
      orders: [...(target.orders || [])],
      createdAt: new Date().toISOString(),
      isSystem: false,
    };

    setWorkspaces((prev) => [...prev, duplicated]);
    setActiveWorkspaceId(newId);
    setOrders(duplicated.orders || []);
    showNotification(`Klonirana mapa: "${duplicated.name}"`);
  };

  const handleClearAllData = () => {
    setOrders([]);
    setAssets([]);
    setWorkspaces((prev) =>
      prev.map((ws) => (ws.id === activeWorkspaceId ? { ...ws, orders: [] } : ws))
    );
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage clear error:", e);
    }
    setIsClearModalOpen(false);
    showNotification("Svi nalozi i ogledni podaci su uspješno očišćeni.", "success");
  };

  const handleRestoreSampleData = () => {
    setOrders(INITIAL_ORDERS);
    setAssets(INITIAL_CLIENT_ASSETS);
    setWorkspaces(INITIAL_WORKSPACES);
    setActiveWorkspaceId("ws_main");
    setIsClearModalOpen(false);
    showNotification("Učitani su početni ogledni podaci i mape.", "info");
  };

  const handleParseCsv = async (csvContent: string) => {
    setIsAiProcessing(true);
    try {
      // 1. Attempt server-side parsing with Gemini 2.5 Flash / Perplexity JSON schema extraction
      let rawOrders: Order[] | null = null;
      let engineUsed = "Gemini 2.5 Flash";

      try {
        const response = await fetch("/api/orders/parse-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvContent, date: selectedDate }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.narudzbe && Array.isArray(data.narudzbe) && data.narudzbe.length > 0) {
            rawOrders = data.narudzbe;
          }
        }
      } catch (networkErr) {
        console.warn("Primary API route unavailable, checking secondary:", networkErr);
      }

      // 2. Secondary route fallback if first route failed
      if (!rawOrders) {
        try {
          const response = await fetch("/api/parse-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ csvContent, date: selectedDate }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.narudzbe && Array.isArray(data.narudzbe) && data.narudzbe.length > 0) {
              rawOrders = data.narudzbe;
            }
          }
        } catch {
          // Continue to client-side offline parser
        }
      }

      // 3. Client-Side Regex + NLP Schema Extraction if API unavailable
      if (!rawOrders || rawOrders.length === 0) {
        rawOrders = parseWorkOrdersOffline(csvContent);
        engineUsed = "Deterministički Regex & Prepress NLP";
      }

      if (rawOrders && rawOrders.length > 0) {
        // 4. Guaranteed normalization of the 'klijent' field across all orders
        const normalizedOrders: Order[] = rawOrders.map((order) => {
          const rowContext = `${order.naziv_klijenta || ""} ${order.broj_racuna || ""} ${order.oib || ""} ${order.artikli.map(a => `${a.naziv_artikla} ${a.boja} ${a.tekst_za_tisak || ""}`).join(" ")}`;
          const normalizedClient = cleanClientName(order.naziv_klijenta, rowContext);

          return {
            ...order,
            naziv_klijenta: normalizedClient,
          };
        });

        handleOrdersChange(normalizedOrders);
        showNotification(
          `Uspješno parsirano ${normalizedOrders.length} naloga (${engineUsed}) u mapu "${activeWorkspace?.name || "Proizvodnja"}"!`,
          "success"
        );
      } else {
        throw new Error("Nije pronađen nijedan valjan redak ili artikl u unesenom sadržaju.");
      }
    } catch (err: any) {
      console.warn("CSV parsing error:", err);
      showNotification(`Greška pri obradi: ${err.message || "Provjerite format CSV/teksta."}`, "info");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const totalRevenue = orders.reduce((sum, o) => sum + o.ukupan_iznos, 0);

  const tabsConfig = [
    { id: "calendar", label: "Centralni Kalendar", icon: Calendar, badge: orders.length },
    { id: "assets", label: "Klijenti & Asseti", icon: FolderOpen, badge: assets.length },
    { id: "prepress", label: "Proizvodnja (58cm)", icon: Layers, badge: "Prepress" },
    { id: "warehouse", label: "Skladišna Pick-Lista", icon: Package, badge: null },
    { id: "analytics", label: "Poslovna Analitika", icon: BarChart3, badge: null },
    { id: "stock", label: "Predikcija Zaliha", icon: Boxes, badge: "Formula" },
    { id: "integrations", label: "ERP & EOD Izvoz", icon: Database, badge: null },
    { id: "plugins", label: "Plugin Studio", icon: Plug, badge: plugins.length },
    { id: "python", label: "Python Kod & Pakiranje", icon: FileCode, badge: "12 Datoteka" },
  ] as const;

  return (
    <div className="h-screen bg-[#050508] text-[#E0E6ED] flex flex-col font-sans selection:bg-[#0288D1] selection:text-white overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        ordersCount={orders.length}
        totalRevenue={totalRevenue}
        isAiProcessing={isAiProcessing}
        onOpenQuickExport={() => setIsQuickExportOpen(true)}
        onOpenClearModal={() => setIsClearModalOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        activeWorkspaceName={activeWorkspace?.name}
        isCloudSynced={isCloudSynced}
        currentUser={currentUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />


      {/* Floating Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-[#4FC3F7] shadow-[0_0_20px_rgba(79,195,247,0.4)] text-xs text-white animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#4FC3F7]" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Layout with File System Workspace Sidebar & Main Content Canvas */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* File System Sidebar */}
        <FileSystemSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWorkspace={handleCreateWorkspace}
          onUpdateWorkspace={handleUpdateWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          onDuplicateWorkspace={handleDuplicateWorkspace}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentOrders={orders}
        />

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Active Workspace Banner (Glassmorphism Header) */}
            <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 neo-shadow">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 shadow-lg"
                  style={{
                    backgroundColor: `${activeWorkspace?.color || "#4FC3F7"}25`,
                    borderColor: `${activeWorkspace?.color || "#4FC3F7"}60`,
                  }}
                >
                  <Folder className="w-5 h-5" style={{ color: activeWorkspace?.color || "#4FC3F7" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      {activeWorkspace?.name || "Dnevna Proizvodnja"}
                    </h2>
                    {activeWorkspace?.tag && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0288D1]/30 text-[#4FC3F7] border border-[#4FC3F7]/30">
                        {activeWorkspace.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {activeWorkspace?.description || "Aktivni radni nalozi za DTF pisač i skladište"} •{" "}
                    <span className="text-slate-300 font-mono font-medium">{orders.length} naloga u mapi</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="px-3 py-1.5 rounded-lg glass-panel-inset hover:border-[#4FC3F7] text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#4FC3F7]" />
                  <span>Promijeni Mapu ({workspaces.length})</span>
                </button>
              </div>
            </div>

            {/* HEADER STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass p-4 sm:p-5 rounded-xl accent-top neo-shadow transition-all hover:scale-[1.01]">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 opacity-70 mb-1 font-semibold">
                  Ukupni Nalozi
                </p>
                <p className="text-2xl font-bold text-white flex items-baseline gap-2">
                  {orders.length} <span className="text-xs text-emerald-400 font-normal">{orders.length > 0 ? `+${orders.length}` : "0"}</span>
                </p>
              </div>

              <div className="glass p-4 sm:p-5 rounded-xl accent-top neo-shadow transition-all hover:scale-[1.01]">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 opacity-70 mb-1 font-semibold">
                  Nedostaje Priprema
                </p>
                <p className="text-2xl font-bold text-amber-400">
                  {orders.filter((o) => o.nedostaje_priprema || o.zahtijeva_vizual).length}
                </p>
              </div>

              <div className="glass p-4 sm:p-5 rounded-xl accent-top neo-shadow transition-all hover:scale-[1.01]">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 opacity-70 mb-1 font-semibold">
                  Rola Isprintano
                </p>
                <p className="text-2xl font-bold text-white">
                  {orders.length === 0
                    ? "0.0"
                    : (
                        orders
                          .flatMap((o) => o.artikli)
                          .reduce(
                            (sum, item) =>
                              sum +
                              item.pozicije_tiska.reduce(
                                (pSum, p) => pSum + (p.visina_cm || p.sirina_cm * 0.8 + 0.5),
                                0
                              ) *
                                item.kolicina,
                            0
                          ) /
                          100 *
                        0.48 +
                        2.4
                      ).toFixed(1)}{" "}
                  <span className="text-xs text-slate-400 opacity-50 font-normal">m</span>
                </p>
              </div>

              <div className="glass p-4 sm:p-5 rounded-xl accent-top neo-shadow transition-all hover:scale-[1.01]">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 opacity-70 mb-1 font-semibold">
                  Dnevni Prihod
                </p>
                <p className="text-2xl font-bold text-[#4FC3F7]">
                  {totalRevenue.toLocaleString("hr-HR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{" "}
                  <span className="text-xs opacity-50 text-slate-300">€</span>
                </p>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div
              id="main-tabs-bar"
              className="flex items-center gap-1.5 p-1.5 rounded-2xl glass neo-shadow overflow-x-auto"
            >
              {tabsConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    id={`tab-btn-${tab.id}`}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#0288D1] to-[#03A9F4] text-white shadow-[0_0_15px_rgba(79,195,247,0.5)] border border-white/20"
                        : "text-slate-400 hover:text-slate-100 hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#4FC3F7]"}`} />
                    <span>{tab.label}</span>
                    {tab.badge !== null && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-800 text-[#4FC3F7] border border-[#4FC3F7]/30"
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Panes */}
            <div className="tab-pane-container">
              {activeTab === "calendar" && (
                <CalendarOrdersTab
                  orders={orders}
                  onOrdersChange={handleOrdersChange}
                  selectedDate={selectedDate}
                  isAiProcessing={isAiProcessing}
                  onParseCsv={handleParseCsv}
                />
              )}

              {activeTab === "assets" && (
                <ClientAssetsTab
                  orders={orders}
                  assets={assets}
                  onAssetsChange={setAssets}
                />
              )}

              {activeTab === "prepress" && <PrepressGangSheetTab orders={orders} />}

              {activeTab === "warehouse" && <WarehousePickListTab orders={orders} />}

              {activeTab === "analytics" && <AnalyticsTab orders={orders} />}

              {activeTab === "stock" && <StockPredictionTab orders={orders} />}

              {activeTab === "integrations" && <IntegrationsEodTab orders={orders} />}

              {activeTab === "plugins" && (
                <PluginStudioTab
                  plugins={plugins}
                  onPluginsChange={setPlugins}
                  orders={orders}
                />
              )}

              {activeTab === "python" && <PythonPackageTab />}
            </div>
          </div>
        </main>
      </div>

      {/* Clear Data Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 space-y-5 border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.2)]">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Brisanje Privremenih i Demo Podataka</h3>
                  <p className="text-[11px] text-slate-400">Priprema čistog radnog okruženja za stvarne naloge</p>
                </div>
              </div>
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Ova radnja omogućuje uklanjanje svih predinstaliranih testnih naloga, privremenih demo grafika i lokalnog međuspremnika kako biste započeli rad s praznom bazom:
              </p>

              <div className="space-y-2 p-3 rounded-xl bg-black/50 border border-white/10 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-rose-300">
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Uklanja {orders.length} radnih naloga iz aktivne mape</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300">
                  <Eraser className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Briše {assets.length} oglednih klijentskih grafičkih priprema</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <span>Prazni lokalnu memoriju preglednika i međuspremnik naloga</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-blue-200 text-[11px] flex items-start gap-2">
                <RotateCcw className="w-4 h-4 text-[#4FC3F7] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Napomena:</strong> U bilo kojem trenutku možete ponovno učitati ogledne podatke klikom na opciju <em>"Vrati Ogledne Podatke"</em> u ovom dijalogu.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[rgba(255,255,255,0.1)] flex flex-wrap items-center justify-between gap-2.5">
              <button
                onClick={handleRestoreSampleData}
                className="px-3.5 py-2 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#4FC3F7]" />
                Vrati Ogledne (Demo) Podatke
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsClearModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg glass-button-secondary text-xs"
                >
                  Odustani
                </button>

                <button
                  id="confirm-delete-all-btn"
                  onClick={handleClearAllData}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Obriši Sve Podatke
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Export Modal */}
      {isQuickExportOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-[#4FC3F7]" />
                Brzi Izvoz Svih Proizvodnih Dokumenata
              </h3>
              <button
                onClick={() => setIsQuickExportOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Odaberite dokumente koje želite odmah preuzeti za operativni rad u tiskari ili računovodstvu:
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  const doc = generateDTFRollPrepressPDF(orders);
                  doc.save(`DTF_GangSheet_58cm_${selectedDate}.pdf`);
                  showNotification("Preuzet DTF Gang Sheet PDF za RIP!");
                }}
                className="w-full text-left p-3 rounded-xl glass-panel-inset hover:border-[#4FC3F7] transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">🎞️ DTF Gang Sheet PDF (58cm Rola)</h4>
                  <p className="text-[11px] text-slate-400">Linijski nesting s CMYK toniranjem za RIP</p>
                </div>
                <Download className="w-4 h-4 text-[#4FC3F7]" />
              </button>

              <button
                onClick={() => {
                  const doc = generateWarehousePickListPDF(orders);
                  doc.save(`Skladisna_PickLista_${selectedDate}.pdf`);
                  showNotification("Preuzeta Skladišna Pick-Lista (A4 PDF)!");
                }}
                className="w-full text-left p-3 rounded-xl glass-panel-inset hover:border-[#4FC3F7] transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">📦 Skladišna Pick-Lista (A4 PDF)</h4>
                  <p className="text-[11px] text-slate-400">Agregirani artikli po boji i veličini</p>
                </div>
                <Download className="w-4 h-4 text-[#4FC3F7]" />
              </button>

              <button
                onClick={() => {
                  const sql = generateAnsiSqlExport(orders);
                  const blob = new Blob([sql], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `dtf_orders_${selectedDate}.sql`;
                  link.click();
                  URL.revokeObjectURL(url);
                  showNotification("Preuzeta ANSI SQL skripta!");
                }}
                className="w-full text-left p-3 rounded-xl glass-panel-inset hover:border-[#4FC3F7] transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">🗄️ ANSI SQL Transakcije (.sql)</h4>
                  <p className="text-[11px] text-slate-400">Tablice invoices i order_items</p>
                </div>
                <Download className="w-4 h-4 text-[#4FC3F7]" />
              </button>

              <button
                onClick={() => {
                  const xml = generateErpXmlExport(orders);
                  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `erp_export_${selectedDate}.xml`;
                  link.click();
                  URL.revokeObjectURL(url);
                  showNotification("Preuzet ERP Knjigovodstveni XML!");
                }}
                className="w-full text-left p-3 rounded-xl glass-panel-inset hover:border-[#4FC3F7] transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">📑 ERP DokumentiExport (.xml)</h4>
                  <p className="text-[11px] text-slate-400">Knjigovodstveni XML za uvoz u Synesis/Pantheon/Luceed</p>
                </div>
                <Download className="w-4 h-4 text-[#4FC3F7]" />
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsQuickExportOpen(false)}
                className="px-4 py-2 rounded-lg glass-button-secondary text-xs"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
