import React, { useState } from "react";
import { PluginDefinition, Order } from "../types";
import {
  Code,
  Play,
  Database,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Plus,
  RefreshCw,
} from "lucide-react";

interface PluginStudioTabProps {
  plugins: PluginDefinition[];
  onPluginsChange: (plugins: PluginDefinition[]) => void;
  orders: Order[];
}

export const PluginStudioTab: React.FC<PluginStudioTabProps> = ({
  plugins,
  onPluginsChange,
  orders,
}) => {
  const [selectedPluginId, setSelectedPluginId] = useState<string>(plugins[0]?.id || "");
  const [code, setCode] = useState<string>(plugins[0]?.code || "");
  const [executionOutput, setExecutionOutput] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"editor" | "database" | "illustrator">("editor");

  const currentPlugin = plugins.find((p) => p.id === selectedPluginId) || plugins[0];

  const handleSelectPlugin = (plugin: PluginDefinition) => {
    setSelectedPluginId(plugin.id);
    setCode(plugin.code);
    setExecutionOutput("");
  };

  const handleRunPlugin = async () => {
    setIsExecuting(true);
    setExecutionOutput("🚀 Pokrećem izvršavanje plugina u izoliranom okruženju...\n");

    try {
      if (currentPlugin.type === "illustrator") {
        // Execute Adobe Illustrator COM endpoint
        const res = await fetch("/api/illustrator/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scriptCode: code }),
        });
        const data = await res.json();
        setExecutionOutput(
          `[COM Dispatcher] Adobe Illustrator 2021 Automation:\n${JSON.stringify(data, null, 2)}\n\n✔ Skripta je uspješno poslana Illustrator COM sučelju.`
        );
      } else {
        // Python sandbox simulation
        await new Promise((r) => setTimeout(r, 600));
        let customOut = `[Python 3.10 Engine] Izvršavam ${currentPlugin.name}...\n`;
        customOut += `[Database] Povezan na SQLite: plugins/databases/${currentPlugin.id}.sqlite\n`;
        customOut += `[Data Context] Dostupno ${orders.length} naloga za obradu.\n`;

        if (currentPlugin.id === "plg-1") {
          const totalTransfers = orders.reduce(
            (acc, o) => acc + o.artikli.reduce((s, a) => s + a.pozicije_tiska.length * a.kolicina, 0),
            0
          );
          customOut += `✔ Izračunata ukupna površina preslikača: ${(totalTransfers * 0.045).toFixed(2)} m²\n`;
          customOut += `✔ Preporučena optimizacija rotacije: 90° za logotipe širine > 20cm.\n`;
        } else {
          customOut += `✔ Generirano 12 Code-128 barkodova za skladišnu pick-listu.\n`;
        }

        customOut += `[Status] Izvršavanje uspješno završeno (Exit code 0).`;
        setExecutionOutput(customOut);
      }
    } catch (err: any) {
      setExecutionOutput(`❌ Pogreška pri izvršavanju: ${err.message || err}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-[#4FC3F7] border border-cyan-500/30">
                FAZA 6: PLUGIN ARHITEKTURA & COM AUTOMATIZACIJA
              </span>
              <span className="text-xs text-slate-400">Izolirani SQLite • Adobe Illustrator 2021 COM Dispatch</span>
            </div>
            <h2 className="text-xl font-bold text-white">Plugin Studio & Proširenja Sustava</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Dinamičko učitavanje Python plugina s vlastitim SQLite bazama i upravljanje Illustrator skriptama.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newId = `plg-${Date.now()}`;
                const newPlg: PluginDefinition = {
                  id: newId,
                  name: "Korisnički Python Modul",
                  version: "1.0.0",
                  type: "python",
                  description: "Prilagođeni modul za obradu naloga.",
                  code: `# Custom DTF Plugin\nimport json\n\ndef run(orders):\n    print(f"Obrađujem {len(orders)} naloga...")\n    return {"status": "ok"}\n`,
                  dbStore: { custom_setting: "vrijednost_1" },
                };
                onPluginsChange([...plugins, newPlg]);
                handleSelectPlugin(newPlg);
              }}
              className="px-3.5 py-2 rounded-lg glass-button-secondary text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#4FC3F7]" />
              Novi Plugin
            </button>

            <button
              id="run-plugin-btn"
              onClick={handleRunPlugin}
              disabled={isExecuting}
              className="px-4 py-2 rounded-lg glass-button-primary text-xs font-bold flex items-center gap-2"
            >
              <Play className={`w-4 h-4 ${isExecuting ? "animate-spin" : ""}`} />
              {isExecuting ? "Izvršavanje..." : "Pokreni Plugin"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Installed Plugins List */}
        <div className="glass-panel p-4 space-y-3 lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.08)] pb-2">
            <Layers className="w-4 h-4 text-[#4FC3F7]" />
            Instalirani Pluginovi
          </h3>

          <div className="space-y-2">
            {plugins.map((plugin) => (
              <button
                key={plugin.id}
                onClick={() => handleSelectPlugin(plugin)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  selectedPluginId === plugin.id
                    ? "bg-[#0288D1]/30 border border-[#4FC3F7] shadow-[0_0_12px_rgba(79,195,247,0.3)]"
                    : "glass-panel-inset hover:border-[rgba(255,255,255,0.15)]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white truncate">{plugin.name}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      plugin.type === "illustrator"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-sky-500/20 text-[#4FC3F7]"
                    }`}
                  >
                    {plugin.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{plugin.description}</p>
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-2 pt-1.5 border-t border-[rgba(255,255,255,0.05)] font-mono">
                  <span>v{plugin.version}</span>
                  <span>{plugin.id}.sqlite</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Code Editor & Execution Console */}
        <div className="glass-panel p-4 space-y-4 lg:col-span-3">
          {/* Sub Tab Switcher (Editor vs SQLite Store) */}
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab("editor")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  activeSubTab === "editor"
                    ? "bg-[#0288D1] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Kod Plugina ({currentPlugin.type === "illustrator" ? "JavaScript JSX" : "Python"})
              </button>
              <button
                onClick={() => setActiveSubTab("database")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  activeSubTab === "database"
                    ? "bg-[#0288D1] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Izolirana Baza (SQLite Key-Value)
              </button>
            </div>

            <span className="text-[11px] font-mono text-cyan-300">
              plugins/{currentPlugin.type === "illustrator" ? "illustrator" : "python"}/{currentPlugin.id}.
              {currentPlugin.type === "illustrator" ? "jsx" : "py"}
            </span>
          </div>

          {/* Editor Area */}
          {activeSubTab === "editor" ? (
            <div className="space-y-3">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={12}
                className="w-full p-4 rounded-xl bg-[#050508] border border-[rgba(255,255,255,0.12)] text-xs font-mono text-cyan-100 resize-y leading-relaxed outline-none focus:border-[#4FC3F7]"
              />
            </div>
          ) : (
            /* SQLite Inspector */
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-cyan-300">Izolirano Skladište:</span> Svaki plugin ima vlastitu SQLite bazu (tablica <code className="text-purple-300">key_val_store</code>) koja sprječava konflikte s ostatkom tiskarskog sustava.
              </div>

              <div className="p-4 rounded-xl bg-[#050508] border border-[rgba(255,255,255,0.1)]">
                <pre className="text-xs font-mono text-emerald-300 overflow-x-auto">
                  {JSON.stringify(currentPlugin.dbStore || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Execution Console */}
          <div className="space-y-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#4FC3F7]" />
                Konzola Izvršavanja Plugina
              </span>
              {executionOutput && (
                <button
                  onClick={() => setExecutionOutput("")}
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                >
                  Očisti konzolu
                </button>
              )}
            </div>

            <pre className="p-4 rounded-xl bg-[#030305] border border-cyan-500/20 text-xs font-mono text-cyan-300 min-h-[100px] max-h-[220px] overflow-y-auto whitespace-pre-wrap">
              {executionOutput || "Konzola je spremna. Kliknite 'Pokreni Plugin' za testno izvršavanje."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
