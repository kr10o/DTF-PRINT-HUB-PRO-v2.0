import { Order, StockPredictionItem } from "../types";

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalGarments: number;
  totalPromo: number;
  b2bOrdersCount: number;
  b2cOrdersCount: number;
  b2bPercentage: number;
  topClients: { name: string; totalSpent: number; itemsCount: number }[];
  sizeDistribution: { size: string; count: number }[];
  colorDistribution: { color: string; count: number }[];
}

export function calculateAnalytics(orders: Order[]): AnalyticsSummary {
  let totalRevenue = 0;
  let totalGarments = 0;
  let totalPromo = 0;
  let b2bCount = 0;
  let b2cCount = 0;

  const clientMap: Record<string, { totalSpent: number; itemsCount: number }> = {};
  const sizeMap: Record<string, number> = {};
  const colorMap: Record<string, number> = {};

  for (const order of orders) {
    totalRevenue += order.ukupan_iznos;
    const isB2B = !!order.oib || /d\.o\.o\.|j\.d\.o\.o\.|obrt|vl\./i.test(order.naziv_klijenta);
    if (isB2B) b2bCount++;
    else b2cCount++;

    if (!clientMap[order.naziv_klijenta]) {
      clientMap[order.naziv_klijenta] = { totalSpent: 0, itemsCount: 0 };
    }
    clientMap[order.naziv_klijenta].totalSpent += order.ukupan_iznos;

    for (const item of order.artikli) {
      clientMap[order.naziv_klijenta].itemsCount += item.kolicina;
      if (item.kategorija === "Tekstil") {
        totalGarments += item.kolicina;
      } else {
        totalPromo += item.kolicina;
      }

      if (item.velicina) {
        const sz = item.velicina.toUpperCase();
        sizeMap[sz] = (sizeMap[sz] || 0) + item.kolicina;
      }
      if (item.boja) {
        const col = item.boja;
        colorMap[col] = (colorMap[col] || 0) + item.kolicina;
      }
    }
  }

  const topClients = Object.entries(clientMap)
    .map(([name, data]) => ({ name, totalSpent: data.totalSpent, itemsCount: data.itemsCount }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const sizeDistribution = Object.entries(sizeMap)
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.count - a.count);

  const colorDistribution = Object.entries(colorMap)
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);

  const totalOrders = orders.length;
  const b2bPercentage = totalOrders > 0 ? Math.round((b2bCount / totalOrders) * 100) : 0;

  return {
    totalRevenue,
    totalOrders,
    totalGarments,
    totalPromo,
    b2bOrdersCount: b2bCount,
    b2cOrdersCount: b2cCount,
    b2bPercentage,
    topClients,
    sizeDistribution,
    colorDistribution,
  };
}

// Safety stock prediction: Zaliha = floor(Potrošnja * 2.5) + 5
export function calculateStockPredictions(orders: Order[]): StockPredictionItem[] {
  const blankModelUsage: Record<string, { name: string; color: string; size: string; count: number }> = {};

  for (const order of orders) {
    for (const item of order.artikli) {
      if (item.kategorija === "Tekstil") {
        const key = `${item.naziv_artikla}__${item.boja || "Crna"}__${item.velicina || "L"}`;
        if (!blankModelUsage[key]) {
          blankModelUsage[key] = {
            name: item.naziv_artikla,
            color: item.boja || "Crna",
            size: item.velicina || "L",
            count: 0,
          };
        }
        blankModelUsage[key].count += item.kolicina;
      }
    }
  }

  return Object.entries(blankModelUsage).map(([id, data]) => {
    const potrosnja = data.count;
    // Formula: floor(potrosnja * 2.5) + 5
    const preporucena = Math.floor(potrosnja * 2.5) + 5;
    // Simulated current stock level for demonstrator
    const trenutna = Math.max(Math.floor(potrosnja * 1.2), 0);
    const deficit = Math.max(0, preporucena - trenutna);

    let status: "OK" | "UPOZORENJE" | "KRITIČNO" = "OK";
    if (trenutna < potrosnja) {
      status = "KRITIČNO";
    } else if (trenutna < preporucena) {
      status = "UPOZORENJE";
    }

    return {
      id,
      naziv_artikla: data.name,
      boja: data.color,
      velicina: data.size,
      dnevna_potrosnja: potrosnja,
      trenutna_zaliha: trenutna,
      preporucena_zaliha: preporucena,
      deficit,
      status,
    };
  });
}

// ANSI SQL Export with Transactions
export function generateAnsiSqlExport(orders: Order[]): string {
  let sql = `-- ========================================================\n`;
  sql += `-- DTF PRINT HUB - ANSI SQL DATA EXPORT (TRANSACTIONS)\n`;
  sql += `-- Datum generiranja: ${new Date().toISOString()}\n`;
  sql += `-- ========================================================\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS invoices (\n`;
  sql += `    invoice_number VARCHAR(50) PRIMARY KEY,\n`;
  sql += `    client_name VARCHAR(255) NOT NULL,\n`;
  sql += `    oib VARCHAR(20),\n`;
  sql += `    contact_name VARCHAR(100),\n`;
  sql += `    contact_phone VARCHAR(50),\n`;
  sql += `    total_amount NUMERIC(12, 2) NOT NULL,\n`;
  sql += `    invoice_date DATE NOT NULL,\n`;
  sql += `    payment_date DATE,\n`;
  sql += `    requires_visual_approval BOOLEAN DEFAULT FALSE,\n`;
  sql += `    missing_prep BOOLEAN DEFAULT FALSE\n`;
  sql += `);\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS order_items (\n`;
  sql += `    id SERIAL PRIMARY KEY,\n`;
  sql += `    invoice_number VARCHAR(50) REFERENCES invoices(invoice_number) ON DELETE CASCADE,\n`;
  sql += `    category VARCHAR(50) NOT NULL,\n`;
  sql += `    item_name VARCHAR(255) NOT NULL,\n`;
  sql += `    quantity INT NOT NULL,\n`;
  sql += `    size VARCHAR(20),\n`;
  sql += `    color VARCHAR(50),\n`;
  sql += `    print_positions TEXT,\n`;
  sql += `    personalization_names TEXT\n`;
  sql += `);\n\n`;

  sql += `BEGIN TRANSACTION;\n\n`;

  for (const order of orders) {
    const oibVal = order.oib ? `'${order.oib.replace(/'/g, "''")}'` : `NULL`;
    const contactName = order.kontakt_ime ? `'${order.kontakt_ime.replace(/'/g, "''")}'` : `NULL`;
    const contactPhone = order.kontakt_broj ? `'${order.kontakt_broj.replace(/'/g, "''")}'` : `NULL`;
    const paymentDate = order.datum_uplate ? `'${order.datum_uplate}'` : `NULL`;

    sql += `INSERT INTO invoices (invoice_number, client_name, oib, contact_name, contact_phone, total_amount, invoice_date, payment_date, requires_visual_approval, missing_prep)\n`;
    sql += `VALUES ('${order.broj_racuna}', '${order.naziv_klijenta.replace(/'/g, "''")}', ${oibVal}, ${contactName}, ${contactPhone}, ${order.ukupan_iznos.toFixed(2)}, '${order.datum_racuna}', ${paymentDate}, ${order.zahtijeva_vizual ? "TRUE" : "FALSE"}, ${order.nedostaje_priprema ? "TRUE" : "FALSE"})\n`;
    sql += `ON CONFLICT (invoice_number) DO UPDATE SET total_amount = EXCLUDED.total_amount;\n\n`;

    for (const item of order.artikli) {
      const positions = item.pozicije_tiska.map((p) => `${p.naziv_pozicije} (${p.sirina_cm}cm)`).join("; ");
      const names = item.personalizacija_imena.join("; ");

      sql += `INSERT INTO order_items (invoice_number, category, item_name, quantity, size, color, print_positions, personalization_names)\n`;
      sql += `VALUES ('${order.broj_racuna}', '${item.kategorija}', '${item.naziv_artikla.replace(/'/g, "''")}', ${item.kolicina}, '${item.velicina || ""}', '${item.boja || ""}', '${positions.replace(/'/g, "''")}', '${names.replace(/'/g, "''")}');\n`;
    }
    sql += `\n`;
  }

  sql += `COMMIT;\n`;
  return sql;
}

// ERP XML Export in standard DokumentiExport format
export function generateErpXmlExport(orders: Order[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<DokumentiExport xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Verzija="2.4" DatumGeneriranja="${new Date().toISOString()}">\n`;
  xml += `  <Zaglavlje>\n`;
  xml += `    <Posiljatelj>DTF Print Hub Prepress Inzenjering</Posiljatelj>\n`;
  xml += `    <BrojDokumenata>${orders.length}</BrojDokumenata>\n`;
  xml += `    <Valuta>EUR</Valuta>\n`;
  xml += `  </Zaglavlje>\n`;
  xml += `  <Racuni>\n`;

  for (const order of orders) {
    xml += `    <Racun Broj="${order.broj_racuna}">\n`;
    xml += `      <Klijent>\n`;
    xml += `        <Naziv>${escapeXml(order.naziv_klijenta)}</Naziv>\n`;
    if (order.oib) xml += `        <OIB>${escapeXml(order.oib)}</OIB>\n`;
    if (order.kontakt_ime) xml += `        <KontaktOsoba>${escapeXml(order.kontakt_ime)}</KontaktOsoba>\n`;
    if (order.kontakt_broj) xml += `        <Telefon>${escapeXml(order.kontakt_broj)}</Telefon>\n`;
    xml += `      </Klijent>\n`;
    xml += `      <DatumIzdavanja>${order.datum_racuna}</DatumIzdavanja>\n`;
    if (order.datum_uplate) xml += `      <DatumPlacanja>${order.datum_uplate}</DatumPlacanja>\n`;
    xml += `      <UkupanIznosValuta>${order.ukupan_iznos.toFixed(2)}</UkupanIznosValuta>\n`;
    xml += `      <ZahtijevaVizual>${order.zahtijeva_vizual ? "DA" : "NE"}</ZahtijevaVizual>\n`;
    xml += `      <NedostajePriprema>${order.nedostaje_priprema ? "DA" : "NE"}</NedostajePriprema>\n`;
    xml += `      <Stavke>\n`;

    for (const item of order.artikli) {
      xml += `        <Stavka Kategorija="${item.kategorija}">\n`;
      xml += `          <NazivArtikla>${escapeXml(item.naziv_artikla)}</NazivArtikla>\n`;
      xml += `          <Kolicina>${item.kolicina}</Kolicina>\n`;
      if (item.velicina) xml += `          <Velicina>${escapeXml(item.velicina)}</Velicina>\n`;
      if (item.boja) xml += `          <Boja>${escapeXml(item.boja)}</Boja>\n`;
      xml += `          <PozicijeTiska>\n`;
      for (const pos of item.pozicije_tiska) {
        xml += `            <Pozicija SirinaCm="${pos.sirina_cm}"${pos.visina_cm ? ` VisinaCm="${pos.visina_cm}"` : ""}>${escapeXml(pos.naziv_pozicije)}</Pozicija>\n`;
      }
      xml += `          </PozicijeTiska>\n`;
      if (item.personalizacija_imena.length > 0) {
        xml += `          <Personalizacija>\n`;
        for (const ime of item.personalizacija_imena) {
          xml += `            <Ime>${escapeXml(ime)}</Ime>\n`;
        }
        xml += `          </Personalizacija>\n`;
      }
      xml += `        </Stavka>\n`;
    }

    xml += `      </Stavke>\n`;
    xml += `    </Racun>\n`;
  }

  xml += `  </Racuni>\n`;
  xml += `</DokumentiExport>\n`;
  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// EOD (End of Day) Text Shift Summary for Clipboard
export function generateEodShiftReport(orders: Order[]): string {
  const analytics = calculateAnalytics(orders);
  const now = new Date();

  let rep = `📋 DTF PRINT HUB — DNEVNI IZVJEŠTAJ SMJENE (EOD SUMMARY)\n`;
  rep += `========================================================\n`;
  rep += `Datum: ${now.toLocaleDateString("hr-HR")} | Vrijeme zaključenja: ${now.toLocaleTimeString("hr-HR")}\n`;
  rep += `Ukupno obrađenih naloga: ${analytics.totalOrders}\n`;
  rep += `Ukupni promet smjene: ${analytics.totalRevenue.toFixed(2)} EUR\n`;
  rep += `B2B nalozi: ${analytics.b2bOrdersCount} (${analytics.b2bPercentage}%) | B2C nalozi: ${analytics.b2cOrdersCount}\n`;
  rep += `--------------------------------------------------------\n`;
  rep += `📦 PROIZVODNI VOLUMEN:\n`;
  rep += `• Tekstilni artikli: ${analytics.totalGarments} kom\n`;
  rep += `• Promo artikli: ${analytics.totalPromo} kom\n`;
  rep += `• Ukupno tiskanih preslikača: ~${Math.round((analytics.totalGarments * 1.8) + (analytics.totalPromo * 1.0))} kom\n`;
  rep += `• Procijenjena potrošnja DTF filma (58cm): ~${((analytics.totalGarments + analytics.totalPromo) * 0.16).toFixed(2)} m\n`;
  rep += `--------------------------------------------------------\n`;
  rep += `🔝 NAJVEĆI KLIJENTI SMJENE:\n`;
  analytics.topClients.slice(0, 5).forEach((c, idx) => {
    rep += `${idx + 1}. ${c.name} — ${c.totalSpent.toFixed(2)} EUR (${c.itemsCount} kom)\n`;
  });
  rep += `--------------------------------------------------------\n`;
  rep += `⚠️ STATUS PRIPREMA & VIZUALA:\n`;
  const needVisual = orders.filter((o) => o.zahtijeva_vizual);
  const missingPrep = orders.filter((o) => o.nedostaje_priprema);
  rep += `• Nalozi koji čekaju odobrenje vizuala: ${needVisual.length} (${needVisual.map((o) => o.broj_racuna).join(", ") || "Nema"})\n`;
  rep += `• Nalozi s nedostajućom pripremom: ${missingPrep.length} (${missingPrep.map((o) => o.broj_racuna).join(", ") || "Nema"})\n`;
  rep += `========================================================\n`;
  rep += `Sustav: DTF Print Hub Engine v1.0 • Operater: Prepress Administrator\n`;

  return rep;
}
