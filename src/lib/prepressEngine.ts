import { Order, GangSheetItem, GangSheetPage } from "../types";

export const ROLL_WIDTH_CM = 58.0;
export const PRINTABLE_WIDTH_CM = 55.0;
export const MARGIN_CM = 1.5;
export const SPACING_CM = 1.5;
export const MAX_PAGE_HEIGHT_CM = 490.0;

export function isColorDark(colorName?: string): boolean {
  if (!colorName) return true;
  const lower = colorName.toLowerCase();
  if (
    lower.includes("bijel") ||
    lower.includes("white") ||
    lower.includes("natur") ||
    lower.includes("bež") ||
    lower.includes("bez") ||
    lower.includes("žut") ||
    lower.includes("svijetlo") ||
    lower.includes("light")
  ) {
    return false;
  }
  return true;
}

export function calculateGangSheetNesting(orders: Order[]): GangSheetPage[] {
  const pages: GangSheetPage[] = [
    {
      pageIndex: 1,
      widthCm: ROLL_WIDTH_CM,
      maxHeightCm: MAX_PAGE_HEIGHT_CM,
      usedHeightCm: 0,
      itemsCount: 0,
      items: [],
    },
  ];

  let currentPageIdx = 0;
  let currentX = MARGIN_CM;
  let currentY = MARGIN_CM;
  let currentLineHeight = 0;

  let globalItemIndex = 0;

  // Flatten all items across orders, multiplying by quantity
  for (let orderIdx = 0; orderIdx < orders.length; orderIdx++) {
    const order = orders[orderIdx];
    for (let itemIdx = 0; itemIdx < order.artikli.length; itemIdx++) {
      const item = order.artikli[itemIdx];
      const isDark = isColorDark(item.boja);
      const cmykMode = isDark ? "white_underbase" : "pure_black";

      // Each item has positions (e.g. srce, leđa)
      for (let posIdx = 0; posIdx < item.pozicije_tiska.length; posIdx++) {
        const pos = item.pozicije_tiska[posIdx];
        const itemWidth = pos.sirina_cm || 9.0;
        const itemHeight = pos.visina_cm || (pos.sirina_cm * 0.8) || 7.2;

        // Repeat for each ordered garment
        for (let q = 0; q < item.kolicina; q++) {
          globalItemIndex++;
          // Check if item fits in current line
          if (currentX + itemWidth > MARGIN_CM + PRINTABLE_WIDTH_CM) {
            // Move to next line
            currentX = MARGIN_CM;
            currentY += currentLineHeight + SPACING_CM;
            currentLineHeight = 0;
          }

          // Check if exceeds page height (4.9m limit)
          if (currentY + itemHeight > MAX_PAGE_HEIGHT_CM - MARGIN_CM) {
            // Finish current page
            pages[currentPageIdx].usedHeightCm = Math.max(pages[currentPageIdx].usedHeightCm, currentY);
            // Create new page
            currentPageIdx++;
            pages.push({
              pageIndex: currentPageIdx + 1,
              widthCm: ROLL_WIDTH_CM,
              maxHeightCm: MAX_PAGE_HEIGHT_CM,
              usedHeightCm: 0,
              itemsCount: 0,
              items: [],
            });
            currentX = MARGIN_CM;
            currentY = MARGIN_CM;
            currentLineHeight = 0;
          }

          const gangItem: GangSheetItem = {
            id: `gang-${order.broj_racuna}-${itemIdx}-${posIdx}-${q}-${globalItemIndex}`,
            invoiceNumber: order.broj_racuna,
            clientName: order.naziv_klijenta,
            itemName: item.naziv_artikla,
            color: item.boja || "Crna",
            positionName: pos.naziv_pozicije,
            widthCm: itemWidth,
            heightCm: itemHeight,
            xCm: currentX,
            yCm: currentY,
            pageIndex: currentPageIdx + 1,
            shirtColorIsDark: isDark,
            cmykMode: cmykMode,
            textFallback: item.tekst_za_tisak || `${order.naziv_klijenta.substring(0, 14)}`,
          };

          pages[currentPageIdx].items.push(gangItem);
          pages[currentPageIdx].itemsCount++;

          currentLineHeight = Math.max(currentLineHeight, itemHeight);
          pages[currentPageIdx].usedHeightCm = Math.max(pages[currentPageIdx].usedHeightCm, currentY + itemHeight + MARGIN_CM);

          currentX += itemWidth + SPACING_CM;
        }
      }
    }
  }

  return pages;
}
