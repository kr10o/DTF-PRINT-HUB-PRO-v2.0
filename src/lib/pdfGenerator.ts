import jsPDF from "jspdf";
import "jspdf-autotable";
import { Order, AggregatedWarehouseItem } from "../types";
import { ROLL_WIDTH_CM, calculateGangSheetNesting } from "./prepressEngine";

export function generateWarehousePickListPDF(orders: Order[]): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Aggregate items
  const aggMap: Record<string, AggregatedWarehouseItem> = {};
  let grandTotalUnits = 0;
  const missingPrepOrVisualAlerts: { invoice: string; client: string; issue: string }[] = [];

  for (const order of orders) {
    if (order.zahtijeva_vizual) {
      missingPrepOrVisualAlerts.push({
        invoice: order.broj_racuna,
        client: order.naziv_klijenta,
        issue: "Zahtijeva odobrenje vizuala prije tiska",
      });
    }
    if (order.nedostaje_priprema) {
      missingPrepOrVisualAlerts.push({
        invoice: order.broj_racuna,
        client: order.naziv_klijenta,
        issue: "Nedostaje vektorska grafička priprema",
      });
    }

    for (const item of order.artikli) {
      const key = `${item.naziv_artikla}__${item.boja || "N/A"}__${item.velicina || "N/A"}__${item.kategorija}`;
      if (!aggMap[key]) {
        aggMap[key] = {
          naziv_artikla: item.naziv_artikla,
          boja: item.boja || "-",
          velicina: item.velicina || "-",
          kategorija: item.kategorija,
          ukupno_komada: 0,
          narudzbe_popis: [],
        };
      }
      aggMap[key].ukupno_komada += item.kolicina;
      if (!aggMap[key].narudzbe_popis.includes(order.broj_racuna)) {
        aggMap[key].narudzbe_popis.push(order.broj_racuna);
      }
      grandTotalUnits += item.kolicina;
    }
  }

  const itemsList = Object.values(aggMap).sort((a, b) => b.ukupno_komada - a.ukupno_komada);

  // Header styling
  doc.setFillColor(14, 16, 23);
  doc.rect(0, 0, 210, 36, "F");

  doc.setFillColor(79, 195, 247);
  doc.rect(0, 35, 210, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DTF PRINT HUB — SKLADIŠNA PICK-LISTA", 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 210, 240);
  doc.text(`Datum generiranja: ${new Date().toLocaleDateString("hr-HR")} ${new Date().toLocaleTimeString("hr-HR")}`, 14, 24);
  doc.text(`Broj aktivnih naloga: ${orders.length} | Ukupno komada za izuzimanje: ${grandTotalUnits} kom`, 14, 30);

  // Summary box
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(14, 42, 182, 16, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(2, 136, 209);
  doc.text(`SAŽETAK SMJENE: UKUPNO ${grandTotalUnits} ARTIKALA ZA TISKARSKU PRIPREMU`, 18, 52);

  // Table rows
  const tableData = itemsList.map((item, idx) => [
    (idx + 1).toString(),
    item.naziv_artikla,
    item.boja,
    item.velicina,
    item.kategorija,
    `${item.ukupno_komada} kom`,
    item.narudzbe_popis.join(", "),
  ]);

  // @ts-ignore
  doc.autoTable({
    startY: 62,
    head: [["#", "Naziv Artikla", "Boja", "Veličina", "Kategorija", "Količina", "Računi"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [14, 16, 23],
      textColor: [79, 195, 247],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 26 },
      3: { cellWidth: 20 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22, fontStyle: "bold", textColor: [2, 136, 209] },
      6: { cellWidth: 29 },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY || 180;

  // Alerts section
  if (missingPrepOrVisualAlerts.length > 0 && finalY < 240) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(14, finalY + 8, 182, 24 + missingPrepOrVisualAlerts.length * 5, 2, 2, "FD");

    doc.setTextColor(185, 28, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("⚠️ UPOZORENJA ZA PREPRESS & ODJEL PRODAJE:", 18, finalY + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(153, 27, 27);
    missingPrepOrVisualAlerts.forEach((alert, i) => {
      doc.text(`• Račun ${alert.invoice} (${alert.client}): ${alert.issue}`, 20, finalY + 23 + i * 5);
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 165);
    doc.text(
      `DTF Print Hub Prepress Inženjering • Stranica ${i} od ${pageCount} • Dokument verificiran za pogon`,
      105,
      290,
      { align: "center" }
    );
  }

  return doc;
}

export function generateDTFRollPrepressPDF(orders: Order[]): jsPDF {
  const pages = calculateGangSheetNesting(orders);
  const totalUsedHeightCm = pages[0]?.usedHeightCm || 50;

  // 580mm width, dynamic height mm
  const rollWidthMm = 580;
  const rollHeightMm = Math.min(Math.max(totalUsedHeightCm * 10, 400), 4900);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [rollWidthMm, rollHeightMm],
  });

  // Roll Dark Prepress Film Canvas
  doc.setFillColor(11, 13, 20);
  doc.rect(0, 0, rollWidthMm, rollHeightMm, "F");

  // Rulers & Safe Margin Lines (15mm)
  doc.setDrawColor(79, 195, 247);
  doc.setLineWidth(0.5);
  doc.line(15, 0, 15, rollHeightMm);
  doc.line(rollWidthMm - 15, 0, rollWidthMm - 15, rollHeightMm);

  // Prepress Header Bar
  doc.setFillColor(14, 16, 23);
  doc.rect(15, 10, rollWidthMm - 30, 24, "F");
  doc.setTextColor(79, 195, 247);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DTF GANG SHEET 58CM — INDUSTRIJSKA ROLA ZA RIP", 25, 24);

  doc.setTextColor(220, 230, 245);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Širina role: 58.0 cm (Iskoristivo: 55.0 cm) | Visina: ${(rollHeightMm / 10).toFixed(1)} cm | Datum: ${new Date().toLocaleDateString("hr-HR")}`, 25, 30);

  // Render gang items
  pages[0]?.items.forEach((item) => {
    const xMm = item.xCm * 10;
    const yMm = item.yCm * 10 + 35;
    const wMm = item.widthCm * 10;
    const hMm = item.heightCm * 10;

    // Item boundary
    doc.setFillColor(20, 24, 36);
    doc.setDrawColor(79, 195, 247);
    doc.setLineWidth(0.3);
    doc.roundedRect(xMm, yMm, wMm, hMm, 2, 2, "FD");

    // CMYK Color Tag
    if (item.shirtColorIsDark) {
      doc.setFillColor(255, 255, 255);
      doc.setTextColor(10, 12, 18);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CMYK 0,0,1,0 (White Underbase)", xMm + 4, yMm + 8);
    } else {
      doc.setFillColor(30, 30, 30);
      doc.setTextColor(79, 195, 247);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CMYK 0,0,0,100 (Pure Black)", xMm + 4, yMm + 8);
    }

    doc.setTextColor(220, 230, 245);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${item.clientName.substring(0, 18)} (${item.invoiceNumber})`, xMm + 4, yMm + 14);
    doc.text(`${item.positionName} - ${item.widthCm}cm`, xMm + 4, yMm + 19);

    // Vector Text / Graphic Preview with Pillow emulation
    const previewBoxW = Math.max(wMm - 8, 10);
    const previewBoxH = Math.max(hMm - 24, 8);
    doc.setDrawColor(79, 195, 247);
    doc.setFillColor(10, 13, 20);
    doc.rect(xMm + 4, yMm + 22, previewBoxW, previewBoxH, "FD");

    // Render Vector Text simulating Pillow ImageDraw.multiline_text
    const textToPrint = item.textFallback || item.clientName;
    if (item.shirtColorIsDark) {
      doc.setTextColor(255, 255, 255); // White underbase
    } else {
      doc.setTextColor(20, 20, 25); // 100% K Black
    }
    doc.setFont("helvetica", "bold");
    
    // Auto-fit font size based on Pillow textbbox logic
    const baseFontSize = Math.min(Math.max(wMm / (textToPrint.length * 0.55), 7), 16);
    doc.setFontSize(baseFontSize);
    doc.text(textToPrint, xMm + 6, yMm + 22 + (previewBoxH / 2) + 2);
  });

  return doc;
}

export function generatePillowVectorTextPDF(
  text: string = "DTF PRINT HUB",
  widthCm: number = 26.0,
  heightCm: number = 20.0,
  isDarkShirt: boolean = true,
  strokeWidth: number = 0
): jsPDF {
  const wMm = widthCm * 10;
  const hMm = heightCm * 10;

  const doc = new jsPDF({
    orientation: wMm > hMm ? "landscape" : "portrait",
    unit: "mm",
    format: [wMm + 20, hMm + 20],
  });

  // Dark Prepress film background
  doc.setFillColor(14, 16, 23);
  doc.rect(0, 0, wMm + 20, hMm + 20, "F");

  // Border & Grid
  doc.setDrawColor(79, 195, 247);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, wMm, hMm, "S");

  // CMYK Info Badge
  doc.setFillColor(20, 24, 36);
  doc.rect(10, 10, wMm, 12, "F");
  doc.setTextColor(79, 195, 247);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`PILLOW 300 DPI VECTOR TEXT PREP • ${widthCm}x${heightCm} cm • ${isDarkShirt ? "CMYK 0,0,1,0 (WHITE UNDERBASE)" : "CMYK 0,0,0,100 (BLACK)"}`, 14, 18);

  // Vector Text rendering with auto-scaling
  if (isDarkShirt) {
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setTextColor(20, 20, 25);
  }
  
  const calculatedFontSize = Math.min(Math.max((wMm * 2.2) / text.length, 12), 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(calculatedFontSize);
  doc.text(text, 10 + (wMm / 2), 10 + (hMm / 2) + (calculatedFontSize * 0.15), { align: "center" });

  return doc;
}

