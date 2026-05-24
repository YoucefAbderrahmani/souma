import type { ProductStructuredContent } from "@/lib/product-content";

export type LocalAnswerLocale = "ar" | "fr" | "en" | "dz";

export function formatAssistantPriceDa(value: number) {
  return `${new Intl.NumberFormat("en-US").format(value)} DA`;
}

export function detectLocalAnswerLocale(query: string): LocalAnswerLocale {
  const q = query.toLowerCase();
  if (/[\u0600-\u06ff]/.test(query)) return "ar";
  if (/(kayen|kayn|wa9tach|wesh|wach|chhal|bzzaf|machi)/i.test(q)) return "dz";
  if (/(disponible|couleur|taille|arrivage|quand|stock|prix|livraison|garantie)/i.test(q)) return "fr";
  return "en";
}

function localizeAnswer(locale: LocalAnswerLocale, key: string, vars?: Record<string, string>) {
  const templates: Record<LocalAnswerLocale, Record<string, string>> = {
    ar: {
      arrival_unknown: "موعد التوفر القادم غير مؤكد حالياً. يرجى التحقق لاحقاً.",
      colors_list: "الألوان المتوفرة: {{colors}}.",
      color_not_listed: "خيارات الألوان غير مذكورة لهذا المنتج.",
      color_yes: "نعم، اللون {{color}} متوفر.",
      color_no: "لا، اللون {{color}} غير متوفر لهذا المنتج.",
      option_yes: "نعم، خيار {{option}} متوفر ضمن {{spec}}.",
      options_list: "الخيارات المتوفرة: {{options}}",
      availability_yes: "نعم، هذا المنتج متوفر حالياً.",
      availability_status: "حالة التوفر الحالية: {{availability}}.",
      price: "السعر الحالي: {{price}}.",
      price_both: "سعر التجزئة: {{detail}}. سعر الجملة: {{jomla}}.",
      info_row: "{{key}}: {{value}}",
      info_unknown: "لا توجد معلومات محددة عن ذلك في صفحة المنتج.",
      promo_none: "لا يوجد عرض ترويجي مذكور لهذا المنتج حالياً.",
    },
    fr: {
      arrival_unknown: "Le prochain arrivage n'est pas encore confirmé. Revenez bientôt.",
      colors_list: "Couleurs disponibles : {{colors}}.",
      color_not_listed: "Les couleurs ne sont pas indiquées pour cet article.",
      color_yes: "Oui, la couleur {{color}} est disponible.",
      color_no: "Non, la couleur {{color}} n'est pas disponible pour cet article.",
      option_yes: "Oui, l'option {{option}} est disponible dans {{spec}}.",
      options_list: "Options disponibles : {{options}}",
      availability_yes: "Oui, cet article est actuellement disponible.",
      availability_status: "Disponibilite actuelle : {{availability}}.",
      price: "Prix actuel : {{price}}.",
      price_both: "Prix detail : {{detail}}. Prix jomla : {{jomla}}.",
      info_row: "{{key}} : {{value}}",
      info_unknown: "Aucune information precise sur ce point dans la fiche produit.",
      promo_none: "Aucune promotion indiquee pour cet article pour le moment.",
    },
    dz: {
      arrival_unknown: "الريستوك الجاي مازال ما تأكدش. عاود شيك من بعد.",
      colors_list: "الألوان لي كاينين: {{colors}}.",
      color_not_listed: "ألوان هاد المنتج ماهمش مذكورين.",
      color_yes: "ايه، اللون {{color}} كاين.",
      color_no: "لا، اللون {{color}} ماكانش فهاد المنتج.",
      option_yes: "ايه، الأوبشن {{option}} كاين فـ {{spec}}.",
      options_list: "الأوبشنز لي كاينين: {{options}}",
      availability_yes: "ايه، هاد السلعة كاينة حالياً.",
      availability_status: "الحالة الحالية للتوفر: {{availability}}.",
      price: "الثمن الحالي: {{price}}.",
      price_both: "ثمن التجزئة: {{detail}}. ثمن الجملة: {{jomla}}.",
      info_row: "{{key}}: {{value}}",
      info_unknown: "ما لقيناش معلومة واضحة على هاد الموضوع فالصفحة.",
      promo_none: "ماكاش عرض ترويجي مذكور دابا لهاد المنتج.",
    },
    en: {
      arrival_unknown: "Next arrival is not confirmed yet. Please check again soon.",
      colors_list: "Available colors: {{colors}}.",
      color_not_listed: "Color options are not listed for this item.",
      color_yes: "Yes, {{color}} color is available.",
      color_no: "No, {{color}} color is not available for this item.",
      option_yes: "Yes, {{option}} is available in {{spec}}.",
      options_list: "Available options: {{options}}",
      availability_yes: "Yes, this item is currently available.",
      availability_status: "Current availability: {{availability}}.",
      price: "Current price: {{price}}.",
      price_both: "Retail price: {{detail}}. Wholesale (jomla) price: {{jomla}}.",
      info_row: "{{key}}: {{value}}",
      info_unknown: "No specific information about that is listed on this product page.",
      promo_none: "No promotion is listed for this item right now.",
    },
  };

  let out = templates[locale][key] ?? templates.en[key] ?? "";
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      out = out.replaceAll(`{{${k}}}`, v);
    });
  }
  return out;
}

function findAdditionalInfoRow(
  rows: Array<{ key: string; value: string }>,
  keyPattern: RegExp
) {
  return rows.find((row) => keyPattern.test(row.key) || keyPattern.test(row.value));
}

export type AnswerProductQuestionInput = {
  rawQuery: string;
  parsedContent: ProductStructuredContent;
  availabilityLabel: string;
  detailPrice: number;
  jomlaPrice: number | null | undefined;
};

export function answerProductQuestionLocal(input: AnswerProductQuestionInput): string | null {
  const { rawQuery, parsedContent, availabilityLabel, detailPrice, jomlaPrice } = input;
  const q = rawQuery.toLowerCase().trim();
  const locale = detectLocalAnswerLocale(rawQuery);

  const isAvailabilityQuestion =
    /(available|availability|in stock|stock|disponible|dispo|متوفر|موجود|كاين|kayen|kayn)/i.test(q);
  const isColorQuestion = /(color|couleur|لون)/i.test(q);
  const isSizeOrSpecQuestion =
    /(size|taille|spec|specs|ram|storage|capacity|option|version|model|مقاس|حجم|نسخة|سعة|رام)/i.test(q);
  const isArrivalQuestion =
    /(arrival|arrive|restock|back in stock|when.*available|متى|وقتاش|امتى)/i.test(q);
  const isPriceQuestion =
    /(price|cost|how much|prix|combien|شحال|ثمن|budget|expensive|cheap)/i.test(q);
  const isDeliveryQuestion =
    /(delivery|shipping|ship|livraison|expedition|توصيل|شحن|yalidine)/i.test(q);
  const isWarrantyQuestion =
    /(warranty|guarantee|garantie|ضمان|retour|return policy|refund)/i.test(q);
  const isPromoQuestion =
    /(promo|promotion|discount|sale|solde|réduction|تخفيض|off\b|%-off)/i.test(q);

  if (isPriceQuestion) {
    const detail = formatAssistantPriceDa(detailPrice);
    if (jomlaPrice != null) {
      return localizeAnswer(locale, "price_both", {
        detail,
        jomla: formatAssistantPriceDa(jomlaPrice),
      });
    }
    return localizeAnswer(locale, "price", { price: detail });
  }

  if (isDeliveryQuestion) {
    const row = findAdditionalInfoRow(
      parsedContent.additionalInfo,
      /(delivery|shipping|livraison|expedition|توصيل|شحن)/i
    );
    return row
      ? localizeAnswer(locale, "info_row", { key: row.key, value: row.value })
      : localizeAnswer(locale, "info_unknown");
  }

  if (isWarrantyQuestion) {
    const row = findAdditionalInfoRow(
      parsedContent.additionalInfo,
      /(warranty|guarantee|garantie|ضمان|return|retour|refund)/i
    );
    return row
      ? localizeAnswer(locale, "info_row", { key: row.key, value: row.value })
      : localizeAnswer(locale, "info_unknown");
  }

  if (isPromoQuestion) {
    const row = findAdditionalInfoRow(
      parsedContent.additionalInfo,
      /(promo|promotion|discount|sale|solde|off|تخفيض)/i
    );
    return row
      ? localizeAnswer(locale, "info_row", { key: row.key, value: row.value })
      : localizeAnswer(locale, "info_unknown");
  }

  if (isArrivalQuestion) {
    const arrivalRow = parsedContent.additionalInfo.find((row) =>
      /(arrival|restock|availability|arrivage|next)/i.test(row.key)
    );
    return arrivalRow
      ? `${arrivalRow.key}: ${arrivalRow.value}`
      : localizeAnswer(locale, "arrival_unknown");
  }

  const colors = parsedContent.colors.map((c) => c.name.toLowerCase());
  const mentionedColor = colors.find((color) => q.includes(color));
  if (isColorQuestion || mentionedColor) {
    if (!mentionedColor) {
      return colors.length
        ? localizeAnswer(locale, "colors_list", {
            colors: parsedContent.colors.map((c) => c.name).join(", "),
          })
        : localizeAnswer(locale, "color_not_listed");
    }
    return colors.includes(mentionedColor)
      ? localizeAnswer(locale, "color_yes", { color: mentionedColor })
      : localizeAnswer(locale, "color_no", { color: mentionedColor });
  }

  if (isSizeOrSpecQuestion) {
    const allOptions = parsedContent.specifications.flatMap((spec) =>
      spec.options.map((opt) => ({ specName: spec.name, label: opt.label.toLowerCase() }))
    );
    const matchedOption = allOptions.find((opt) => q.includes(opt.label));
    if (matchedOption) {
      return localizeAnswer(locale, "option_yes", {
        option: matchedOption.label,
        spec: matchedOption.specName,
      });
    }

    if (parsedContent.specifications.length > 0) {
      const quickSpecs = parsedContent.specifications
        .map((spec) => `${spec.name}: ${spec.options.map((o) => o.label).join(", ")}`)
        .join(" | ");
      return localizeAnswer(locale, "options_list", { options: quickSpecs });
    }
  }

  if (isAvailabilityQuestion) {
    return /in stock/i.test(availabilityLabel)
      ? localizeAnswer(locale, "availability_yes")
      : localizeAnswer(locale, "availability_status", { availability: availabilityLabel });
  }

  return null;
}

export const PRODUCT_PAGE_SUGGESTED_QUESTIONS: Record<LocalAnswerLocale, string[]> = {
  en: ["Is it in stock?", "Available colors?", "What is the price?", "Delivery info?"],
  fr: ["Est-ce disponible ?", "Couleurs disponibles ?", "Quel est le prix ?", "Livraison ?"],
  ar: ["هل متوفر؟", "ما الألوان المتوفرة؟", "كم السعر؟", "معلومات التوصيل؟"],
  dz: ["واش كاين؟", "شنو الألوان لي كاينين؟", "شحال الثمن؟", "التوصيل؟"],
};

export const STORE_SUGGESTED_QUESTIONS: Record<LocalAnswerLocale, string[]> = {
  en: ["Laptop under 100k", "Best rated phone", "Wireless headphones", "Gaming mouse"],
  fr: ["PC portable pas cher", "Meilleur telephone", "Casque sans fil", "Souris gaming"],
  ar: ["لابتوب رخيص", "أفضل هاتف", "سماعة لاسلكية", "ماوس ألعاب"],
  dz: ["pc portable ma ghali", "meilleur telephone", "casque bluetooth", "souris gaming"],
};
