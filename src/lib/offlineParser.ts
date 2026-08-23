/**
 * Deterministic NLP + Regex + Fuzzy Resolution Pipeline for DTF Prepress Work Orders
 * Ported for real-time offline execution in the browser and Node.js server.
 */
import { Order, OrderItem, PrintPosition } from "../types";

export interface PrepressDictionary {
  item_categories: Record<string, { canonical: string; category: "Tekstil" | "Promo"; aliases: string[] }>;
  color_palette: Record<string, { canonical: string; is_dark: boolean; aliases: string[] }>;
  standard_positions: Record<string, { name: string; width_cm: number; height_cm?: number; aliases: string[] }>;
  size_map: Record<string, string>;
  header_aliases: Record<string, string[]>;
}

export const PREPRESS_DICTIONARY: PrepressDictionary = {
  item_categories: {
    "majica_kratki": {
      canonical: "Pamučna Majica 180g (Kratki Rukav)",
      category: "Tekstil",
      aliases: ["majica", "t-shirt", "tshirt", "tee", "kratka majica", "b&c", "exact 190", "gildan heavy", "sol's imperial", "majica kratki rukav", "pamučna majica"]
    },
    "majica_dugi": {
      canonical: "Majica Dugi Rukav",
      category: "Tekstil",
      aliases: ["dugi rukav", "long sleeve", "majica dugih rukava", "ls tee"]
    },
    "hudica": {
      canonical: "Hoodie s Kapuljačom (Gildan / B&C)",
      category: "Tekstil",
      aliases: ["hudica", "hoodie", "kapuljaca", "majica s kapuljacom", "gildan hudica", "duksa", "dukserica"]
    },
    "sweatshirt": {
      canonical: "Sweatshirt Bez Kapuljače",
      category: "Tekstil",
      aliases: ["sweatshirt", "sweater", "bez kapuljace", "crewneck", "pulover"]
    },
    "polo_majica": {
      canonical: "Polo Majica s Kragnom",
      category: "Tekstil",
      aliases: ["polo", "polo majica", "kragna", "ovratnik", "pike"]
    },
    "dres": {
      canonical: "Sportski Dres / Poliester",
      category: "Tekstil",
      aliases: ["dres", "sportski dres", "poliester dres", "nogometni dres", "trcanje"]
    },
    "kapa_silt": {
      canonical: "Šilt Kapa (5/6 panela)",
      category: "Tekstil",
      aliases: ["kapa", "silt kapa", "šilt kapa", "cap", "snapback", "trucker", "baseball kapa", "bejzbol kapa"]
    },
    "vrecica_platnena": {
      canonical: "Platnena Vrećica (Eko Pamuk)",
      category: "Promo",
      aliases: ["vrecica", "vrećica", "platnena vrecica", "platnena vrećica", "tote bag", "eko vrećica", "eko torba", "shopping bag"]
    },
    "rucnik": {
      canonical: "Frotir Ručnik 500g",
      category: "Promo",
      aliases: ["rucnik", "ručnik", "towel", "frotir", "plaza rucnik", "kupaonski rucnik"]
    },
    "sportska_torba": {
      canonical: "Sportska Torba / Gym Bag",
      category: "Promo",
      aliases: ["sportska torba", "torba", "gym bag", "ruksak", "drawstring", "vreca za papuce", "putna torba"]
    },
    "kisobran": {
      canonical: "Automatski Kišobran Promo",
      category: "Promo",
      aliases: ["kisobran", "kišobran", "umbrella", "veliki kisobran", "sklopivi kisobran"]
    },
    "salica": {
      canonical: "Keramička Šalica Promo",
      category: "Promo",
      aliases: ["salica", "šalica", "mug", "keramicka salica", "salica za kavu"]
    },
    "pregas": {
      canonical: "Kuhinjska Pregača s Džepom",
      category: "Tekstil",
      aliases: ["pregaca", "pregača", "apron", "kuharska pregaca", "konobarska pregaca"]
    }
  },
  color_palette: {
    "crna": {
      canonical: "Crna",
      is_dark: true,
      aliases: ["crna", "black", "noir", "nero", "crno", "antracit", "dark grey", "tamno siva", "black 00"]
    },
    "bijela": {
      canonical: "Bijela",
      is_dark: false,
      aliases: ["bijela", "white", "blanc", "bianco", "bijelo", "snjezno bijela", "optic white"]
    },
    "tamnoplava": {
      canonical: "Tamnoplava (Navy)",
      is_dark: true,
      aliases: ["navy", "tamno plava", "tamnoplava", "marine", "french navy", "tamno-plava", "midnight blue"]
    },
    "kraljevskoplava": {
      canonical: "Kraljevsko Plava (Royal Blue)",
      is_dark: true,
      aliases: ["royal blue", "kraljevski plava", "royal", "plava", "blue", "svijetlo plava", "azurna"]
    },
    "crvena": {
      canonical: "Crvena",
      is_dark: true,
      aliases: ["crvena", "red", "rouge", "rosso", "crveno", "bordo", "burgundy", "tamno crvena"]
    },
    "siva_melange": {
      canonical: "Siva Melange (Heather Grey)",
      is_dark: false,
      aliases: ["siva", "grey", "gray", "melange", "heather grey", "ash", "svijetlo siva", "sivo"]
    },
    "tamnozelena": {
      canonical: "Tamno Zelena (Bottle Green)",
      is_dark: true,
      aliases: ["zelena", "green", "bottle green", "tamno zelena", "forest green", "maslinasta", "khaki", "vojno zelena"]
    },
    "zuta": {
      canonical: "Žuta (Yellow)",
      is_dark: false,
      aliases: ["zuta", "žuta", "yellow", "gold", "zlatno zuta"]
    },
    "narancasta": {
      canonical: "Narančasta (Orange)",
      is_dark: false,
      aliases: ["narancasta", "narančasta", "orange", "oranz"]
    }
  },
  standard_positions: {
    "srce_9cm": {
      name: "Prsa / Lijevo Srce (9cm)",
      width_cm: 9.0,
      height_cm: 7.2,
      aliases: ["srce", "lijevo srce", "prsa 9cm", "prsa", "mali logo", "logo srce", "lijevo na prsa", "srce 9cm", "džep"]
    },
    "musko_ledja_26cm": {
      name: "Muško Leđa (26cm)",
      width_cm: 26.0,
      height_cm: 22.0,
      aliases: ["musko ledja", "muško leđa", "ledja 26cm", "leđa 26cm", "ledja", "leđa", "veliki logo leđa", "leđa a3", "muska ledja", "ledja musko"]
    },
    "zensko_ledja_24cm": {
      name: "Žensko Leđa (24cm)",
      width_cm: 24.0,
      height_cm: 20.0,
      aliases: ["zensko ledja", "žensko leđa", "ledja 24cm", "leđa 24cm", "zenska ledja", "ženska leđa"]
    },
    "djecja_ledja_12cm": {
      name: "Dječja Leđa (12cm)",
      width_cm: 12.0,
      height_cm: 10.0,
      aliases: ["djecja ledja", "dječja leđa", "ledja 12cm", "djeca", "dječje"]
    },
    "rukav_6cm": {
      name: "Rukav (6cm)",
      width_cm: 6.0,
      height_cm: 4.8,
      aliases: ["rukav", "lijevi rukav", "desni rukav", "rukav 6cm", "rukav mali logo"]
    },
    "kapa_silt_8x4_5": {
      name: "Šilt Kapa (8×4.5cm)",
      width_cm: 8.0,
      height_cm: 4.5,
      aliases: ["kapa", "silt kapa", "šilt kapa", "kapa logo", "prednja strana kape", "8x4.5"]
    },
    "vrecica_20cm": {
      name: "Platnena Vrećica Centar (20cm)",
      width_cm: 20.0,
      height_cm: 20.0,
      aliases: ["vrecica", "vrećica centar", "vrecica 20cm", "torba 20cm"]
    },
    "rucnik_20x5cm": {
      name: "Ručnik Bordura (20×5cm)",
      width_cm: 20.0,
      height_cm: 5.0,
      aliases: ["rucnik bordura", "bordura rucnika", "20x5", "tisak na rucnik"]
    },
    "torba_20x8cm": {
      name: "Sportska Torba (20×8cm)",
      width_cm: 20.0,
      height_cm: 8.0,
      aliases: ["sportska torba", "torba gore", "20x8", "gym bag logo"]
    }
  },
  size_map: {
    "XS": "XS",
    "S": "S",
    "M": "M",
    "L": "L",
    "XL": "XL",
    "2XL": "2XL",
    "XXL": "2XL",
    "3XL": "3XL",
    "XXXL": "3XL",
    "4XL": "4XL",
    "5XL": "5XL",
    "UNI": "UNI",
    "UNISEX": "UNI",
    "4 GOD": "4 god (104)",
    "6 GOD": "6 god (116)",
    "8 GOD": "8 god (128)",
    "10 GOD": "10 god (140)",
    "12 GOD": "12 god (152)",
    "14 GOD": "14 god (164)"
  },
  header_aliases: {
    "order_id": ["invoicenumber", "brojracuna", "racun", "nalog", "orderid", "id", "broj", "racunbroj", "brojnaloga", "radninalog", "faktura", "brojfakture"],
    "client": [
      "name", "klijent", "kupac", "nazivklijenta", "nazivkupca", "tvrtka", "client", "customer",
      "partner", "nazivpartnera", "narucitelj", "naručitelj", "primatelj", "platitelj", "company",
      "buyer", "customername", "clientname", "companyname", "naziv", "klijentnaziv", "kupactvrtka",
      "nazivtvrtke", "imeprezime", "korisnik", "poslovnipartner", "narucioc", "narucilac"
    ],
    "oib": ["oib", "poreznibroj", "vat", "vatid", "idbroj", "taxid"],
    "item": ["item", "artikl", "proizvod", "nazivartikla", "opis", "description", "stavka", "model"],
    "qty": ["qty", "kolicina", "količina", "kol", "kom", "pieces", "amount", "brojkomada"],
    "size": ["size", "velicina", "veličina", "vel", "dimenzija"],
    "color": ["color", "boja", "bojatekstila", "colour", "nijansa"],
    "price": ["price", "cijena", "iznos", "ukupaniznos", "total", "amount_eur", "jedinicnacijena"],
    "position": ["position", "pozicijatiska", "pozicija", "placement", "tisak", "tisakpozicija"],
    "visual": ["visual", "vizual", "zahtijevavizual", "probavizuala", "odobrenje", "vizualpotreban"],
    "missing_art": ["missing_art", "falislikapriprema", "nedostajepriprema", "priprema", "grafika", "nedostajegrafika"],
    "names": ["imena", "personalizacija", "personalizacijaimena", "tekst", "names", "text", "tekstzatisak"]
  }
};

/**
 * Normalizes, sanitizes, and cleans client / company names accurately using
 * multi-tier regex patterns, entity lookups, and legal form normalization.
 */
export function cleanClientName(raw: string, fallbackRowText: string = ""): string {
  let name = (raw || "").trim();

  // 1. Strip surrounding quotes, brackets, markdown and semicolons
  name = name.replace(/^["'“”„«\[\(\{;:\-]+|["'“”»\]\)\};:\-]+$/g, "").trim();

  // 2. Strip explicit label prefixes (e.g., "Kupac:", "Klijent:", "Naručitelj:", "Tvrtka:", "Customer:", "Client:", "Za:")
  name = name.replace(/^(?:kupac|klijent|tvrtka|naručitelj|narucitelj|customer|client|partner|naziv|ime|poslovni\s+partner|za|primatelj|faktura\s+za)\s*[:\-]\s*/i, "").trim();

  // 3. Remove embedded email addresses
  name = name.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "").trim();

  // 4. Remove embedded OIB / VAT identifiers
  name = name.replace(/\(?(?:oib|vat|id|porezni\s*broj)?\s*[:\-]?\s*\b\d{11}\b\)?/gi, "").trim();

  // 5. Remove embedded phone numbers (e.g., "+385 91 555 1234", "095/512-0677", "098 123 4567")
  name = name.replace(/\(?\+?\d{2,4}[\s\/\-]?\d{2,3}[\s\/\-]?\d{3,4}[\s\/\-]?\d{0,4}\)?/g, "").trim();

  // 6. Remove production and order notes if mixed into name
  name = name.replace(/\b(?:uzeti\s+sa\s+stanja|kupac\s+tako\s+želi|kupac\s+tako\s+zeli|hitno|za\s+tisak|tisak\s+na|u\s+privitku|poslano\s+na\s+mail|prema\s+dogovoru)\b/gi, "").trim();

  // 7. Remove trailing and leading punctuation noise
  name = name.replace(/[\s,\-;:/|]+$/, "").replace(/^[\s,\-;:/|]+/, "").trim();

  // 8. Normalize Croatian legal abbreviations: d.o.o., j.d.o.o., d.d., k.d., s.p., vl., obrt
  name = name
    .replace(/\b([dD])\.\s*([oO])\.\s*([oO])\.?\b/g, "$1.$2.$3.")
    .replace(/\b([jJ])\.\s*([dD])\.\s*([oO])\.\s*([oO])\.?\b/g, "$1.$2.$3.")
    .replace(/\b([dD])\.\s*([dD])\.?\b/g, "$1.$2.")
    .replace(/\b([kK])\.\s*([dD])\.?\b/g, "$1.$2.")
    .replace(/\b([vV][lL])\.\s*/g, "vl. ")
    .replace(/\b(d\s*o\s*o)\b/gi, "d.o.o.")
    .replace(/\b(j\s*d\s*o\s*o)\b/gi, "j.d.o.o.");

  // 9. If name is empty, generic, or an invalid token, attempt contextual regex extraction from fallbackRowText
  const isGeneric = !name || /^(?:klijent|kupac|customer|partner|client|unknown|n\/a|-|\?|\d+|klijent\s*\d+|none|null|undefined)$/i.test(name);
  if (isGeneric && fallbackRowText) {
    // A. Target pattern "za [Institution / Company / Client]" (e.g. "za reh. Sveti Rafael", "za dječji vrtić Ruža Petrović", "za dd laduč", "za DVD Pregrada", "za NK Osijek")
    const targetMatch = fallbackRowText.match(/\bza\s+((?:reh\.?\s+|rehabilitacijski\s+centar\s+|dječji\s+vrtić\s+|djecji\s+vrtic\s+|dječji\s+dom\s+|djecji\s+dom\s+|dd\s+|dvd\s+|udrug[aeu]\s+|opg\s+|nk\s+|hnk\s+|kk\s+|mnk\s+|cb\s+|caffe\s+bar\s+|obrt\s+|restoran\s+|konob[aeu]\s+|klesarstv[ou]\s+)[\wčćžšđČĆŽŠĐ\.\-]+(?:\s+[\wčćžšđČĆŽŠĐ\.\-]+){0,4})/i);
    if (targetMatch && targetMatch[1]) {
      return cleanClientName(targetMatch[1]);
    }

    // B. Direct entity recognition (Caffe Bar, Restoran, OPG, DVD, NK, Udruga, Dječji dom, etc.)
    const entityMatch = fallbackRowText.match(/\b((?:Caffe\s+Bar|CB|Restoran|Bistro|Pivnica|OPG|Obrt|DVD|NK|KK|MNK|HNK|Udruga|Klub|Moto\s+Klub|Auto\s+Klub|Hotel|Studio|Servis|Poliklinika|Konoba|Klesarstvo|Pekara|Gostionica|Dječji\s+vrtić|Dječji\s+dom|Reh\.\s*Sveti\s+Rafael)\s+[\wčćžšđČĆŽŠĐ\.\-]+(?:\s+[\wčćžšđČĆŽŠĐ\.\-]+){0,3})/i);
    if (entityMatch && entityMatch[1]) {
      return cleanClientName(entityMatch[1]);
    }

    // C. Company name with legal suffix (e.g. "Adriatic Craft Beer d.o.o.", "Auto Servis Vuković j.d.o.o.", "Konoba Gusar vl. I. Jurić")
    const legalMatch = fallbackRowText.match(/([\wčćžšđČĆŽŠĐ\.\-&]+\s+(?:[\wčćžšđČĆŽŠĐ\.\-&]+\s+){0,3}(?:d\.o\.o\.|j\.d\.o\.o\.|d\.d\.|k\.d\.|obrt|vl\.\s*[\wčćžšđČĆŽŠĐ]+))/i);
    if (legalMatch && legalMatch[1]) {
      return cleanClientName(legalMatch[1]);
    }

    // D. Name pattern from unstructured contact line (e.g. "0955120677 Maja Palčić pamučne vrećice...")
    const contactNameMatch = fallbackRowText.match(/(?:^|\b)(?:0\d{8,9}|\+385\d{8,9})\s+([A-ZČĆŽŠĐ][a-zčćžšđ]+\s+[A-ZČĆŽŠĐ][a-zčćžšđ]+)/);
    if (contactNameMatch && contactNameMatch[1]) {
      return cleanClientName(contactNameMatch[1]);
    }

    // E. Extract "Ljubomir Vranješ" or general Croatian capitalized Two-Word Name
    const twoWordMatch = fallbackRowText.match(/\b([A-ZČĆŽŠĐ][a-zčćžšđ]{2,}\s+[A-ZČĆŽŠĐ][a-zčćžšđ]{2,})\b/);
    if (twoWordMatch && twoWordMatch[1] && !/^(Pamučna Majica|Lijevo Srce|Muško Leđa|Žensko Leđa|Dječja Leđa|Desni Rukav|Lijevi Rukav|Radni Nalog)$/i.test(twoWordMatch[1])) {
      return cleanClientName(twoWordMatch[1]);
    }
  }

  // 10. Proper Title-Casing for ALL-CAPS or all-lowercase names, preserving acronyms
  if (name && (name === name.toUpperCase() || name === name.toLowerCase()) && name.length > 3) {
    name = name
      .toLowerCase()
      .split(" ")
      .map(word => {
        if (/^(?:d\.o\.o\.|j\.d\.o\.o\.|d\.d\.|k\.d\.|opg|dvd|nk|kk|mnk|hnk|cb|oib|vat|doo|jdoo|b&c)$/i.test(word)) {
          return word.toUpperCase();
        }
        if (word.startsWith("vl.")) return "vl.";
        if (word.startsWith("d.o.o") || word.startsWith("j.d.o.o")) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  // 11. Known institution acronym expansion (e.g. "dd laduč" -> "Dječji Dom Laduč", "reh. sveti rafael" -> "Reh. Sveti Rafael")
  name = name
    .replace(/\bdd\s+laduč\b/gi, "Dječji Dom Laduč")
    .replace(/\breh\.?\s*sveti\s*rafael\b/gi, "Reh. Sveti Rafael")
    .replace(/\bdječji\s+vrtić\s+ruža\s+petrović\b/gi, "Dječji Vrtić Ruža Petrović");

  return name || "Nepoznati Klijent";
}

/**
 * Strips Croatian accents for fuzzy keyword matching
 */
export function stripAccents(str: string): string {
  return str
    .replace(/đ/g, "dj")
    .replace(/Đ/g, "Dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Cleans and detects delimiters in raw CSV/TXT text
 */
export function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/).slice(0, 5).join("\n");
  const commaCount = (firstLines.match(/,/g) || []).length;
  const semicolonCount = (firstLines.match(/;/g) || []).length;
  const tabCount = (firstLines.match(/\t/g) || []).length;
  const pipeCount = (firstLines.match(/\|/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount >= tabCount) return ";";
  if (tabCount > commaCount && tabCount > semicolonCount) return "\t";
  if (pipeCount > commaCount && pipeCount > semicolonCount) return "|";
  return ",";
}

/**
 * Splits raw CSV text respecting quotes and ragged lines
 */
export function parseDelimitedRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let insideQuotes = false;
    let currentCell = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"' || char === "'") {
        if (insideQuotes && line[i + 1] === char) {
          currentCell += char;
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        row.push(currentCell.trim().replace(/^["']|["']$/g, ""));
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim().replace(/^["']|["']$/g, ""));
    rows.push(row);
  }
  return rows;
}

/**
 * Dimension and Quantity Extractor with Regex
 */
export function extractDimensions(text: string): { width_cm?: number; height_cm?: number } {
  // Pattern 1: 26x30cm or 8.5 x 10 cm or 200 x 300 mm
  const dimMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:x|×|\*)\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)?/i);
  if (dimMatch) {
    let w = parseFloat(dimMatch[1].replace(",", "."));
    let h = parseFloat(dimMatch[2].replace(",", "."));
    const unit = (dimMatch[3] || "cm").toLowerCase();
    if (unit === "mm") {
      w /= 10;
      h /= 10;
    }
    return { width_cm: w, height_cm: h };
  }

  // Pattern 2: 9 cm / 26cm
  const singleMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(cm|mm)\s*(?:širine|visine|sirina|visina|max)?/i);
  if (singleMatch) {
    let w = parseFloat(singleMatch[1].replace(",", "."));
    const unit = (singleMatch[2] || "cm").toLowerCase();
    if (unit === "mm") w /= 10;
    return { width_cm: w, height_cm: Number((w * 0.8).toFixed(1)) };
  }

  return {};
}

export function extractQuantity(text: string, defaultQty: number = 1): number {
  const qtyMatch = text.match(/(?:^|\b)(?:(\d+)\s*(?:x|kom|komada|pcs)\b|(?:kol|kolicina|količina|qty)\s*[:.\-]?\s*(\d+))/i);
  if (qtyMatch) {
    const val = parseInt(qtyMatch[1] || qtyMatch[2], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return defaultQty;
}

export function extractPersonalizationNames(text: string): string[] {
  const names: string[] = [];
  const listMatch = text.match(/(?:imena|tisak imena|personalizacija)\s*[:\-]\s*([^\n\r;]+)/i);
  if (listMatch && listMatch[1]) {
    const split = listMatch[1].split(/[,;/]+/);
    for (const s of split) {
      const trimmed = s.trim();
      if (trimmed.length > 1) names.push(trimmed);
    }
  }

  // Numbered list pattern: "1. Marko 2. Luka 3. Ana"
  const numberedMatches = text.matchAll(/(?:\d+[\.\)]\s*([A-ZČĆŽŠĐa-zčćžšđ]+))/g);
  for (const m of numberedMatches) {
    if (m[1] && m[1].length > 1) names.push(m[1].trim());
  }

  return Array.from(new Set(names));
}

/**
 * Prepress Resolver Engine
 */
export function resolveItemAndCategory(text: string): { canonical: string; category: "Tekstil" | "Promo" } {
  const normText = stripAccents(text.toLowerCase());

  for (const [, details] of Object.entries(PREPRESS_DICTIONARY.item_categories)) {
    for (const alias of details.aliases) {
      const normAlias = stripAccents(alias.toLowerCase());
      if (normText.includes(normAlias)) {
        return { canonical: details.canonical, category: details.category };
      }
    }
  }

  // Default fallback check
  if (/torba|vrećica|vrecica|ručnik|rucnik|kapa|šalica|salica|notes|privjesak|kišobran|kisobran/i.test(text)) {
    return { canonical: text.trim() || "Promo Artikl", category: "Promo" };
  }
  return { canonical: text.trim() || "Pamučna Majica 180g", category: "Tekstil" };
}

export function resolveColorAndUnderbase(text: string): { canonical: string; is_dark: boolean } {
  const normText = stripAccents(text.toLowerCase());

  for (const [, details] of Object.entries(PREPRESS_DICTIONARY.color_palette)) {
    for (const alias of details.aliases) {
      const normAlias = stripAccents(alias.toLowerCase());
      if (normText.includes(normAlias)) {
        return { canonical: details.canonical, is_dark: details.is_dark };
      }
    }
  }
  // Default fallback: dark textile
  return { canonical: text.trim() || "Crna", is_dark: true };
}

export function resolveSize(text: string): string {
  const upper = text.toUpperCase();

  for (const [rawSize, standardSize] of Object.entries(PREPRESS_DICTIONARY.size_map)) {
    const regex = new RegExp(`\\b${rawSize}\\b`, "i");
    if (regex.test(upper)) {
      return standardSize;
    }
  }

  const m = text.match(/\b(?:vel|velicina|size)?\s*[:.\-]?\s*(XS|S|M|L|XL|2XL|XXL|3XL|XXXL|4XL|5XL|UNI)\b/i);
  if (m) {
    return PREPRESS_DICTIONARY.size_map[m[1].toUpperCase()] || m[1].toUpperCase();
  }

  return "L";
}

export function resolvePlacements(combinedText: string): PrintPosition[] {
  const normText = stripAccents(combinedText.toLowerCase());
  const placements: PrintPosition[] = [];
  const { width_cm: extractedW, height_cm: extractedH } = extractDimensions(combinedText);

  for (const [, posInfo] of Object.entries(PREPRESS_DICTIONARY.standard_positions)) {
    for (const alias of posInfo.aliases) {
      const normAlias = stripAccents(alias.toLowerCase());
      if (normText.includes(normAlias)) {
        placements.push({
          naziv_pozicije: posInfo.name,
          sirina_cm: extractedW || posInfo.width_cm,
          visina_cm: extractedH || posInfo.height_cm,
        });
        break;
      }
    }
  }

  if (placements.length === 0) {
    if (extractedW) {
      placements.push({
        naziv_pozicije: `Prilagođena Pozicija (${extractedW}cm)`,
        sirina_cm: extractedW,
        visina_cm: extractedH || Number((extractedW * 0.8).toFixed(1)),
      });
    } else {
      placements.push({
        naziv_pozicije: "Prsa / Lijevo Srce (9cm)",
        sirina_cm: 9.0,
        visina_cm: 7.2,
      });
    }
  }

  return placements;
}

/**
 * End-to-End Deterministic Work Order Parser
 */
export function parseWorkOrdersOffline(fileText: string): Order[] {
  const delimiter = detectDelimiter(fileText);
  const rows = parseDelimitedRows(fileText, delimiter);

  if (rows.length < 2) return [];

  const rawHeaders = rows[0].map(h => stripAccents(h.toLowerCase().replace(/[\s_\-]/g, "")));
  
  // Map headers
  const colMap: Record<string, number> = {};
  for (let idx = 0; idx < rawHeaders.length; idx++) {
    const rawH = rawHeaders[idx];
    for (const [stdKey, aliases] of Object.entries(PREPRESS_DICTIONARY.header_aliases)) {
      if (aliases.includes(rawH) || rawH.includes(stdKey)) {
        colMap[stdKey] = idx;
        break;
      }
    }
  }

  const ordersMap: Record<string, Order> = {};

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    if (row.length === 0 || row.every(c => !c)) continue;

    const getVal = (key: string): string => {
      const idx = colMap[key];
      return idx !== undefined && row[idx] !== undefined ? row[idx] : "";
    };

    const combinedRowText = row.join(" ");

    const rawOrderId = getVal("order_id") || `2026-N${100 + rowIdx}`;
    const rawClient = cleanClientName(getVal("client"), combinedRowText);
    const rawOib = getVal("oib") || (combinedRowText.match(/\b\d{11}\b/)?.[0] || "");
    const rawPriceStr = getVal("price") || (combinedRowText.match(/(\d+(?:[.,]\d+)?)\s*(?:€|eur|kn)?/i)?.[1] || "0");
    const rawPrice = parseFloat(rawPriceStr.replace(",", ".")) || 45.0;

    const rawItemText = getVal("item") || combinedRowText;
    const rawColorText = getVal("color") || combinedRowText;
    const rawSizeText = getVal("size") || combinedRowText;
    const rawQtyText = getVal("qty") || combinedRowText;

    const { canonical: itemTitle, category } = resolveItemAndCategory(rawItemText);
    const { canonical: colorTitle } = resolveColorAndUnderbase(rawColorText);
    const size = resolveSize(rawSizeText);
    const qty = extractQuantity(rawQtyText, 1);
    const placements = resolvePlacements(combinedRowText);
    const personalizationNames = extractPersonalizationNames(combinedRowText);

    const requiresVisual = /vizual|odobrenje|proba|proof/i.test(combinedRowText) || /da|true|1/i.test(getVal("visual"));
    const missingArt = /fali\s*(?:slika|logo|priprema)|nedostaje|vektor/i.test(combinedRowText) || /da|true|1/i.test(getVal("missing_art"));

    const item: OrderItem = {
      kategorija: category,
      naziv_artikla: itemTitle,
      kolicina: qty,
      velicina: size,
      boja: colorTitle,
      pozicije_tiska: placements,
      tekst_za_tisak: personalizationNames.length > 0 ? personalizationNames.join(", ") : undefined,
      personalizacija_imena: personalizationNames,
    };

    if (!ordersMap[rawOrderId]) {
      ordersMap[rawOrderId] = {
        broj_racuna: rawOrderId,
        naziv_klijenta: rawClient,
        oib: rawOib || undefined,
        kontakt_ime: "Voditelj Narudžbe",
        kontakt_broj: "+385 91 555 1234",
        ukupan_iznos: rawPrice * (qty > 1 ? qty : 1),
        datum_racuna: new Date().toISOString().split("T")[0],
        datum_uplate: new Date().toISOString().split("T")[0],
        zahtijeva_vizual: requiresVisual,
        nedostaje_priprema: missingArt,
        artikli: [item],
      };
    } else {
      ordersMap[rawOrderId].artikli.push(item);
      ordersMap[rawOrderId].ukupan_iznos += rawPrice * qty;
      if (requiresVisual) ordersMap[rawOrderId].zahtijeva_vizual = true;
      if (missingArt) ordersMap[rawOrderId].nedostaje_priprema = true;
    }
  }

  return Object.values(ordersMap);
}
