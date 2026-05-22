const TSHIRT_TITLE_RE = /t[\s-]*shirtt?|t-shirt|tee[\s-]*shirt/i;
const BLACK_COLOR_RE = /noir|noire|black|anthracite/i;
const AIR_JORDAN_TITLE_RE = /air\s*jordan|jordan\s*(retro|\d+)/i;
const AIRPODS_TITLE_RE = /air\s*pods?|airpods|ear\s*pods?/i;

function isTShirtProduct(title: string): boolean {
  return TSHIRT_TITLE_RE.test(title.trim());
}

function isAirJordanProduct(title: string): boolean {
  return AIR_JORDAN_TITLE_RE.test(title.trim());
}

function isAirPodsProduct(title: string): boolean {
  return AIRPODS_TITLE_RE.test(title.trim());
}

function isBlackColor(colorName: string | null | undefined): boolean {
  if (!colorName?.trim()) return false;
  return BLACK_COLOR_RE.test(colorName.trim());
}

/**
 * PDP / catalog image fit — T-shirt photos (especially black) use contain + padding so the
 * garment is less cropped than the default cover fill.
 */
export function resolveProductImageClassNames(
  productTitle: string,
  options?: { colorName?: string | null; surface?: "card" | "pdp" | "thumb" }
): string {
  const surface = options?.surface ?? "pdp";
  const tshirt = isTShirtProduct(productTitle);
  const black = isBlackColor(options?.colorName);

  if (tshirt && black) {
    if (surface === "thumb") return "object-contain object-center p-[18%]";
    if (surface === "card") return "object-contain object-center p-[14%]";
    return "object-contain object-center p-[14%] sm:p-[16%]";
  }

  if (tshirt) {
    if (surface === "thumb") return "object-contain object-center p-[12%]";
    if (surface === "card") return "object-contain object-center p-[10%]";
    return "object-contain object-center p-[10%] sm:p-[12%]";
  }

  if (isAirJordanProduct(productTitle)) {
    if (surface === "thumb") return "object-cover object-[center_34%]";
    if (surface === "card") return "object-cover object-[center_36%]";
    return "object-cover object-[center_32%] sm:object-[center_30%]";
  }

  if (isAirPodsProduct(productTitle)) {
    if (surface === "thumb") return "object-contain object-center p-[10%]";
    if (surface === "card") return "object-contain object-center p-[8%]";
    return "object-contain object-center p-[8%] sm:p-[10%]";
  }

  if (surface === "card") return "object-cover object-center";
  if (surface === "thumb") return "object-cover object-center";
  return "object-contain object-center";
}
