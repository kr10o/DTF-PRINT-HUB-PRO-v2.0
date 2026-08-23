import { Order, ClientAsset, PluginDefinition, CustomerProfile, WorkspaceFolder } from "../types";

export const SAMPLE_CSV_CONTENT = `Broj Računa,Klijent,OIB,Artikl,Količina,Veličina,Boja,Pozicije Tiska,Jedinična Cijena,Zahtijeva Vizual,Nedostaje Priprema,Personalizacija
2026-0412,Adriatic Craft Beer d.o.o.,98765432109,B&C Exact 190 Pamučna Majica,25,L,Crna,Lijevo Srce (9cm);Muško Leđa (26cm),12.50,NE,NE,
2026-0412,Adriatic Craft Beer d.o.o.,98765432109,B&C Exact 190 Pamučna Majica,15,M,Crna,Lijevo Srce (9cm);Žensko Leđa (24cm),12.50,NE,NE,
2026-0413,Konoba Gusar vl. I. Jurić,11223344556,Gildan Heavy Blend Hudica,10,XL,Tamno Siva,Lijevo Srce (9cm);Rukav (6cm),28.00,DA,NE,
2026-0413,Konoba Gusar vl. I. Jurić,11223344556,Pamučna Pregača s džepom,8,Unisex,Crna,Prsa Centar (20cm),14.00,NE,NE,Luka;Ivan;Marko;Ana;Matea;Toni;Petar;Josip
2026-0414,Auto Servis Vuković j.d.o.o.,55443322110,Roly Atomic 150 Majica,30,L,Kraljevsko Plava,Lijevo Srce (9cm);Muško Leđa (26cm);Rukav (6cm),11.00,NE,NE,
2026-0414,Auto Servis Vuković j.d.o.o.,55443322110,Beechfield Šilt Kapa 5P,30,Unisex,Mornarsko Plava,Šilt Kapa Unisex (8x4.5cm),7.50,NE,DA,
2026-0415,Fit Gym Dubrovnik,77889900112,Sportska Torba Premium,12,OneSize,Crna,Sportska Torba Gore (20x8cm),19.50,DA,DA,
2026-0415,Fit Gym Dubrovnik,77889900112,Mikrofibra Ručnik za Trening,20,50x100cm,Tirkizna,Ručnik (20x5cm),9.00,NE,NE,
2026-0416,Kulturno Društvo Zvon,33445566778,Dječja Majica Malfini Classic,18,10 god,Bijela,Dječja Leđa (12cm);Lijevo Srce (9cm),8.50,NE,NE,
2026-0416,Kulturno Društvo Zvon,33445566778,Platnena Eko Vrećica 140g,50,Unisex,Natur Bež,Platnena Vrećica (20cm),3.80,NE,NE,`;

export const INITIAL_ORDERS: Order[] = [
  {
    broj_racuna: "2026-0412",
    naziv_klijenta: "Adriatic Craft Beer d.o.o.",
    oib: "98765432109",
    kontakt_ime: "Marko Horvat",
    kontakt_broj: "+385 98 123 4567",
    ukupan_iznos: 500.00,
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
          { naziv_pozicije: "Lijevo Srce", sirina_cm: 9, visina_cm: 7.2 },
          { naziv_pozicije: "Muško Leđa", sirina_cm: 26, visina_cm: 20.8 },
        ],
        personalizacija_imena: [],
      },
      {
        kategorija: "Tekstil",
        naziv_artikla: "B&C Exact 190 Pamučna Majica",
        kolicina: 15,
        velicina: "M",
        boja: "Crna",
        pozicije_tiska: [
          { naziv_pozicije: "Lijevo Srce", sirina_cm: 9, visina_cm: 7.2 },
          { naziv_pozicije: "Žensko Leđa", sirina_cm: 24, visina_cm: 19.2 },
        ],
        personalizacija_imena: [],
      },
    ],
  },
  {
    broj_racuna: "2026-0413",
    naziv_klijenta: "Konoba Gusar vl. I. Jurić",
    oib: "11223344556",
    kontakt_ime: "Ivan Jurić",
    kontakt_broj: "+385 91 765 4321",
    ukupan_iznos: 392.00,
    datum_racuna: "2026-08-22",
    datum_uplate: "2026-08-21",
    zahtijeva_vizual: true,
    nedostaje_priprema: false,
    artikli: [
      {
        kategorija: "Tekstil",
        naziv_artikla: "Gildan Heavy Blend Hudica",
        kolicina: 10,
        velicina: "XL",
        boja: "Tamno Siva",
        pozicije_tiska: [
          { naziv_pozicije: "Lijevo Srce", sirina_cm: 9, visina_cm: 7.0 },
          { naziv_pozicije: "Rukav", sirina_cm: 6, visina_cm: 18.0 },
        ],
        personalizacija_imena: [],
      },
      {
        kategorija: "Tekstil",
        naziv_artikla: "Pamučna Pregača s džepom",
        kolicina: 8,
        velicina: "Unisex",
        boja: "Crna",
        pozicije_tiska: [
          { naziv_pozicije: "Prsa Centar", sirina_cm: 20, visina_cm: 15.0 },
        ],
        personalizacija_imena: ["Luka", "Ivan", "Marko", "Ana", "Matea", "Toni", "Petar", "Josip"],
      },
    ],
  },
  {
    broj_racuna: "2026-0414",
    naziv_klijenta: "Auto Servis Vuković j.d.o.o.",
    oib: "55443322110",
    kontakt_ime: "Dario Vuković",
    kontakt_broj: "+385 95 333 8899",
    ukupan_iznos: 555.00,
    datum_racuna: "2026-08-22",
    datum_uplate: "2026-08-22",
    zahtijeva_vizual: false,
    nedostaje_priprema: true,
    artikli: [
      {
        kategorija: "Tekstil",
        naziv_artikla: "Roly Atomic 150 Majica",
        kolicina: 30,
        velicina: "L",
        boja: "Kraljevsko Plava",
        pozicije_tiska: [
          { naziv_pozicije: "Lijevo Srce", sirina_cm: 9, visina_cm: 6.5 },
          { naziv_pozicije: "Muško Leđa", sirina_cm: 26, visina_cm: 18.0 },
          { naziv_pozicije: "Rukav", sirina_cm: 6, visina_cm: 8.0 },
        ],
        personalizacija_imena: [],
      },
      {
        kategorija: "Promo",
        naziv_artikla: "Beechfield Šilt Kapa 5P",
        kolicina: 30,
        velicina: "Unisex",
        boja: "Mornarsko Plava",
        pozicije_tiska: [
          { naziv_pozicije: "Šilt Kapa Unisex", sirina_cm: 8, visina_cm: 4.5 },
        ],
        personalizacija_imena: [],
      },
    ],
  },
  {
    broj_racuna: "2026-0415",
    naziv_klijenta: "Fit Gym Dubrovnik",
    oib: "77889900112",
    kontakt_ime: "Katarina Šimić",
    kontakt_broj: "+385 99 222 1100",
    ukupan_iznos: 414.00,
    datum_racuna: "2026-08-22",
    datum_uplate: undefined,
    zahtijeva_vizual: true,
    nedostaje_priprema: true,
    artikli: [
      {
        kategorija: "Promo",
        naziv_artikla: "Sportska Torba Premium",
        kolicina: 12,
        velicina: "OneSize",
        boja: "Crna",
        pozicije_tiska: [
          { naziv_pozicije: "Sportska Torba Gore", sirina_cm: 20, visina_cm: 8.0 },
        ],
        personalizacija_imena: [],
      },
      {
        kategorija: "Promo",
        naziv_artikla: "Mikrofibra Ručnik za Trening",
        kolicina: 20,
        velicina: "50x100cm",
        boja: "Tirkizna",
        pozicije_tiska: [
          { naziv_pozicije: "Ručnik", sirina_cm: 20, visina_cm: 5.0 },
        ],
        personalizacija_imena: [],
      },
    ],
  },
  {
    broj_racuna: "2026-0416",
    naziv_klijenta: "Kulturno Društvo Zvon",
    oib: "33445566778",
    kontakt_ime: "Sanja Babić",
    kontakt_broj: "+385 92 444 7711",
    ukupan_iznos: 343.00,
    datum_racuna: "2026-08-22",
    datum_uplate: "2026-08-22",
    zahtijeva_vizual: false,
    nedostaje_priprema: false,
    artikli: [
      {
        kategorija: "Tekstil",
        naziv_artikla: "Dječja Majica Malfini Classic",
        kolicina: 18,
        velicina: "10 god",
        boja: "Bijela",
        pozicije_tiska: [
          { naziv_pozicije: "Dječja Leđa", sirina_cm: 12, visina_cm: 10.0 },
          { naziv_pozicije: "Lijevo Srce", sirina_cm: 9, visina_cm: 7.5 },
        ],
        personalizacija_imena: [],
      },
      {
        kategorija: "Promo",
        naziv_artikla: "Platnena Eko Vrećica 140g",
        kolicina: 50,
        velicina: "Unisex",
        boja: "Natur Bež",
        pozicije_tiska: [
          { naziv_pozicije: "Platnena Vrećica", sirina_cm: 20, visina_cm: 22.0 },
        ],
        personalizacija_imena: [],
      },
    ],
  },
];

const SVG_ADRIATIC_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" fill="none"><rect width="300" height="200" rx="12" fill="%23050508"/><circle cx="150" cy="85" r="45" stroke="%234FC3F7" stroke-width="3" stroke-dasharray="4 2"/><path d="M150 50 C140 70 135 85 150 110 C165 85 160 70 150 50 Z" fill="%234FC3F7"/><path d="M135 80 Q150 95 165 80" stroke="%23FFFFFF" stroke-width="2" stroke-linecap="round"/><text x="150" y="150" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23FFFFFF" text-anchor="middle" letter-spacing="2">ADRIATIC CRAFT</text><text x="150" y="170" font-family="sans-serif" font-size="10" font-weight="600" fill="%234FC3F7" text-anchor="middle" letter-spacing="4">BREWERY & CO.</text></svg>`;

const SVG_ADRIATIC_CHEST = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none"><polygon points="100,20 170,55 170,125 100,180 30,125 30,55" stroke="%234FC3F7" stroke-width="3" fill="%230A192F"/><path d="M100 45 L100 145 M60 95 L140 95" stroke="%23FFFFFF" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="95" r="18" fill="%230288D1" stroke="%23FFFFFF" stroke-width="2"/><text x="100" y="165" font-family="sans-serif" font-size="11" font-weight="bold" fill="%234FC3F7" text-anchor="middle">CHEST BADGE</text></svg>`;

const SVG_GUSAR_ANCHOR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" fill="none"><rect width="300" height="200" rx="12" fill="%230A0B10"/><circle cx="150" cy="55" r="14" stroke="%23D8315B" stroke-width="3"/><line x1="150" y1="69" x2="150" y2="140" stroke="%23D8315B" stroke-width="4"/><line x1="120" y1="85" x2="180" y2="85" stroke="%23D8315B" stroke-width="4" stroke-linecap="round"/><path d="M110 120 C110 155 190 155 190 120" stroke="%23D8315B" stroke-width="4" fill="none" stroke-linecap="round"/><text x="150" y="172" font-family="serif" font-size="15" font-weight="bold" fill="%23FFFFFF" text-anchor="middle" letter-spacing="1">KONOBA GUSAR</text></svg>`;

const SVG_ZVON_BELL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" fill="none"><rect width="300" height="200" rx="12" fill="%23FAFAFA"/><path d="M150 40 C125 40 115 80 105 125 L195 125 C185 80 175 40 150 40 Z" fill="%23111111"/><ellipse cx="150" cy="125" rx="45" ry="10" fill="%23222222"/><circle cx="150" cy="138" r="7" fill="%23000000"/><text x="150" y="170" font-family="serif" font-size="14" font-weight="bold" fill="%23000000" text-anchor="middle" letter-spacing="2">KD ZVON 1924</text></svg>`;

const SVG_VUKOVIC_AUTO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" fill="none"><rect width="300" height="200" rx="12" fill="%23050508"/><circle cx="150" cy="85" r="40" stroke="%23FF9800" stroke-width="4" stroke-dasharray="6 3"/><path d="M130 85 L170 85 M150 65 L150 105" stroke="%23FFFFFF" stroke-width="4" stroke-linecap="round"/><text x="150" y="152" font-family="sans-serif" font-size="15" font-weight="bold" fill="%23FF9800" text-anchor="middle">AUTO VUKOVIĆ</text><text x="150" y="170" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23B0BEC5" text-anchor="middle">SERVIS & DIJAGNOSTIKA</text></svg>`;

const SVG_FIT_GYM = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" fill="none"><rect width="300" height="200" rx="12" fill="%230A0E17"/><rect x="110" y="80" width="80" height="12" rx="3" fill="%234FC3F7"/><rect x="95" y="65" width="15" height="42" rx="3" fill="%23FFFFFF"/><rect x="80" y="70" width="12" height="32" rx="2" fill="%230288D1"/><rect x="190" y="65" width="15" height="42" rx="3" fill="%23FFFFFF"/><rect x="208" y="70" width="12" height="32" rx="2" fill="%230288D1"/><text x="150" y="145" font-family="sans-serif" font-size="16" font-weight="900" fill="%23FFFFFF" text-anchor="middle" letter-spacing="1">FIT GYM</text><text x="150" y="165" font-family="sans-serif" font-size="10" font-weight="700" fill="%234FC3F7" text-anchor="middle" letter-spacing="3">DUBROVNIK</text></svg>`;

export const INITIAL_CUSTOMER_PROFILES: CustomerProfile[] = [
  {
    id: "cust-01",
    name: "Adriatic Craft Beer d.o.o.",
    createdAt: Date.now() - 86400000 * 5,
    oib: "12345678901",
    contactName: "Marko Anić",
    contactPhone: "+385 91 445 6789",
    folderPath: "client_assets/Adriatic_Craft_Beer_d.o.o/",
    notes: `BRAND IDENTITY & PREPRESS NOTES:
• Primarna Boja: #4FC3F7 (Svijetlo Plava), #0A2463 (Imperial Blue)
• Boja Podloge: Tamne majice (Crna, Navy, Antracit)
• CMYK Specifikacija: 0% C, 0% M, 1% Y, 0% K (White Underbase za RIP)
• Pozicije: Srce (9cm), Leđa (26cm), Rukav (6cm)
• DTF Preša: 160°C, 15 sekundi, Cold Peel, finalni finiš 5 sec sa teflonom
• Kontakt: Marko Anić (Voditelj nabave), info@adriatic-craft.hr`,
  },
  {
    id: "cust-02",
    name: "Konoba Gusar vl. I. Jurić",
    createdAt: Date.now() - 86400000 * 4,
    oib: "98765432109",
    contactName: "Ivan Jurić",
    contactPhone: "+385 98 123 4567",
    folderPath: "client_assets/Konoba_Gusar_vl_I_Juric/",
    notes: `KONOBA GUSAR - GRAFIČKE SMJERNICE:
• Vektorski amblem: Sidro + tipografija Gusar
• CMYK Bijela za crne pregače i majice osoblja: 0,0,1,0
• Personalizacija: Konobar / Kuhar na lijevom rukavu (6cm)
• Termopreša: 155°C, 12 sekundi
• Dostava: Split, Obala kneza Domagoja`,
  },
  {
    id: "cust-03",
    name: "Auto Servis Vuković j.d.o.o.",
    createdAt: Date.now() - 86400000 * 3,
    oib: "55443322110",
    contactName: "Dario Vuković",
    contactPhone: "+385 95 333 8899",
    folderPath: "client_assets/Auto_Servis_Vukovic_jdoo/",
    notes: `SERVIS VUKOVIĆ PREPRESS:
• Boje: Narančasta (#FF9800) + Čista Bijela
• Šilt kape: Maksimalna visina preslikača 4.5cm, širina 8.0cm
• Radni kombinezoni i majice: Roly Atomic Kraljevsko Plava
• RIP profil: 100% White flood underbase`,
  },
  {
    id: "cust-04",
    name: "Fit Gym Dubrovnik",
    createdAt: Date.now() - 86400000 * 2,
    oib: "77889900112",
    contactName: "Katarina Šimić",
    contactPhone: "+385 99 222 1100",
    folderPath: "client_assets/Fit_Gym_Dubrovnik/",
    notes: `FIT GYM PROMO MATERIJALI:
• Torbe: Gornji tisak 20 x 8 cm
• Ručnici: Vez ili DTF 20 x 5 cm
• Boje tekstila: Tirkizna i Crna
• Zahtijeva vizualno odobrenje prije puštanja na DTF rolu`,
  },
  {
    id: "cust-05",
    name: "Kulturno Društvo Zvon",
    createdAt: Date.now() - 86400000 * 1,
    oib: "33221144556",
    contactName: "Petar Babić",
    contactPhone: "+385 92 111 4455",
    folderPath: "client_assets/Kulturno_Drustvo_Zvon/",
    notes: `KD ZVON - EKO VREĆICE & PROMO:
• Tehnika: DTF preslikač na prirodni pamuk (Ecru)
• Boja: Čista Crna 0% C, 0% M, 0% Y, 100% K (bez bijele podloge)
• Veličina preslikača: 20 x 22 cm
• Termopreša: 150°C, 15 sec, toplo skidanje (Hot peel)`,
  },
];

export const INITIAL_CLIENT_ASSETS: ClientAsset[] = [
  {
    id: "ast-01",
    clientName: "Adriatic Craft Beer d.o.o.",
    customerId: "cust-01",
    invoiceNumber: "2026-0412",
    filename: "adriatic_beer_logo_white.ai",
    fileType: "ai",
    category: "logo_dark_shirts",
    cmykSpecification: "0,0,1,0 (White Underbase)",
    dimensionsMm: "260 x 208 mm",
    uploadedAt: "2026-08-22 09:15",
    sizeBytes: 2450000,
    previewUrl: SVG_ADRIATIC_LOGO,
    bgClass: "bg-black",
  },
  {
    id: "ast-02",
    clientName: "Adriatic Craft Beer d.o.o.",
    customerId: "cust-01",
    invoiceNumber: "2026-0412",
    filename: "adriatic_beer_badge_chest.svg",
    fileType: "svg",
    category: "logo_dark_shirts",
    cmykSpecification: "0,0,1,0 (White Underbase)",
    dimensionsMm: "90 x 72 mm",
    uploadedAt: "2026-08-22 09:16",
    sizeBytes: 120000,
    previewUrl: SVG_ADRIATIC_CHEST,
    bgClass: "bg-black",
  },
  {
    id: "ast-03",
    clientName: "Konoba Gusar vl. I. Jurić",
    customerId: "cust-02",
    invoiceNumber: "2026-0413",
    filename: "gusar_sidro_emblem.pdf",
    fileType: "pdf",
    category: "logo_dark_shirts",
    cmykSpecification: "0,0,1,0 (White Underbase)",
    dimensionsMm: "200 x 150 mm",
    uploadedAt: "2026-08-22 10:04",
    sizeBytes: 3180000,
    previewUrl: SVG_GUSAR_ANCHOR,
    bgClass: "bg-black",
  },
  {
    id: "ast-04",
    clientName: "Kulturno Društvo Zvon",
    customerId: "cust-05",
    invoiceNumber: "2026-0416",
    filename: "kd_zvon_vector_black.eps",
    fileType: "eps",
    category: "logo_light_shirts",
    cmykSpecification: "0,0,0,100 (Pure Black)",
    dimensionsMm: "200 x 220 mm",
    uploadedAt: "2026-08-22 11:30",
    sizeBytes: 1850000,
    previewUrl: SVG_ZVON_BELL,
    bgClass: "bg-white",
  },
  {
    id: "ast-05",
    clientName: "Auto Servis Vuković j.d.o.o.",
    customerId: "cust-03",
    invoiceNumber: "2026-0414",
    filename: "vukovic_auto_raster_scan.png",
    fileType: "png",
    category: "general",
    cmykSpecification: "CMYK Full Color",
    dimensionsMm: "260 x 180 mm",
    uploadedAt: "2026-08-22 13:10",
    sizeBytes: 4500000,
    previewUrl: SVG_VUKOVIC_AUTO,
    bgClass: "bg-black",
  },
  {
    id: "ast-06",
    clientName: "Fit Gym Dubrovnik",
    customerId: "cust-04",
    invoiceNumber: "2026-0415",
    filename: "fit_gym_emblem_dtf.svg",
    fileType: "svg",
    category: "general",
    cmykSpecification: "0,0,1,0 (White Underbase)",
    dimensionsMm: "200 x 80 mm",
    uploadedAt: "2026-08-22 14:20",
    sizeBytes: 340000,
    previewUrl: SVG_FIT_GYM,
    bgClass: "bg-black",
  },
];

export const INITIAL_PLUGINS: PluginDefinition[] = [
  {
    id: "barcode_generator",
    name: "DTF Barcode & QR Labeler",
    version: "1.2.0",
    author: "Prepress Studio",
    description: "Automatsko generiranje EAN/Code128 barkodova i QR oznaka za svaki preslikač na roli.",
    type: "python",
    isEnabled: true,
    dbKeysCount: 3,
    lastRun: "2026-08-22 14:05",
    code: `"""
DTF Barcode & QR Labeler Plugin
Inicijalizira lokalnu SQLite bazu i generira barkod naljepnice za tiskarsku rolu.
"""
def render(main_orders, plugin_db):
    prefix = plugin_db.get("prefix", "DTF-2026-")
    print(f"Generiram barkodove za {len(main_orders)} naloga sa prefiksom {prefix}")
    return {
        "status": "success",
        "labels_generated": len(main_orders) * 2,
        "format": "CODE128"
    }
`,
  },
  {
    id: "cost_calculator",
    name: "Potrošnja Boje & Filma Kalkulator",
    version: "2.0.1",
    author: "Financije & Proizvodnja",
    description: "Izračunava točnu potrošnju bijelog i CMYK tonera, DTF praha i PET filma po metru dužnom.",
    type: "python",
    isEnabled: true,
    dbKeysCount: 2,
    lastRun: "2026-08-22 15:20",
    code: `"""
Potrošnja Boje i Filma po roli
"""
def render(main_orders, plugin_db):
    film_rate = float(plugin_db.get("film_per_m", 2.80))
    ink_rate = float(plugin_db.get("ink_per_sqm", 4.20))
    total_qty = sum(item.kolicina for o in main_orders for item in o.artikli)
    est_meters = round(total_qty * 0.18, 2)
    est_cost = round(est_meters * (film_rate + ink_rate), 2)
    return {
        "estimated_meters": est_meters,
        "estimated_cost_eur": est_cost,
        "white_ink_ml": round(est_meters * 18.5, 1)
    }
`,
  },
  {
    id: "illustrator_gang_builder",
    name: "Adobe Illustrator 2021 Gang Automation",
    version: "3.1.0",
    author: "Adobe Prepress COM Engine",
    description: "Izravno pokreće Adobe Illustrator 2021 preko COM automatizacije i slaže vektorske artboarde 58cm.",
    type: "illustrator_jsx",
    isEnabled: true,
    dbKeysCount: 1,
    lastRun: "2026-08-22 16:10",
    code: `// Adobe Illustrator 2021 JSX Gang Sheet Automation
#target illustrator

function buildDTFGangSheet(widthCm, heightCm) {
    var doc = app.documents.add(DocumentColorSpace.CMYK, widthCm * 28.3465, heightCm * 28.3465);
    var artboard = doc.artboards[0];
    artboard.name = "DTF_Roll_58cm";
    
    // Set CMYK White Base 0,0,1,0 Spot color
    var spotWhite = doc.spots.add();
    spotWhite.name = "White_Underbase";
    var cmykColor = new CMYKColor();
    cmykColor.cyan = 0;
    cmykColor.magenta = 0;
    cmykColor.yellow = 1;
    cmykColor.black = 0;
    spotWhite.color = cmykColor;
    
    return "Gang sheet artboard created successfully: 58cm x " + heightCm + "cm";
}

buildDTFGangSheet(58.0, 320.0);
`,
  },
];

export const INITIAL_WORKSPACES: WorkspaceFolder[] = [
  {
    id: "ws_main",
    name: "Dnevna Proizvodnja",
    icon: "folder",
    color: "#4FC3F7",
    date: "2026-04-12",
    description: "Glavna proizvodna linija za 58cm rolu i skladište",
    orders: INITIAL_ORDERS,
    createdAt: "2026-04-12T08:00:00Z",
    isSystem: true,
    tag: "Primarno",
  },
  {
    id: "ws_rush",
    name: "Hitni Nalozi (Rush)",
    icon: "flame",
    color: "#F43F5E",
    date: "2026-04-12",
    description: "Prioritetni nalozi s rokom isporuke unutar 24h",
    orders: INITIAL_ORDERS.filter((o) => o.zahtijeva_vizual || o.nedostaje_priprema),
    createdAt: "2026-04-12T08:30:00Z",
    isSystem: false,
    tag: "Hitno",
  },
  {
    id: "ws_b2b",
    name: "B2B Veleprodaja",
    icon: "building",
    color: "#F59E0B",
    date: "2026-04-12",
    description: "Komercijalni nalozi s većim nakladama (>20 kom)",
    orders: INITIAL_ORDERS.filter((o) => o.artikli.reduce((s, a) => s + a.kolicina, 0) >= 20),
    createdAt: "2026-04-11T14:20:00Z",
    isSystem: false,
    tag: "B2B",
  },
  {
    id: "ws_promo",
    name: "Promo & UV Program",
    icon: "gift",
    color: "#A855F7",
    date: "2026-04-12",
    description: "Platnene vrećice, šilt kape, ručnici i promo artikli",
    orders: INITIAL_ORDERS.filter((o) =>
      o.artikli.some((a) => a.kategorija === "Promo" || a.naziv_artikla.includes("Kapa") || a.naziv_artikla.includes("Vrećica") || a.naziv_artikla.includes("Ručnik"))
    ),
    createdAt: "2026-04-10T11:00:00Z",
    isSystem: false,
    tag: "Promo",
  },
  {
    id: "ws_archive",
    name: "Arhiva Prošlih Naloga",
    icon: "archive",
    color: "#10B981",
    date: "2026-04-11",
    description: "Isporučeni i zaključeni radni nalozi",
    orders: INITIAL_ORDERS.slice(0, 2),
    createdAt: "2026-04-09T09:00:00Z",
    isSystem: false,
    tag: "Arhiva",
  },
];
