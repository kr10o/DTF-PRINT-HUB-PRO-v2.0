export interface PrintPosition {
  naziv_pozicije: string;
  sirina_cm: number;
  visina_cm?: number;
}

export interface OrderItem {
  kategorija: "Tekstil" | "Promo";
  naziv_artikla: string;
  kolicina: number;
  velicina?: string;
  boja?: string;
  pozicije_tiska: PrintPosition[];
  tekst_za_tisak?: string;
  personalizacija_imena: string[];
}

export interface Order {
  broj_racuna: string;
  naziv_klijenta: string;
  oib?: string;
  kontakt_ime?: string;
  kontakt_broj?: string;
  ukupan_iznos: number;
  datum_racuna: string;
  datum_uplate?: string;
  zahtijeva_vizual: boolean;
  nedostaje_priprema: boolean;
  artikli: OrderItem[];
}

export interface OrderExtractionResult {
  narudzbe: Order[];
}

export interface CustomerProfile {
  id: string;
  name: string;
  createdAt: number;
  notes?: string;
  oib?: string;
  contactName?: string;
  contactPhone?: string;
  folderPath?: string;
}

export interface ClientAsset {
  id: string;
  clientName: string;
  customerId?: string;
  invoiceNumber?: string;
  filename: string;
  fileType: "ai" | "eps" | "pdf" | "svg" | "png" | "tiff" | "psd" | "jpg";
  category: "logo_dark_shirts" | "logo_light_shirts" | "general" | "custom_visual";
  cmykSpecification: "0,0,1,0 (White Underbase)" | "0,0,0,100 (Pure Black)" | "CMYK Full Color";
  dimensionsMm?: string;
  uploadedAt: string;
  sizeBytes: number;
  previewUrl?: string;
  bgClass?: "bg-black" | "bg-white" | "bg-[#11131a]" | "bg-checkered";
  binaryData?: ArrayBuffer | string;
  createdAt?: string;
}

export interface GangSheetItem {
  id: string;
  invoiceNumber: string;
  clientName: string;
  itemName: string;
  color: string;
  positionName: string;
  widthCm: number;
  heightCm: number;
  xCm: number;
  yCm: number;
  pageIndex: number;
  shirtColorIsDark: boolean;
  cmykMode: "white_underbase" | "pure_black" | "full_color";
  textFallback?: string;
  logoType?: string;
}

export interface GangSheetPage {
  pageIndex: number;
  widthCm: number;
  maxHeightCm: number;
  usedHeightCm: number;
  itemsCount: number;
  items: GangSheetItem[];
}

export interface AggregatedWarehouseItem {
  naziv_artikla: string;
  boja: string;
  velicina: string;
  kategorija: "Tekstil" | "Promo";
  ukupno_komada: number;
  narudzbe_popis: string[];
}

export interface StockPredictionItem {
  id: string;
  naziv_artikla: string;
  boja: string;
  velicina: string;
  dnevna_potrosnja: number;
  trenutna_zaliha: number;
  preporucena_zaliha: number; // floor(potrosnja * 2.5) + 5
  deficit: number;
  status: "OK" | "UPOZORENJE" | "KRITIČNO";
}

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  author?: string;
  description: string;
  type: "python" | "illustrator" | "illustrator_jsx";
  code: string;
  isEnabled?: boolean;
  dbKeysCount?: number;
  dbStore?: Record<string, any>;
  lastRun?: string;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  icon?: "folder" | "flame" | "building" | "shopping-bag" | "gift" | "archive" | "sparkles" | "layers";
  color?: string;
  orders: Order[];
  date: string;
  description?: string;
  createdAt: string;
  isSystem?: boolean;
  tag?: string;
}
