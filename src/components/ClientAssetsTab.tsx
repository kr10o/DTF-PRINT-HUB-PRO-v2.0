import React, { useState, useEffect, useRef, useMemo } from "react";
import JSZip from "jszip";
import { ClientAsset, CustomerProfile, Order } from "../types";
import { INITIAL_CUSTOMER_PROFILES } from "../lib/mockSampleOrders";
import {
  FolderOpen,
  FolderTree,
  Upload,
  Download,
  Search,
  Plus,
  Trash2,
  FileCode,
  FileText,
  FileSpreadsheet,
  Check,
  RotateCcw,
  RotateCw,
  Eye,
  Sliders,
  Sparkles,
  Palette,
  X,
  AlertTriangle,
  Loader2,
  Info,
  CheckCircle2,
  ChevronRight,
  Sun,
  Moon,
  Layers,
  Image as ImageIcon,
  Copy,
} from "lucide-react";

interface ClientAssetsTabProps {
  orders: Order[];
  assets: ClientAsset[];
  onAssetsChange: (assets: ClientAsset[]) => void;
  profiles?: CustomerProfile[];
  onProfilesChange?: (profiles: CustomerProfile[]) => void;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info";
}

export const ClientAssetsTab: React.FC<ClientAssetsTabProps> = ({
  orders,
  assets,
  onAssetsChange,
}) => {
  // Profiles State
  const [profiles, setProfiles] = useState<CustomerProfile[]>(() => {
    try {
      const saved = localStorage.getItem("dtf_customer_profiles");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to read stored profiles", e);
    }
    return INITIAL_CUSTOMER_PROFILES;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(() => {
    return profiles[0] || null;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [notesContent, setNotesContent] = useState("");
  const [originalNotesContent, setOriginalNotesContent] = useState("");
  const [activeShirtColorMode, setActiveShirtColorMode] = useState<"dark" | "light">("dark");

  // Modals & Dialogs
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerOib, setNewCustomerOib] = useState("");
  const [newCustomerContact, setNewCustomerContact] = useState("");

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<ClientAsset | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);
  const [previewBg, setPreviewBg] = useState<"bg-black" | "bg-white" | "bg-[#11131a]">("bg-black");

  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [isProcessingBackup, setIsProcessingBackup] = useState(false);
  const [backupProcessingText, setBackupProcessingText] = useState("");

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const newCustomerInputRef = useRef<HTMLInputElement>(null);

  // File System Access API (Local PC Folder Sync)
  const [rootDirHandle, setRootDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const localFolderConnected = !!rootDirHandle;

  // Auto-sync Profiles from Orders if new clients appear in parsed orders
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    let updated = [...profiles];
    let changed = false;

    orders.forEach((o) => {
      if (!updated.some((p) => p.name.toLowerCase() === o.naziv_klijenta.toLowerCase())) {
        const newProf: CustomerProfile = {
          id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: o.naziv_klijenta,
          createdAt: Date.now(),
          oib: o.oib || "",
          contactName: o.kontakt_ime || "",
          contactPhone: o.kontakt_broj || "",
          notes: `AUTOMATSKI SINKRONIZIRANO IZ NALOGA ${o.broj_racuna}:
• Datum računa: ${o.datum_racuna}
• Ukupan iznos: ${o.ukupan_iznos} €
• Artikli: ${o.artikli.map((a) => `${a.kolicina}x ${a.naziv_artikla} (${a.boja || "-"})`).join(", ")}
• CMYK Specifikacija: ${activeShirtColorMode === "dark" ? "0,0,1,0 (White Underbase za tamne majice)" : "0,0,0,100 (Pure Black)"}`,
        };
        updated.push(newProf);
        changed = true;
      }
    });

    if (changed) {
      setProfiles(updated);
      try {
        localStorage.setItem("dtf_customer_profiles", JSON.stringify(updated));
      } catch (e) {}
    }
  }, [orders]);

  // Persist profiles to local storage
  useEffect(() => {
    try {
      localStorage.setItem("dtf_customer_profiles", JSON.stringify(profiles));
    } catch (e) {}
  }, [profiles]);

  // Sync selected customer's notes
  useEffect(() => {
    if (selectedCustomer) {
      const currentNotes = selectedCustomer.notes || "";
      setNotesContent(currentNotes);
      setOriginalNotesContent(currentNotes);
    } else {
      setNotesContent("");
      setOriginalNotesContent("");
    }
  }, [selectedCustomer?.id]);

  const hasUnsavedNotes = useMemo(() => {
    return notesContent !== originalNotesContent;
  }, [notesContent, originalNotesContent]);

  // Toast Helpers
  const showToast = (title: string, message: string, type: "success" | "error" | "info" = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper formatting
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleDateString("hr-HR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    if (!name) return "CL";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const sanitizeFolderName = (name: string) => {
    return name.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "_").trim();
  };

  const getFileExt = (name: string) => name.split(".").pop()?.toLowerCase() || "";

  const isImage = (file: ClientAsset | null) => {
    if (!file) return false;
    return (
      file.fileType === "png" ||
      file.fileType === "jpg" ||
      file.fileType === "svg" ||
      file.fileType === "tiff" ||
      file.filename.match(/\.(png|jpe?g|gif|svg|webp)$/i) !== null
    );
  };

  const isPdf = (file: ClientAsset | null) => file?.fileType === "pdf" || file?.filename.match(/\.pdf$/i) !== null;
  const isAi = (file: ClientAsset | null) => file?.fileType === "ai" || file?.filename.match(/\.ai$/i) !== null;
  const isEps = (file: ClientAsset | null) => file?.fileType === "eps" || file?.filename.match(/\.eps$/i) !== null;
  const isPsd = (file: ClientAsset | null) => file?.fileType === "psd" || file?.filename.match(/\.psd$/i) !== null;

  const getFileIcon = (file: ClientAsset) => {
    if (isAi(file) || isEps(file)) return "text-orange-400";
    if (isPsd(file)) return "text-sky-400";
    if (isPdf(file)) return "text-rose-400";
    if (file.fileType === "svg") return "text-emerald-400";
    return "text-[#4FC3F7]";
  };

  // Filtered lists
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter((p) => p.name.toLowerCase().includes(q) || (p.oib && p.oib.includes(q)));
  }, [profiles, searchQuery]);

  const currentFiles = useMemo(() => {
    if (!selectedCustomer) return [];
    return assets.filter(
      (a) =>
        a.customerId === selectedCustomer.id ||
        a.clientName.toLowerCase() === selectedCustomer.name.toLowerCase()
    );
  }, [assets, selectedCustomer]);

  // Profile actions
  const handleSelectCustomer = (customer: CustomerProfile) => {
    if (selectedCustomer && selectedCustomer.id === customer.id) return;
    if (hasUnsavedNotes && selectedCustomer) {
      handleSaveNotes(selectedCustomer.id, notesContent);
    }
    setSelectedCustomer(customer);
  };

  const handleOpenNewCustomerModal = () => {
    setNewCustomerName("");
    setNewCustomerOib("");
    setNewCustomerContact("");
    setShowNewCustomerModal(true);
    setTimeout(() => {
      newCustomerInputRef.current?.focus();
    }, 100);
  };

  const handleSaveNewCustomer = async () => {
    const trimmed = newCustomerName.trim();
    if (!trimmed) return;

    const newProfile: CustomerProfile = {
      id: `cust-${Date.now()}`,
      name: trimmed,
      oib: newCustomerOib.trim(),
      contactName: newCustomerContact.trim(),
      createdAt: Date.now(),
      notes: `BRAND & PREPRESS NOTES:
• Klijent: ${trimmed}
• CMYK Specifikacija: ${activeShirtColorMode === "dark" ? "0,0,1,0 (White Underbase)" : "0,0,0,100 (Pure Black)"}
• Status: Novi profil kreiran u Client Maps Vaultu`,
    };

    const updated = [...profiles, newProfile];
    setProfiles(updated);
    setSelectedCustomer(newProfile);
    setShowNewCustomerModal(false);

    // If PC folder sync is connected, create subfolder and initial Brand_Notes.txt
    if (rootDirHandle) {
      try {
        const safeName = sanitizeFolderName(trimmed);
        const dirHandle = await rootDirHandle.getDirectoryHandle(safeName, { create: true });
        const noteHandle = await dirHandle.getFileHandle("Brand_Notes.txt", { create: true });
        const writable = await (noteHandle as any).createWritable();
        await writable.write(newProfile.notes || "");
        await writable.close();
      } catch (err) {
        console.warn("PC Sync folder creation warning:", err);
      }
    }

    showToast("Profil Kreiran", `Klijent "${trimmed}" je uspješno dodan u bazu.`, "success");
  };

  const handleConfirmDeleteCustomer = () => {
    if (!selectedCustomer) return;
    const target = selectedCustomer;

    setConfirmDialog({
      show: true,
      title: "Brisanje Profila Klijenta",
      message: `Jeste li sigurni da želite trajno obrisati klijenta "${target.name}" i sve njegove povezane grafičke pripreme?`,
      onConfirm: async () => {
        // Delete all associated files
        const remainingAssets = assets.filter(
          (a) => a.customerId !== target.id && a.clientName.toLowerCase() !== target.name.toLowerCase()
        );
        onAssetsChange(remainingAssets);

        // Delete from profiles
        const remainingProfiles = profiles.filter((p) => p.id !== target.id);
        setProfiles(remainingProfiles);
        setSelectedCustomer(remainingProfiles[0] || null);

        // Remove PC folder if possible
        if (rootDirHandle) {
          try {
            const safeName = sanitizeFolderName(target.name);
            await (rootDirHandle as any).removeEntry(safeName, { recursive: true });
          } catch (e) {}
        }

        showToast("Profil Obrisan", `Profil "${target.name}" i pripadajući asseti su uklonjeni.`, "info");
      },
    });
  };

  const handleSaveNotes = async (targetId?: string, contentOverride?: string) => {
    const id = targetId || selectedCustomer?.id;
    const text = contentOverride !== undefined ? contentOverride : notesContent;
    if (!id) return;

    const updatedProfiles = profiles.map((p) => {
      if (p.id === id) {
        return { ...p, notes: text };
      }
      return p;
    });

    setProfiles(updatedProfiles);
    setOriginalNotesContent(text);

    // Save to PC folder Brand_Notes.txt if connected
    if (rootDirHandle && selectedCustomer) {
      try {
        const safeName = sanitizeFolderName(selectedCustomer.name);
        const dirHandle = await rootDirHandle.getDirectoryHandle(safeName, { create: true });
        const noteHandle = await dirHandle.getFileHandle("Brand_Notes.txt", { create: true });
        const writable = await (noteHandle as any).createWritable();
        await writable.write(text);
        await writable.close();
      } catch (e) {
        console.warn("Failed to write Brand_Notes.txt on PC folder", e);
      }
    }

    showToast("Zabilješke Spremljene", "Brand notes i CMYK smjernice su uspješno ažurirani.", "success");
  };

  // Upload Brand Files
  const handleUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedCustomer) return;

    const newAssetsList: ClientAsset[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = getFileExt(file.name);
      const validTypes = ["ai", "eps", "pdf", "svg", "png", "tiff", "psd", "jpg"];
      const detectedType = (validTypes.includes(ext) ? ext : "png") as ClientAsset["fileType"];

      let previewUrl = "";
      let binaryData: ArrayBuffer | undefined = undefined;

      try {
        binaryData = await file.arrayBuffer();
        if (file.type.startsWith("image/") || ext === "svg" || ext === "png" || ext === "jpg") {
          const blob = new Blob([binaryData], { type: file.type || "image/png" });
          previewUrl = URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn("Buffer conversion notice:", err);
      }

      const newAsset: ClientAsset = {
        id: `ast-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        clientName: selectedCustomer.name,
        customerId: selectedCustomer.id,
        filename: file.name,
        fileType: detectedType,
        category: activeShirtColorMode === "dark" ? "logo_dark_shirts" : "logo_light_shirts",
        cmykSpecification:
          activeShirtColorMode === "dark" ? "0,0,1,0 (White Underbase)" : "0,0,0,100 (Pure Black)",
        dimensionsMm: "240 x 180 mm",
        uploadedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        sizeBytes: file.size,
        previewUrl: previewUrl || undefined,
        bgClass: activeShirtColorMode === "dark" ? "bg-black" : "bg-white",
        binaryData,
      };

      newAssetsList.push(newAsset);

      // Write to PC Sync directory if active
      if (rootDirHandle && selectedCustomer) {
        try {
          const safeName = sanitizeFolderName(selectedCustomer.name);
          const dirHandle = await rootDirHandle.getDirectoryHandle(safeName, { create: true });
          const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
          const writable = await (fileHandle as any).createWritable();
          await writable.write(binaryData || file);
          await writable.close();
        } catch (e) {
          console.warn("PC Sync upload write notice:", e);
        }
      }
    }

    onAssetsChange([...newAssetsList, ...assets]);
    showToast(
      "Asseti Učitani",
      `Uspješno spremljeno ${newAssetsList.length} grafičkih priprema za "${selectedCustomer.name}".`,
      "success"
    );
    event.target.value = "";
  };

  const handleToggleBg = (file: ClientAsset) => {
    const nextBg: "bg-black" | "bg-white" | "bg-[#11131a]" =
      file.bgClass === "bg-white" ? "bg-black" : "bg-white";

    const updated = assets.map((a) => {
      if (a.id === file.id) {
        return { ...a, bgClass: nextBg };
      }
      return a;
    });

    onAssetsChange(updated);
    showToast(
      "Vizualna Pozadina Promijenjena",
      `Prikaz postavljen na ${nextBg === "bg-white" ? "Svijetlu podlogu (provjera crnog CMYK)" : "Tamnu podlogu (provjera bijelog 0,0,1,0)"}`,
      "info"
    );
  };

  const handleDownloadFile = (file: ClientAsset) => {
    try {
      if (file.previewUrl) {
        const a = document.createElement("a");
        a.href = file.previewUrl;
        a.download = file.filename;
        a.click();
      } else {
        // Create mock binary blob
        const blob = new Blob([file.binaryData || file.filename], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      showToast("Preuzimanje Pokrenuto", `Datoteka "${file.filename}" se preuzima na vaše računalo.`, "info");
    } catch (e) {
      showToast("Greška", "Neuspjelo preuzimanje datoteke.", "error");
    }
  };

  const handleConfirmDeleteFile = (file: ClientAsset) => {
    setConfirmDialog({
      show: true,
      title: "Brisanje Datoteke",
      message: `Želite li ukloniti datoteku "${file.filename}" iz repozitorija klijenta?`,
      onConfirm: async () => {
        const updated = assets.filter((a) => a.id !== file.id);
        onAssetsChange(updated);

        // Remove from PC sync folder
        if (rootDirHandle && selectedCustomer) {
          try {
            const safeName = sanitizeFolderName(selectedCustomer.name);
            const dirHandle = await rootDirHandle.getDirectoryHandle(safeName, { create: false });
            await (dirHandle as any).removeEntry(file.filename);
          } catch (e) {}
        }

        showToast("Datoteka Uklonjena", `Grafički asset "${file.filename}" je obrisan.`, "info");
      },
    });
  };

  // Preview Modal
  const handleOpenPreview = (file: ClientAsset) => {
    setPreviewFile(file);
    setPreviewRotation(0);
    setPreviewBg(file.bgClass || "bg-black");
    setShowPreviewModal(true);
  };

  const handleRotatePreview = (degrees: number) => {
    setPreviewRotation((prev) => (prev + degrees + 360) % 360);
  };

  const handleSavePreviewEdits = () => {
    if (!previewFile) return;

    const updated = assets.map((a) => {
      if (a.id === previewFile.id) {
        return {
          ...a,
          bgClass: previewBg,
        };
      }
      return a;
    });

    onAssetsChange(updated);
    setShowPreviewModal(false);
    showToast("Promjene Spremljene", `Ažurirane postavke za "${previewFile.filename}".`, "success");
  };

  // File System Access API - PC Folder Sync
  const handleConnectLocalFolder = async () => {
    try {
      if (!(window as any).showDirectoryPicker) {
        showToast(
          "PC Sync Nije Podržan",
          "Vaš preglednik ne podržava File System Access API. Koristite Chrome ili Edge za izravnu PC sinkronizaciju.",
          "error"
        );
        return;
      }

      const dirHandle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      });

      setRootDirHandle(dirHandle);
      setIsProcessingBackup(true);
      setBackupProcessingText(`Skeniram Windows mapu: ${dirHandle.name}...`);

      let newProfilesCount = 0;
      let newFilesCount = 0;
      const currentProfilesList = [...profiles];
      const newAssetsBuffer: ClientAsset[] = [];

      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === "directory") {
          const custName = entry.name.replace(/_/g, " ");
          let existingProfile = currentProfilesList.find(
            (p) => p.name.toLowerCase() === custName.toLowerCase()
          );

          if (!existingProfile) {
            existingProfile = {
              id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: custName,
              createdAt: Date.now(),
              notes: "",
            };
            currentProfilesList.push(existingProfile);
            newProfilesCount++;
          }

          const clientDir = await dirHandle.getDirectoryHandle(entry.name);
          for await (const fileEntry of (clientDir as any).values()) {
            if (fileEntry.kind === "file") {
              const f: File = await fileEntry.getFile();
              if (f.name === "Brand_Notes.txt") {
                const text = await f.text();
                existingProfile.notes = text;
              } else {
                const ext = getFileExt(f.name);
                const arrayBuffer = await f.arrayBuffer();
                let previewUrl = "";
                if (f.type.startsWith("image/") || ext === "svg" || ext === "png" || ext === "jpg") {
                  const blob = new Blob([arrayBuffer], { type: f.type || "image/png" });
                  previewUrl = URL.createObjectURL(blob);
                }

                newAssetsBuffer.push({
                  id: `ast-pc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  clientName: existingProfile.name,
                  customerId: existingProfile.id,
                  filename: f.name,
                  fileType: (["ai", "eps", "pdf", "svg", "png", "tiff", "psd", "jpg"].includes(ext)
                    ? ext
                    : "png") as any,
                  category: "general",
                  cmykSpecification: "0,0,1,0 (White Underbase)",
                  dimensionsMm: "240 x 180 mm",
                  uploadedAt: new Date(f.lastModified).toISOString().replace("T", " ").substring(0, 16),
                  sizeBytes: f.size,
                  previewUrl,
                  bgClass: "bg-black",
                  binaryData: arrayBuffer,
                });
                newFilesCount++;
              }
            }
          }
        }
      }

      setProfiles(currentProfilesList);
      if (newAssetsBuffer.length > 0) {
        onAssetsChange([...newAssetsBuffer, ...assets]);
      }

      showToast(
        "PC Sinkronizacija Aktivna",
        `Povezana mapa "${dirHandle.name}". Učitano ${newProfilesCount} profila i ${newFilesCount} novih priprema.`,
        "success"
      );
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("PC folder sync error:", e);
        showToast("Greška Povezivanja", "Nije uspjelo povezivanje s lokalnom mapom računala.", "error");
      }
    } finally {
      setIsProcessingBackup(false);
    }
  };

  // Export Backup (.ZIP Archive using JSZip)
  const handleExportBackup = async () => {
    setIsProcessingBackup(true);
    setBackupProcessingText("Pripremam arhivu sigurnosne kopije...");

    try {
      const zip = new JSZip();

      setBackupProcessingText("Komprimiram profile i metapodatke...");
      zip.file("customers.json", JSON.stringify(profiles, null, 2));

      const filesMetadata = assets.map((a) => {
        const { binaryData, previewUrl, ...meta } = a;
        return meta;
      });
      zip.file("files_metadata.json", JSON.stringify(filesMetadata, null, 2));

      setBackupProcessingText("Spremam binarne grafičke pripreme...");
      const filesFolder = zip.folder("brand_assets");

      for (const asset of assets) {
        if (asset.previewUrl && asset.previewUrl.startsWith("data:")) {
          // base64 SVG / image
          const base64Data = asset.previewUrl.split(",")[1];
          filesFolder?.file(asset.filename, base64Data || "", { base64: true });
        } else if (asset.binaryData) {
          filesFolder?.file(asset.filename, asset.binaryData);
        } else {
          filesFolder?.file(asset.filename, `MOCK_ASSET_CONTENT for ${asset.filename}`);
        }
      }

      setBackupProcessingText("Generiram .ZIP datoteku...");
      const dateStr = new Date().toISOString().split("T")[0];
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AIPerception_DTF_Vault_Backup_${dateStr}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast("Backup Uspješan", "Kompletna baza profila i grafika je izvezena u ZIP arhivu.", "success");
    } catch (e: any) {
      console.error(e);
      showToast("Greška Izvoza", "Došlo je do greške prilikom generiranja sigurnosne kopije.", "error");
    } finally {
      setIsProcessingBackup(false);
    }
  };

  // Restore Backup (.ZIP)
  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setConfirmDialog({
      show: true,
      title: "Vraćanje Sigurnosne Kopije (Restore)",
      message:
        "Upozorenje: Vraćanje sigurnosne kopije zamijenit će trenutne profile i assete s podacima iz ZIP arhive. Želite li nastaviti?",
      onConfirm: async () => {
        setIsProcessingBackup(true);
        setBackupProcessingText("Raspakiram ZIP arhivu...");

        try {
          const zip = await JSZip.loadAsync(file);
          const custFile = zip.file("customers.json");
          const metaFile = zip.file("files_metadata.json");

          if (!custFile || !metaFile) {
            throw new Error("Nedostaju 'customers.json' ili 'files_metadata.json' unutar arhive.");
          }

          const custStr = await custFile.async("string");
          const metaStr = await metaFile.async("string");

          const importedProfiles: CustomerProfile[] = JSON.parse(custStr);
          const importedMetadata: any[] = JSON.parse(metaStr);

          const importedAssets: ClientAsset[] = [];
          const assetsFolder = zip.folder("brand_assets");

          for (const meta of importedMetadata) {
            let previewUrl = "";
            let binData: ArrayBuffer | undefined = undefined;

            if (assetsFolder) {
              const fileInZip = assetsFolder.file(meta.filename);
              if (fileInZip) {
                binData = await fileInZip.async("arraybuffer");
                const ext = getFileExt(meta.filename);
                if (["svg", "png", "jpg", "jpeg", "webp"].includes(ext)) {
                  const blob = new Blob([binData], { type: `image/${ext === "svg" ? "svg+xml" : ext}` });
                  previewUrl = URL.createObjectURL(blob);
                }
              }
            }

            importedAssets.push({
              ...meta,
              previewUrl: previewUrl || meta.previewUrl,
              binaryData: binData,
            });
          }

          setProfiles(importedProfiles);
          onAssetsChange(importedAssets);
          setSelectedCustomer(importedProfiles[0] || null);

          showToast("Baza Uspješno Vraćena", `Učitano ${importedProfiles.length} profila i ${importedAssets.length} asseta.`, "success");
        } catch (e: any) {
          console.error(e);
          showToast("Greška pri Vraćanju", e.message || "Neispravna ili oštećena ZIP arhiva.", "error");
        } finally {
          setIsProcessingBackup(false);
          event.target.value = "";
        }
      },
    });
  };

  // CSV Export & Import
  const handleExportCSV = () => {
    if (profiles.length === 0) {
      showToast("Izvoz Nije Moguć", "Nema profila za izvoz u CSV.", "info");
      return;
    }

    let csv = "Name,OIB,Contact,Created At,Notes\n";
    profiles.forEach((p) => {
      const escape = (str: any) => `"${String(str || "").replace(/"/g, '""')}"`;
      const date = new Date(p.createdAt).toISOString();
      csv += `${escape(p.name)},${escape(p.oib || "")},${escape(p.contactName || "")},${escape(date)},${escape(p.notes || "")}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AIPerception_Profiles_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("CSV Izvezen", "Popis profila je uspješno spremljen.", "success");
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        showToast("Greška", "CSV datoteka je prazna.", "error");
        return;
      }

      let importedCount = 0;
      const updated = [...profiles];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Parse CSV line taking quotes into account
        const cells = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const cleanCells = cells.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"'));
        const name = cleanCells[0]?.trim();

        if (name && !updated.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
          updated.push({
            id: `cust-${Date.now()}-${i}`,
            name,
            oib: cleanCells[1] || "",
            contactName: cleanCells[2] || "",
            createdAt: Date.now(),
            notes: cleanCells[4] || `Uvezeno iz CSV-a: ${new Date().toLocaleDateString("hr-HR")}`,
          });
          importedCount++;
        }
      }

      setProfiles(updated);
      showToast("CSV Uvezen", `Uspješno uvezeno ${importedCount} novih profila klijenata.`, "success");
    } catch (e) {
      showToast("Greška", "Nije uspjelo čitanje CSV datoteke.", "error");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header Bar */}
      <div className="glass-panel p-4 rounded-xl border border-[rgba(255,255,255,0.1)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3e92cc] to-[#0a2463] flex items-center justify-center shadow-lg border border-[rgba(255,255,255,0.2)]">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
                  AI PERCEPTION <span className="text-[#4FC3F7]">VAULT</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#0a2463]/40 border border-[#d8315b]/40 text-[10px] font-semibold text-cyan-200 uppercase tracking-wider">
                  Client Maps & Offline Repository
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Lokalno upravljanje profilima, vektorskim pripremama, CMYK specifikacijama i automatska sinkronizacija s mapama računala.
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Shirt CMYK Preview Mode Switcher */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(5,6,10,0.8)] border border-[rgba(255,255,255,0.1)] text-xs">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Palette className="w-3.5 h-3.5 text-[#4FC3F7]" />
                CMYK:
              </span>
              <button
                onClick={() => setActiveShirtColorMode("dark")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  activeShirtColorMode === "dark"
                    ? "bg-slate-900 text-white border border-[#4FC3F7] shadow-[0_0_10px_rgba(79,195,247,0.3)]"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Bijeli underbase 0,0,1,0 za tamne majice"
              >
                Tamne (0,0,1,0)
              </button>
              <button
                onClick={() => setActiveShirtColorMode("light")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  activeShirtColorMode === "light"
                    ? "bg-slate-100 text-slate-900 border border-[#0288D1] shadow-[0_0_10px_rgba(2,136,209,0.3)]"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Čista crna 0,0,0,100 za svijetle majice"
              >
                Svijetle (0,0,0,100)
              </button>
            </div>

            {/* PC Sync Button */}
            <button
              onClick={handleConnectLocalFolder}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                localFolderConnected
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-transparent border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.05)] text-slate-300 hover:text-white"
              }`}
            >
              <FolderTree className={`w-4 h-4 ${localFolderConnected ? "text-emerald-400" : "text-[#4FC3F7]"}`} />
              <span>{localFolderConnected ? "PC Sync Aktivan" : "Poveži PC Mapu"}</span>
            </button>

            <div className="w-px h-5 bg-[rgba(255,255,255,0.1)] hidden sm:block"></div>

            {/* Export Backup ZIP */}
            <button
              onClick={handleExportBackup}
              className="px-3 py-1.5 rounded-lg bg-transparent border border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.05)] text-slate-300 hover:text-white transition-all text-xs font-medium flex items-center gap-1.5"
              title="Izvezi kompletnu sigurnosnu kopiju sa svim pripremama u ZIP"
            >
              <Download className="w-3.5 h-3.5 text-[#4FC3F7]" />
              <span className="hidden sm:inline">Export Backup (.zip)</span>
            </button>

            {/* Restore Backup ZIP */}
            <label className="px-3 py-1.5 rounded-lg bg-transparent border border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.05)] text-slate-300 hover:text-white transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#4FC3F7]" />
              <span className="hidden sm:inline">Restore (.zip)</span>
              <input type="file" accept=".zip" className="hidden" onChange={handleImportBackup} />
            </label>
          </div>
        </div>
      </div>

      {/* Main Workspace: Customer Sidebar + Files Grid & Brand Notes */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[620px]">
        {/* Left Sidebar: Customer Profiles (Client Maps) */}
        <aside className="lg:col-span-3 bg-[#0A0B10]/90 rounded-xl border border-[rgba(255,255,255,0.1)] flex flex-col shrink-0 overflow-hidden shadow-lg">
          {/* Profile Actions */}
          <div className="p-3.5 border-b border-[rgba(255,255,255,0.08)] space-y-2.5">
            <button
              onClick={handleOpenNewCustomerModal}
              className="w-full h-9 rounded-lg bg-[#3e92cc] hover:bg-[#3e92cc]/90 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md border border-[#3e92cc]/50 transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" /> Novi Profil Klijenta
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="flex-1 h-7 rounded-md bg-transparent border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.05)] text-slate-300 hover:text-white transition-all text-[11px] font-medium flex items-center justify-center gap-1"
                title="Izvezi profile u CSV"
              >
                <FileSpreadsheet className="w-3 h-3 text-[#4FC3F7]" /> Export CSV
              </button>
              <label
                className="flex-1 h-7 rounded-md bg-transparent border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.05)] text-slate-300 hover:text-white transition-all text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                title="Uvezi profile iz CSV-a"
              >
                <Upload className="w-3 h-3 text-[#4FC3F7]" /> Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              </label>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-[rgba(255,255,255,0.05)]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pretraži profile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 bg-[#05060A] border border-[rgba(255,255,255,0.1)] rounded-lg pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4FC3F7] transition-colors"
              />
            </div>
          </div>

          {/* Profile List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-transparent">
            {filteredProfiles.length === 0 ? (
              <div className="text-center p-6 text-slate-500 text-xs">
                Nema pronađenih profila klijenata.
              </div>
            ) : (
              filteredProfiles.map((customer) => {
                const isSelected = selectedCustomer?.id === customer.id;
                const fileCount = assets.filter(
                  (a) => a.customerId === customer.id || a.clientName.toLowerCase() === customer.name.toLowerCase()
                ).length;

                return (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between group transition-all ${
                      isSelected
                        ? "bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] text-white shadow-sm"
                        : "border border-transparent text-slate-400 hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm transition-colors ${
                          isSelected
                            ? "bg-[#3e92cc] text-white shadow-[0_0_8px_rgba(62,146,204,0.5)]"
                            : "bg-[#0a2463]/40 text-[#4FC3F7] border border-[#0a2463]/60"
                        }`}
                      >
                        {getInitials(customer.name)}
                      </div>
                      <div className="truncate">
                        <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-white">
                          {customer.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {fileCount} {fileCount === 1 ? "priprema" : "priprema"}
                        </p>
                      </div>
                    </div>
                    {isSelected && <ChevronRight className="w-3.5 h-3.5 text-[#4FC3F7] opacity-80" />}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Work Area: Brand Files Grid & Brand Notes */}
        <main className="lg:col-span-9 flex flex-col bg-[#0A0B10]/90 rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden shadow-lg">
          {!selectedCustomer ? (
            /* No Selection State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#05060A] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-slate-400">
                <FolderOpen className="w-8 h-8 text-[#4FC3F7]/60" />
              </div>
              <h3 className="text-base font-semibold text-slate-300">Nije odabran profil klijenta</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Odaberite klijenta iz bočne trake ili kliknite na "+ Novi Profil Klijenta" za kreiranje nove mape.
              </p>
            </div>
          ) : (
            /* Selected Customer State */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Customer Header */}
              <div className="bg-[#05060A] px-6 py-4 border-b border-[rgba(255,255,255,0.08)] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    {selectedCustomer.name}
                  </h2>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    <span>Kreiran: {formatDate(selectedCustomer.createdAt)}</span>
                    {selectedCustomer.oib && <span>• OIB: {selectedCustomer.oib}</span>}
                    {selectedCustomer.contactName && <span>• Kontakt: {selectedCustomer.contactName}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="h-8 px-3.5 rounded-lg bg-[#0E1017] border border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.05)] text-[#4FC3F7] transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm">
                    <Upload className="w-3.5 h-3.5" /> Učitaj Brand Datoteke
                    <input
                      type="file"
                      multiple
                      accept=".ai,.eps,.pdf,.svg,.png,.tiff,.psd,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleUploadFiles}
                    />
                  </label>
                  <button
                    onClick={handleConfirmDeleteCustomer}
                    className="h-8 px-3 rounded-lg bg-transparent border border-transparent hover:bg-rose-950/40 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-all text-xs font-medium flex items-center gap-1"
                    title="Obriši profil klijenta"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">Obriši Profil</span>
                  </button>
                </div>
              </div>

              {/* Split Content: Files Grid (Left) + Brand Notes (Right) */}
              <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
                {/* Files Grid Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">
                      Grafičke Pripreme & Vektori ({currentFiles.length})
                    </span>
                    <span className="text-[11px]">
                      Prikaz: {activeShirtColorMode === "dark" ? "Tamna podloga (0,0,1,0)" : "Svijetla podloga (0,0,0,100)"}
                    </span>
                  </div>

                  {currentFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed border-[rgba(255,255,255,0.1)] rounded-xl bg-[rgba(255,255,255,0.02)] p-6">
                      <div className="w-12 h-12 rounded-full bg-[#05060A] border border-[rgba(255,255,255,0.1)] flex items-center justify-center mb-3 text-[#4FC3F7]">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200">Nema dodanih brand datoteka</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        Učitajte logotipe (.AI, .SVG, .PDF, .PNG, .PSD) ili povežite lokalnu mapu za automatski sync za {selectedCustomer.name}.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-max">
                      {currentFiles.map((file) => {
                        const bgMode = file.bgClass || "bg-black";

                        return (
                          <div
                            key={file.id}
                            id={`asset-card-${file.id}`}
                            className="bg-[#05060A] rounded-xl border border-[rgba(255,255,255,0.1)] shadow-sm hover:border-[rgba(79,195,247,0.4)] hover:shadow-lg transition-all group overflow-hidden flex flex-col h-60"
                          >
                            {/* Preview Canvas Box */}
                            <div
                              onClick={() => handleOpenPreview(file)}
                              className={`flex-1 flex items-center justify-center overflow-hidden relative cursor-pointer transition-colors duration-300 ${
                                bgMode === "bg-white" ? "bg-white" : "bg-[#07080D]"
                              }`}
                            >
                              {/* Hover Action Overlay */}
                              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10 backdrop-blur-[2px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleBg(file);
                                  }}
                                  className="w-8 h-8 rounded-lg bg-[#0a2463] hover:bg-[#3e92cc] text-white flex items-center justify-center transition-all shadow-sm"
                                  title="Promijeni podlogu (Tamno / Svijetlo)"
                                >
                                  {bgMode === "bg-white" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPreview(file);
                                  }}
                                  className="w-8 h-8 rounded-lg bg-[#0a2463] hover:bg-[#3e92cc] text-white flex items-center justify-center transition-all shadow-sm"
                                  title="Pregledaj i rotiraj"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFile(file);
                                  }}
                                  className="w-8 h-8 rounded-lg bg-[#0a2463] hover:bg-[#3e92cc] text-white flex items-center justify-center transition-all shadow-sm"
                                  title="Preuzmi"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmDeleteFile(file);
                                  }}
                                  className="w-8 h-8 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white flex items-center justify-center transition-all shadow-sm"
                                  title="Obriši"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Thumbnail Render */}
                              {file.previewUrl ? (
                                <img
                                  src={file.previewUrl}
                                  alt={file.filename}
                                  className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-[#0E1017] border border-[rgba(255,255,255,0.1)] flex items-center justify-center shadow-inner">
                                  <FileCode className={`w-7 h-7 ${getFileIcon(file)}`} />
                                </div>
                              )}
                            </div>

                            {/* Card Footer Info */}
                            <div className="p-3 border-t border-[rgba(255,255,255,0.08)] bg-[#0A0B10] shrink-0">
                              <p className="text-xs font-semibold text-slate-200 truncate" title={file.filename}>
                                {file.filename}
                              </p>
                              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                                <span>{formatBytes(file.sizeBytes)}</span>
                                <span className="bg-[#05060A] text-[#4FC3F7] border border-[rgba(79,195,247,0.3)] px-1.5 py-0.5 rounded uppercase font-mono font-bold">
                                  {file.fileType}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Brand Notes (Brand_Notes.txt) */}
                <aside className="w-full xl:w-80 bg-[#05060A] border-t xl:border-t-0 xl:border-l border-[rgba(255,255,255,0.08)] flex flex-col shrink-0 h-72 xl:h-full">
                  <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center bg-[#07080D] shrink-0">
                    <h3 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#4FC3F7]" /> Brand Notes (Brand_Notes.txt)
                    </h3>
                    {hasUnsavedNotes ? (
                      <button
                        onClick={() => handleSaveNotes()}
                        className="h-6 px-2.5 rounded bg-[#3e92cc] hover:bg-[#3e92cc]/80 text-white text-[11px] font-semibold transition-all shadow-sm border border-[#3e92cc]/50 flex items-center gap-1"
                      >
                        Spremi
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Spremljeno
                      </span>
                    )}
                  </div>
                  <div className="flex-1 relative p-3">
                    <textarea
                      value={notesContent}
                      onChange={(e) => setNotesContent(e.target.value)}
                      placeholder="Unesite HEX kodove, Pantone tonove, CMYK specifikaciju (npr. 0,0,1,0 White underbase), tipografiju, toplinu preše (160°C / 15s) ili kontakt detalje..."
                      className="w-full h-full p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#4FC3F7] text-xs text-slate-300 bg-transparent border border-[rgba(255,255,255,0.08)] rounded-lg placeholder-slate-600 leading-relaxed font-mono"
                    ></textarea>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 1. Preview & Transform Modal */}
      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setShowPreviewModal(false)} />
          <div className="bg-[#0A0B10] border border-[rgba(255,255,255,0.15)] rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.1)] flex justify-between items-center bg-[#05060A]">
              <h3 className="font-semibold text-white text-xs sm:text-sm flex items-center gap-2 truncate pr-4">
                <FileCode className={`w-4 h-4 ${getFileIcon(previewFile)}`} />
                <span className="truncate">{previewFile.filename}</span>
              </h3>

              <div className="flex items-center gap-2">
                {/* Background Toggle */}
                <button
                  onClick={() => setPreviewBg((prev) => (prev === "bg-white" ? "bg-black" : "bg-white"))}
                  className="w-7 h-7 rounded-md bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] text-slate-300 text-xs flex items-center justify-center"
                  title="Promijeni pozadinu"
                >
                  {previewBg === "bg-white" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </button>
                {/* Rotate Buttons */}
                <button
                  onClick={() => handleRotatePreview(-90)}
                  className="w-7 h-7 rounded-md bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] text-slate-300 text-xs flex items-center justify-center"
                  title="Rotiraj lijevo (-90°)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRotatePreview(90)}
                  className="w-7 h-7 rounded-md bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] text-slate-300 text-xs flex items-center justify-center"
                  title="Rotiraj desno (+90°)"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-5 bg-white/10 mx-1"></div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-slate-400 hover:text-white w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Canvas Content */}
            <div
              className={`p-6 flex-1 overflow-hidden flex items-center justify-center relative ${
                previewBg === "bg-white" ? "bg-white" : "bg-[#05060A]"
              }`}
              style={{ minHeight: "380px" }}
            >
              {previewFile.previewUrl ? (
                <img
                  src={previewFile.previewUrl}
                  alt={previewFile.filename}
                  style={{ transform: `rotate(${previewRotation}deg)` }}
                  className="max-w-full max-h-[60vh] object-contain transition-transform duration-300 drop-shadow-md"
                />
              ) : (
                <div className="text-center space-y-2 text-slate-400">
                  <FileCode className="w-16 h-16 text-[#4FC3F7] mx-auto" />
                  <p className="text-sm font-semibold">{previewFile.filename}</p>
                  <p className="text-xs text-slate-500 font-mono">Format: {previewFile.fileType.toUpperCase()}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.1)] flex justify-between items-center bg-[#05060A]">
              <span className="text-xs text-slate-400">
                {formatBytes(previewFile.sizeBytes)} • {previewFile.fileType.toUpperCase()} • CMYK:{" "}
                {previewFile.cmykSpecification}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white border border-[rgba(255,255,255,0.1)]"
                >
                  Zatvori
                </button>
                <button
                  onClick={handleSavePreviewEdits}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#3e92cc] hover:bg-[#3e92cc]/80 text-white shadow-sm border border-[#3e92cc]/50"
                >
                  Spremi Izmjene
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. New Customer Profile Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowNewCustomerModal(false)} />
          <div className="bg-[#0A0B10] border border-[rgba(255,255,255,0.15)] rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)] flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Kreiraj Novi Profil Klijenta</h3>
              <button onClick={() => setShowNewCustomerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#4FC3F7] uppercase tracking-wider mb-1">
                  Naziv Klijenta / Obrta / Tvrtke *
                </label>
                <input
                  ref={newCustomerInputRef}
                  type="text"
                  placeholder="npr. Craft Brewery d.o.o."
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveNewCustomer();
                  }}
                  className="w-full h-9 bg-[#05060A] border border-[rgba(255,255,255,0.12)] rounded-lg px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#4FC3F7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">OIB Klijenta</label>
                  <input
                    type="text"
                    placeholder="12345678901"
                    value={newCustomerOib}
                    onChange={(e) => setNewCustomerOib(e.target.value)}
                    className="w-full h-8 bg-[#05060A] border border-[rgba(255,255,255,0.12)] rounded-lg px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#4FC3F7]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Kontakt Osoba / Mob</label>
                  <input
                    type="text"
                    placeholder="+385 91 ..."
                    value={newCustomerContact}
                    onChange={(e) => setNewCustomerContact(e.target.value)}
                    className="w-full h-8 bg-[#05060A] border border-[rgba(255,255,255,0.12)] rounded-lg px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#4FC3F7]"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-[rgba(255,255,255,0.1)] flex justify-end gap-2 bg-[#05060A]">
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="h-8 px-4 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Odustani
              </button>
              <button
                onClick={handleSaveNewCustomer}
                disabled={!newCustomerName.trim()}
                className="h-8 px-4 rounded-lg text-xs font-semibold bg-[#3e92cc] hover:bg-[#3e92cc]/90 text-white disabled:opacity-50 transition-all shadow-sm"
              >
                Kreiraj Profil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Global Confirm Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
          />
          <div className="bg-[#0A0B10] border border-[rgba(255,255,255,0.15)] rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1.5">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
                className="flex-1 h-8 rounded-lg text-xs font-medium text-slate-300 border border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.05)]"
              >
                Odustani
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, show: false, onConfirm: null });
                }}
                className="flex-1 h-8 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-sm"
              >
                Potvrdi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Processing Backup Spinner Overlay */}
      {isProcessingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <div className="bg-[#0A0B10] border border-[rgba(255,255,255,0.15)] rounded-2xl p-8 flex flex-col items-center justify-center relative z-10 shadow-2xl min-w-[280px]">
            <Loader2 className="w-10 h-10 text-[#4FC3F7] animate-spin mb-4" />
            <h3 className="font-semibold text-white text-sm text-center">{backupProcessingText}</h3>
            <p className="text-xs text-slate-500 mt-1">Molimo pričekajte...</p>
          </div>
        </div>
      )}

      {/* 5. Animated Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto bg-[#0A0B10] rounded-xl shadow-2xl border border-[rgba(255,255,255,0.15)] p-3.5 flex items-start gap-3 transform transition-all ${
              t.type === "success"
                ? "border-l-4 border-l-emerald-500"
                : t.type === "error"
                ? "border-l-4 border-l-rose-500"
                : "border-l-4 border-l-[#4FC3F7]"
            }`}
          >
            {t.type === "success" && <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="w-4 h-4 text-[#4FC3F7] shrink-0 mt-0.5" />}
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white">{t.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{t.message}</p>
            </div>
            <button onClick={() => removeToast(t.id)} className="text-slate-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
