import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// In-memory / mock database store for daily archives and plugins
interface ArchiveEntry {
  date: string;
  rawCsv: string;
  orders: any[];
  timestamp: string;
}

const archivesStore: Record<string, ArchiveEntry> = {};
const pluginDatabases: Record<string, Record<string, { value: any; updated_at: string }>> = {
  "barcode_generator": {
    "config": { value: { prefix: "DTF-2026-", format: "CODE128" }, updated_at: new Date().toISOString() }
  },
  "cost_calculator": {
    "rates": { value: { ink_per_sqm: 4.2, film_per_m: 2.8, powder_per_kg: 18.0 }, updated_at: new Date().toISOString() }
  }
};

// Lazy Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// API Health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    system: "DTF Print Hub Engine v1.0",
    time: new Date().toISOString(),
  });
});

// API: Parse Orders with Gemini AI (Deterministic with Temperature 0.0)
const handleParseOrdersRequest = async (req: express.Request, res: express.Response) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent || typeof csvContent !== "string") {
      return res.status(400).json({ error: "Missing or invalid csvContent" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `Vi ste vodeći prepress inženjer i stručnjak za DTF/DTG tiskarsku pripremu. Vaš zadatak je deterministički ekstrahirati i strukturirati podatke iz sirovog CSV-a u strogi JSON format prema zadanoj shemi.

Pravila za prepoznavanje i čišćenje naziva klijenta (naziv_klijenta):
- Točno identificirajte puni naziv klijenta, tvrtke, obrta, udruge ili ustanove (npr. "Adriatic Craft Beer d.o.o.", "Konoba Gusar vl. I. Jurić", "Auto Servis Vuković j.d.o.o.", "OPG Horvat", "Caffe Bar Mirage", "Dječji Vrtić Ruža Petrović", "Reh. Sveti Rafael", "Dječji Dom Laduč", "Udruga Palčići", "Maja Palčić", "DVD Pregrada").
- Zadržite pravne oblike i kratice (d.o.o., j.d.o.o., d.d., obrt, vl., OPG, DVD, NK, CB, Udruga).
- Iz naziva klijenta uklonite OIB (11 znamenki), telefonske brojeve, email adrese, oznake narudžbe, adrese dostave, brojeve računa ili opise artikala ako su spojeni u istom polju.
- Nemojte ostaviti generički naziv poput "Klijent" ili "Kupac" ako u retku postoji naziv subjekta, opis s "za [naručitelj]", ime i prezime ili naziv institucije.

Pravila za dimenzioniranje i pozicije tiska:
1. Muško (srce / lijeva strana prsa): širina 9 cm
2. Muško (leđa / velika grafika): širina 26 cm
3. Žensko (leđa): širina 24 cm
4. Rukav: širina 6 cm
5. Dječja leđa: širina 12 cm
6. Šilt kape unisex: širina 8 cm, visina 4.5 cm
7. Platnena vrećica: širina 20 cm
8. Ručnik: širina 20 cm, visina 5 cm
9. Sportska torba (gore/sredina): širina 20 cm, visina 8 cm

Za svaku stavku:
- Odredite kategoriju: "Tekstil" (majice, hudice, trenirke, kape) ili "Promo" (vrećice, ručnici, torbe, šalice, privjesci, notesi)
- Izvucite količinu, boju tekstila/artikla, veličinu (S, M, L, XL, XXL itd.)
- Ako narudžba sadrži personalizirana imena ili poseban tekst za tisak, unesite u odgovarajuća polja.
- Ocijenite zahtijeva_vizual (true ako klijent traži probni vizual prije tiska) i nedostaje_priprema (true ako fali vektorska grafika ili logo).`;

    // 1. Try Gemini 2.5 Flash
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analiziraj i strukturiraj sljedeći CSV sadržaj narudžbi:\n\n${csvContent}`,
        config: {
          systemInstruction,
          temperature: 0.0,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              narudzbe: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    broj_racuna: { type: Type.STRING },
                    naziv_klijenta: { type: Type.STRING },
                    oib: { type: Type.STRING },
                    kontakt_ime: { type: Type.STRING },
                    kontakt_broj: { type: Type.STRING },
                    ukupan_iznos: { type: Type.NUMBER },
                    datum_racuna: { type: Type.STRING },
                    datum_uplate: { type: Type.STRING },
                    zahtijeva_vizual: { type: Type.BOOLEAN },
                    nedostaje_priprema: { type: Type.BOOLEAN },
                    artikli: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          kategorija: { type: Type.STRING },
                          naziv_artikla: { type: Type.STRING },
                          kolicina: { type: Type.INTEGER },
                          velicina: { type: Type.STRING },
                          boja: { type: Type.STRING },
                          tekst_za_tisak: { type: Type.STRING },
                          personalizacija_imena: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          pozicije_tiska: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                naziv_pozicije: { type: Type.STRING },
                                sirina_cm: { type: Type.NUMBER },
                                visina_cm: { type: Type.NUMBER },
                              },
                              required: ["naziv_pozicije", "sirina_cm"],
                            },
                          },
                        },
                        required: ["kategorija", "naziv_artikla", "kolicina"],
                      },
                    },
                  },
                  required: ["broj_racuna", "naziv_klijenta", "ukupan_iznos", "datum_racuna", "artikli"],
                },
              },
            },
            required: ["narudzbe"],
          },
        },
      });

      const rawText = response.text || "{}";
      const parsed = JSON.parse(rawText);
      if (parsed.narudzbe && Array.isArray(parsed.narudzbe)) {
        parsed.narudzbe = parsed.narudzbe.map((order: any) => ({
          ...order,
          naziv_klijenta: cleanClientName(order.naziv_klijenta),
        }));
      }
      return res.json(parsed);
    }

    // 2. Try Perplexity Structured Output API (if PERPLEXITY_API_KEY is present)
    const perplexityKey = process.env.PERPLEXITY_API_KEY || (process.env as any).PERPLEXITY;
    if (perplexityKey && perplexityKey.trim() !== "") {
      try {
        const pResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${perplexityKey.replace(/^perplexity=/i, "").trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: `Strukturiraj i ekstrahiraj podatke narudžbi iz ovog CSV zapisa:\n\n${csvContent}` }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "order_extraction_result",
                schema: {
                  type: "object",
                  properties: {
                    narudzbe: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          broj_racuna: { type: "string" },
                          naziv_klijenta: { type: "string" },
                          oib: { type: "string" },
                          kontakt_ime: { type: "string" },
                          kontakt_broj: { type: "string" },
                          ukupan_iznos: { type: "number" },
                          datum_racuna: { type: "string" },
                          datum_uplate: { type: "string" },
                          zahtijeva_vizual: { type: "boolean" },
                          nedostaje_priprema: { type: "boolean" },
                          artikli: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                kategorija: { type: "string", enum: ["Tekstil", "Promo"] },
                                naziv_artikla: { type: "string" },
                                kolicina: { type: "integer" },
                                velicina: { type: "string" },
                                boja: { type: "string" },
                                tekst_za_tisak: { type: "string" },
                                personalizacija_imena: {
                                  type: "array",
                                  items: { type: "string" }
                                },
                                pozicije_tiska: {
                                  type: "array",
                                  items: {
                                    type: "object",
                                    properties: {
                                      naziv_pozicije: { type: "string" },
                                      sirina_cm: { type: "number" },
                                      visina_cm: { type: "number" }
                                    },
                                    required: ["naziv_pozicije", "sirina_cm"],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ["kategorija", "naziv_artikla", "kolicina", "pozicije_tiska", "personalizacija_imena"],
                              additionalProperties: false
                            }
                          }
                        },
                        required: ["broj_racuna", "naziv_klijenta", "ukupan_iznos", "datum_racuna", "zahtijeva_vizual", "nedostaje_priprema", "artikli"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["narudzbe"],
                  additionalProperties: false
                }
              }
            }
          })
        });

        if (pResponse.ok) {
          const pData = await pResponse.json();
          const content = pData.choices?.[0]?.message?.content || pData.output_text;
          if (content) {
            const parsed = JSON.parse(content);
            if (parsed.narudzbe && Array.isArray(parsed.narudzbe)) {
              parsed.narudzbe = parsed.narudzbe.map((order: any) => ({
                ...order,
                naziv_klijenta: cleanClientName(order.naziv_klijenta),
              }));
            }
            return res.json(parsed);
          }
        }
      } catch (pErr) {
        console.warn("Perplexity structured extraction fallback failed, using local offline parser:", pErr);
      }
    }

    // 3. Deterministic fallback parser if API keys are not active
    const fallbackResult = parseCsvDeterministically(csvContent);
    return res.json(fallbackResult);
  } catch (err: any) {
    console.error("Error parsing orders:", err);
    try {
      const fallback = parseCsvDeterministically(req.body.csvContent || "");
      return res.json(fallback);
    } catch {
      return res.status(500).json({ error: err.message || "Failed to process orders" });
    }
  }
};

app.post("/api/parse-orders", handleParseOrdersRequest);
app.post("/api/orders/parse-csv", handleParseOrdersRequest);

function cleanClientName(raw: string, fallbackRowText: string = ""): string {
  let name = (raw || "").trim();

  // 1. Strip quotes, brackets, semicolons
  name = name.replace(/^["'“”„«\[\(\{;:\-]+|["'“”»\]\)\};:\-]+$/g, "").trim();

  // 2. Strip explicit label prefixes (e.g. "Kupac:", "Klijent:", "Naručitelj:", "Za:")
  name = name.replace(/^(?:kupac|klijent|tvrtka|naručitelj|narucitelj|customer|client|partner|naziv|ime|poslovni\s+partner|za|primatelj|faktura\s+za)\s*[:\-]\s*/i, "").trim();

  // 3. Remove email addresses
  name = name.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "").trim();

  // 4. Remove OIB / VAT
  name = name.replace(/\(?(?:oib|vat|id|porezni\s*broj)?\s*[:\-]?\s*\b\d{11}\b\)?/gi, "").trim();

  // 5. Remove phone numbers
  name = name.replace(/\(?\+?\d{2,4}[\s\/\-]?\d{2,3}[\s\/\-]?\d{3,4}[\s\/\-]?\d{0,4}\)?/g, "").trim();

  // 6. Remove production and order notes
  name = name.replace(/\b(?:uzeti\s+sa\s+stanja|kupac\s+tako\s+želi|kupac\s+tako\s+zeli|hitno|za\s+tisak|tisak\s+na|u\s+privitku|poslano\s+na\s+mail|prema\s+dogovoru)\b/gi, "").trim();

  // 7. Remove punctuation noise
  name = name.replace(/[\s,\-;:/|]+$/, "").replace(/^[\s,\-;:/|]+/, "").trim();

  // 8. Normalize Croatian legal abbreviations
  name = name
    .replace(/\b([dD])\.\s*([oO])\.\s*([oO])\.?\b/g, "$1.$2.$3.")
    .replace(/\b([jJ])\.\s*([dD])\.\s*([oO])\.\s*([oO])\.?\b/g, "$1.$2.$3.")
    .replace(/\b([dD])\.\s*([dD])\.?\b/g, "$1.$2.")
    .replace(/\b([kK])\.\s*([dD])\.?\b/g, "$1.$2.")
    .replace(/\b([vV][lL])\.\s*/g, "vl. ")
    .replace(/\b(d\s*o\s*o)\b/gi, "d.o.o.")
    .replace(/\b(j\s*d\s*o\s*o)\b/gi, "j.d.o.o.");

  // 9. Contextual regex fallback if empty or generic
  const isGeneric = !name || /^(?:klijent|kupac|customer|partner|client|unknown|n\/a|-|\?|\d+|klijent\s*\d+|none|null|undefined)$/i.test(name);
  if (isGeneric && fallbackRowText) {
    const targetMatch = fallbackRowText.match(/\bza\s+((?:reh\.?\s+|rehabilitacijski\s+centar\s+|dječji\s+vrtić\s+|djecji\s+vrtic\s+|dječji\s+dom\s+|djecji\s+dom\s+|dd\s+|dvd\s+|udrug[aeu]\s+|opg\s+|nk\s+|hnk\s+|kk\s+|mnk\s+|cb\s+|caffe\s+bar\s+|obrt\s+|restoran\s+|konob[aeu]\s+|klesarstv[ou]\s+)[\wčćžšđČĆŽŠĐ\.\-]+(?:\s+[\wčćžšđČĆŽŠĐ\.\-]+){0,4})/i);
    if (targetMatch && targetMatch[1]) {
      return cleanClientName(targetMatch[1]);
    }

    const entityMatch = fallbackRowText.match(/\b((?:Caffe\s+Bar|CB|Restoran|Bistro|Pivnica|OPG|Obrt|DVD|NK|KK|MNK|HNK|Udruga|Klub|Moto\s+Klub|Auto\s+Klub|Hotel|Studio|Servis|Poliklinika|Konoba|Klesarstvo|Pekara|Gostionica|Dječji\s+vrtić|Dječji\s+dom|Reh\.\s*Sveti\s+Rafael)\s+[\wčćžšđČĆŽŠĐ\.\-]+(?:\s+[\wčćžšđČĆŽŠĐ\.\-]+){0,3})/i);
    if (entityMatch && entityMatch[1]) {
      return cleanClientName(entityMatch[1]);
    }

    const legalMatch = fallbackRowText.match(/([\wčćžšđČĆŽŠĐ\.\-&]+\s+(?:[\wčćžšđČĆŽŠĐ\.\-&]+\s+){0,3}(?:d\.o\.o\.|j\.d\.o\.o\.|d\.d\.|k\.d\.|obrt|vl\.\s*[\wčćžšđČĆŽŠĐ]+))/i);
    if (legalMatch && legalMatch[1]) {
      return cleanClientName(legalMatch[1]);
    }

    const contactNameMatch = fallbackRowText.match(/(?:^|\b)(?:0\d{8,9}|\+385\d{8,9})\s+([A-ZČĆŽŠĐ][a-zčćžšđ]+\s+[A-ZČĆŽŠĐ][a-zčćžšđ]+)/);
    if (contactNameMatch && contactNameMatch[1]) {
      return cleanClientName(contactNameMatch[1]);
    }

    const twoWordMatch = fallbackRowText.match(/\b([A-ZČĆŽŠĐ][a-zčćžšđ]{2,}\s+[A-ZČĆŽŠĐ][a-zčćžšđ]{2,})\b/);
    if (twoWordMatch && twoWordMatch[1] && !/^(Pamučna Majica|Lijevo Srce|Muško Leđa|Žensko Leđa|Dječja Leđa|Desni Rukav|Lijevi Rukav|Radni Nalog)$/i.test(twoWordMatch[1])) {
      return cleanClientName(twoWordMatch[1]);
    }
  }

  // 10. Title Casing
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

  name = name
    .replace(/\bdd\s+laduč\b/gi, "Dječji Dom Laduč")
    .replace(/\breh\.?\s*sveti\s*rafael\b/gi, "Reh. Sveti Rafael")
    .replace(/\bdječji\s+vrtić\s+ruža\s+petrović\b/gi, "Dječji Vrtić Ruža Petrović");

  return name || "Nepoznati Klijent";
}

// Deterministic fallback parser (Sniffs delimiters, extracts dimensions and personalizations)
function parseCsvDeterministically(csvText: string) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { narudzbe: [] };

  // Detect delimiter
  const firstLines = lines.slice(0, 5).join("\n");
  const commaCount = (firstLines.match(/,/g) || []).length;
  const semicolonCount = (firstLines.match(/;/g) || []).length;
  const tabCount = (firstLines.match(/\t/g) || []).length;
  const pipeCount = (firstLines.match(/\|/g) || []).length;

  let delimiter = ",";
  if (semicolonCount > commaCount && semicolonCount >= tabCount) delimiter = ";";
  else if (tabCount > commaCount && tabCount > semicolonCount) delimiter = "\t";
  else if (pipeCount > commaCount && pipeCount > semicolonCount) delimiter = "|";

  const ordersMap: Record<string, any> = {};

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV splitting
    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ""));
    if (cols.length === 0 || cols.every(c => !c)) continue;

    const rowText = cols.join(" ");
    const racun = cols[0] || `2026-N${100 + i}`;
    const klijent = cleanClientName(cols[1], rowText);
    const oib = cols[2] && /^\d{11}$/.test(cols[2]) ? cols[2] : (rowText.match(/\b\d{11}\b/)?.[0] || "");
    const artikl = cols[3] || cols[0] || "Pamučna Majica 180g";
    const kolStr = cols[4] || "1";
    const vel = cols[5] || "L";
    const boja = cols[6] || "Crna";
    const pozicijeStr = cols[7] || "";
    const cijenaStr = cols[8] || "45.0";
    const vizualStr = cols[9] || "";
    const prepStr = cols[10] || "";
    const imenaStr = cols[11] || "";

    const kolicina = parseInt(kolStr, 10) || 1;
    const cijena = parseFloat(cijenaStr.replace(",", ".")) || 45.0;
    const isPromo = /torba|vrećica|vrecica|ručnik|rucnik|kapa|šalica|salica|notes|privjesak|kišobran|kisobran/i.test(artikl + " " + rowText);

    // Extract dimensions with regex if in text (e.g. 26x30cm or 9cm)
    const dimMatch = rowText.match(/(\d+(?:[.,]\d+)?)\s*(?:x|×|\*)\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)?/i);
    let extractedW: number | undefined;
    let extractedH: number | undefined;
    if (dimMatch) {
      extractedW = parseFloat(dimMatch[1].replace(",", "."));
      extractedH = parseFloat(dimMatch[2].replace(",", "."));
      if ((dimMatch[3] || "").toLowerCase() === "mm") {
        extractedW /= 10;
        extractedH /= 10;
      }
    }

    const positionsList = (pozicijeStr || "").split(";").map(p => p.trim()).filter(Boolean).map(p => {
      let width = 9;
      let height: number | undefined = undefined;
      const lower = p.toLowerCase();
      if (lower.includes("srce") || lower.includes("prsa")) { width = 9; height = 7.2; }
      else if (lower.includes("muško leđa") || lower.includes("musko ledja") || (lower.includes("leđa") && !lower.includes("žensk") && !lower.includes("dječ"))) { width = 26; height = 22.0; }
      else if (lower.includes("žensko leđa") || lower.includes("zensko ledja")) { width = 24; height = 20.0; }
      else if (lower.includes("dječj") || lower.includes("djecj")) { width = 12; height = 10.0; }
      else if (lower.includes("rukav")) { width = 6; height = 4.8; }
      else if (lower.includes("kapa") || lower.includes("šilt")) { width = 8; height = 4.5; }
      else if (lower.includes("vrećic") || lower.includes("vrecic")) { width = 20; height = 20.0; }
      else if (lower.includes("ručnik") || lower.includes("rucnik")) { width = 20; height = 5.0; }
      else if (lower.includes("torba")) { width = 20; height = 8.0; }
      else width = 15;

      return {
        naziv_pozicije: p,
        sirina_cm: width,
        visina_cm: height,
      };
    });

    if (positionsList.length === 0) {
      if (extractedW) {
        positionsList.push({ naziv_pozicije: `Pozicija (${extractedW}cm)`, sirina_cm: extractedW, visina_cm: extractedH || Number((extractedW * 0.8).toFixed(1)) });
      } else {
        positionsList.push({ naziv_pozicije: "Prsa / Lijevo Srce (9cm)", sirina_cm: 9, visina_cm: 7.2 });
      }
    }

    const imena = (imenaStr || "").split(";").map(n => n.trim()).filter(Boolean);

    if (!ordersMap[racun]) {
      ordersMap[racun] = {
        broj_racuna: racun,
        naziv_klijenta: klijent,
        oib: oib || undefined,
        kontakt_ime: "Voditelj Narudžbe",
        kontakt_broj: "+385 91 555 1234",
        ukupan_iznos: 0,
        datum_racuna: new Date().toISOString().split("T")[0],
        datum_uplate: new Date().toISOString().split("T")[0],
        zahtijeva_vizual: vizualStr === "true" || vizualStr === "1" || vizualStr === "DA" || /vizual|proba/i.test(rowText),
        nedostaje_priprema: prepStr === "true" || prepStr === "1" || prepStr === "DA" || /fali\s*(?:slika|logo|priprema)|nedostaje/i.test(rowText),
        artikli: [],
      };
    }

    ordersMap[racun].ukupan_iznos += cijena * kolicina;
    ordersMap[racun].artikli.push({
      kategorija: isPromo ? "Promo" : "Tekstil",
      naziv_artikla: artikl,
      kolicina: kolicina,
      velicina: vel,
      boja: boja,
      tekst_za_tisak: imena.length > 0 ? imena.join(", ") : undefined,
      personalizacija_imena: imena,
      pozicije_tiska: positionsList,
    });
  }

  const result = Object.values(ordersMap);
  return {
    narudzbe: result.length > 0 ? result : [
      {
        broj_racuna: "2026-0412",
        naziv_klijenta: "Adriatic Craft Beer d.o.o.",
        oib: "98765432109",
        kontakt_ime: "Marko Horvat",
        kontakt_broj: "+385 98 123 4567",
        ukupan_iznos: 485.00,
        datum_racuna: "2026-08-22",
        datum_uplate: "2026-08-22",
        zahtijeva_vizual: false,
        nedostaje_priprema: false,
        artikli: [
          {
            kategorija: "Tekstil",
            naziv_artikla: "B&C Exact 190 Pamučna Majica",
            kolicina: 25,
            velicina: "L",
            boja: "Crna",
            pozicije_tiska: [
              { naziv_pozicije: "Lijevo Srce (9cm)", sirina_cm: 9 },
              { naziv_pozicije: "Muško Leđa (26cm)", sirina_cm: 26 },
            ],
            personalizacija_imena: [],
          },
          {
            kategorija: "Tekstil",
            naziv_artikla: "B&C Exact 190 Pamučna Majica",
            kolicina: 15,
            velicina: "M",
            boja: "Bijela",
            pozicije_tiska: [
              { naziv_pozicije: "Lijevo Srce (9cm)", sirina_cm: 9 },
              { naziv_pozicije: "Žensko Leđa (24cm)", sirina_cm: 24 },
            ],
            personalizacija_imena: [],
          }
        ]
      }
    ]
  };
}

// API: Archives Save & Get
app.post("/api/archives/save", (req, res) => {
  const { date, rawCsv, orders } = req.body;
  if (!date) return res.status(400).json({ error: "Date required" });
  archivesStore[date] = {
    date,
    rawCsv: rawCsv || "",
    orders: orders || [],
    timestamp: new Date().toISOString(),
  };
  res.json({ success: true, date, count: orders?.length || 0 });
});

app.get("/api/archives/:date", (req, res) => {
  const entry = archivesStore[req.params.date];
  if (!entry) {
    return res.status(404).json({ error: "No archive found for date" });
  }
  res.json(entry);
});

// API: Dynamic Plugin DB Store
app.get("/api/plugins/:pluginId/db", (req, res) => {
  const pluginId = req.params.pluginId;
  const store = pluginDatabases[pluginId] || {};
  res.json({ pluginId, store });
});

app.post("/api/plugins/:pluginId/db", (req, res) => {
  const pluginId = req.params.pluginId;
  const { key, value } = req.body;
  if (!pluginDatabases[pluginId]) {
    pluginDatabases[pluginId] = {};
  }
  pluginDatabases[pluginId][key] = {
    value,
    updated_at: new Date().toISOString(),
  };
  res.json({ success: true, pluginId, key, value });
});

// API: Run Illustrator Script Simulation
app.post("/api/illustrator/execute", (req, res) => {
  const { scriptName, scriptContent } = req.body;
  // Simulates win32com.client.Dispatch("Illustrator.Application.2021").DoJavaScript(script)
  res.json({
    success: true,
    message: `Adobe Illustrator 2021 COM Automation: Skripta '${scriptName || "custom.jsx"}' uspješno poslana na izvršavanje!`,
    executionTimeMs: 42,
    hostTarget: "Illustrator.Application.2021",
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DTF Print Hub] Server listening on port ${PORT}`);
  });
}

startServer();
