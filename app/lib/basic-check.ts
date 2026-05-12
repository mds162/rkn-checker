import { LAWS } from "./laws";
import { detectCommercial } from "./commercial-detector";
import type { CheckResult, PassedRule, Violation } from "./types";

const QUICK_RULE_IDS = [
  "google-analytics",
  "google-fonts",
  "meta-ads-pixel",
  "meta-logo",
  "meta-links-text",
  "pd-policy",
  "cookie-banner",
  "ssl",
  "lang-headers",
  "lang-anglicisms",
  "requisites-missing",
  "contacts-missing",
  "pd-cross-border",
];

const RULES_CHECKED = QUICK_RULE_IDS.length;

export function basicCheckHtml(url: string, html: string): CheckResult {
  const violations: Violation[] = [];

  function add(id: string, evidence: string, severity: Violation["severity"]) {
    const rule = LAWS.find((l) => l.id === id);
    if (!rule) return;
    violations.push({
      id: rule.id,
      category: rule.category,
      title: rule.title,
      law: rule.law,
      fineMin: rule.fineMin,
      fineMax: rule.fineMax,
      fineMinIp: rule.fineMinIp,
      fineMaxIp: rule.fineMaxIp,
      evidence,
      severity,
      realRiskLevel: rule.realRiskLevel,
      enforcementNote: rule.enforcementNote,
    });
  }

  // 1. Google Analytics
  const gaMatch = html.match(/google-analytics\.com|googletagmanager\.com|gtag\s*\(|ga\s*\(\s*['"]create['"]/i);
  if (gaMatch) {
    add("google-analytics", `Найден код Google Analytics: «${gaMatch[0].slice(0, 80)}»`, "critical");
  }

  // 2. Google Fonts
  const gfMatch = html.match(/fonts\.googleapis\.com|fonts\.gstatic\.com/i);
  if (gfMatch) {
    add("google-fonts", `Найдена ссылка на Google Fonts: «${gfMatch[0]}»`, "high");
  }

  // 3. Meta Ads Pixel (бывший facebook-pixel) — HIGH риск
  const fbPixelMatch = html.match(/connect\.facebook\.net|fbq\s*\(/i);
  if (fbPixelMatch) {
    add("meta-ads-pixel", "Найден код Facebook/Meta Pixel — индикатор рекламной активности в запрещённой соцсети", "critical");
  }

  // 4. Meta Logo — логотипы/иконки Instagram/Facebook — HIGH риск
  const metaLogoMatch = html.match(
    /fa-instagram|fa-facebook|bi-instagram|bi-facebook|icon-instagram|icon-facebook|fab fa-instagram|fab fa-facebook|instagram\.svg|instagram\.png|instagram\.webp|facebook\.svg|facebook\.png|facebook\.webp|\/ig\.svg|\/fb\.svg|ig-icon|fb-icon|aria-label=["']Instagram["']|aria-label=["']Facebook["']|<title[^>]*>Instagram|<title[^>]*>Facebook/i
  );
  if (metaLogoMatch) {
    add("meta-logo", `Найдена символика Meta (логотип/иконка): «${metaLogoMatch[0].slice(0, 80)}»`, "high");
  }

  // 5. Текстовые упоминания Instagram/Facebook без пометки об экстремизме — LOW риск
  // Ищем только в видимом тексте — вырезаем скрипты/стили перед поиском
  const htmlNoScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  const metaTextMatch = htmlNoScripts.match(/>([^<]*(?:instagram|facebook)[^<]*)</i);
  if (metaTextMatch) {
    const textContext = metaTextMatch[1];
    const isFilePath = /\.(svg|png|jpg|webp|js|css)/i.test(textContext);
    if (!isFilePath) {
      const surroundingStart = Math.max(0, htmlNoScripts.indexOf(metaTextMatch[0]) - 500);
      const surrounding = htmlNoScripts.slice(surroundingStart, surroundingStart + 1000);
      const hasDisclaimer = /экстремистск|запрещена|признана экстремистской/i.test(surrounding);
      if (!hasDisclaimer) {
        add("meta-links-text", `Упоминание Meta-сервиса без пометки об экстремизме: «${textContext.trim().slice(0, 80)}»`, "low");
      }
    }
  }

  // 6. Политика конфиденциальности
  const privacyLink = /<a\s[^>]*>[^<]*(?:политика конфиденциальности|политика обработки|обработка персональных|privacy policy|privacy)[^<]*<\/a>/i.test(html);
  if (!privacyLink) {
    add("pd-policy", "На странице не найдено ссылок на политику конфиденциальности", "medium");
  }

  // 7. Cookie-баннер
  const hasCookieWord = /cookie|куки/i.test(html);
  if (hasCookieWord) {
    const cookieIdx = html.search(/cookie|куки/i);
    const nearby = html.slice(Math.max(0, cookieIdx - 300), cookieIdx + 300);
    const hasConsent = /принять|согласен|ок\b|понятно|accept/i.test(nearby);
    if (!hasConsent) {
      add("cookie-banner", "Не найден баннер согласия на cookies", "high");
    }
  } else {
    add("cookie-banner", "Не найден баннер согласия на cookies", "high");
  }

  // 8. SSL
  if (!url.startsWith("https://")) {
    add("ssl", "Сайт не использует HTTPS", "high");
  }

  // 10. Навигация на иностранном языке
  const stripTagsAndCode = (s: string) =>
    s.replace(/<style[\s\S]*?<\/style>/gi, "")
     .replace(/<script[\s\S]*?<\/script>/gi, "")
     .replace(/<[^>]+>/g, " ")
     .replace(/[{};:#.@][\s\S]{0,200}/g, " ") // остатки CSS/JS
     .replace(/\s+/g, " ")
     .trim();

  const navMatches = html.match(/<(?:nav|header)[^>]*>([\s\S]*?)<\/(?:nav|header)>/gi) ?? [];
  const aMatches = html.match(/<a\s[^>]*>[\s\S]*?<\/a>/gi)?.slice(0, 10) ?? [];
  const navText = stripTagsAndCode([...navMatches, ...aMatches].join(" "));

  if (navText.length > 20) {
    const cyrillicCount = (navText.match(/[а-яёА-ЯЁ]/g) ?? []).length;
    const letterCount = (navText.match(/[a-zA-Zа-яёА-ЯЁ]/g) ?? []).length;
    if (letterCount > 10 && cyrillicCount / letterCount < 0.2) {
      const sample = navText.slice(0, 80);
      add("lang-headers", `В навигации преобладают слова на иностранном языке: «${sample}»`, "medium");
    }
  }

  // 11. Англицизмы
  const anglicismWords = ["sale", "new", "premium", "contact us", "subscribe", "buy now", "more info"];
  const foundAnglicisms: string[] = [];
  const uiTags = html.match(/<(?:button|h1|h2)[^>]*>[\s\S]*?<\/(?:button|h1|h2)>|<a\s[^>]*class=["'][^"']*btn[^"']*["'][^>]*>[\s\S]*?<\/a>/gi) ?? [];
  const uiText = uiTags.join(" ").replace(/<[^>]+>/g, " ").toLowerCase();
  for (const word of anglicismWords) {
    if (uiText.includes(word)) foundAnglicisms.push(word);
  }
  if (foundAnglicisms.length >= 2) {
    add("lang-anglicisms", `Найдены англицизмы: ${foundAnglicisms.join(", ")}`, "medium");
  }

  // 12. Реквизиты юр.лица (ИНН + ОГРН + название)
  const innRegex = /\bИНН[:\s]*(\d{10}|\d{12})\b/i;
  const ogrnRegex = /\bОГРН(?:ИП)?[:\s]*(\d{13}|\d{15})\b/i;
  const legalNameRegex = /\b(ООО|АО|ПАО|ИП|ОАО|ЗАО)\s+["«][^"»]{2,}["»]/;
  const hasInn = innRegex.test(html);
  const hasOgrn = ogrnRegex.test(html);
  const hasLegalName = legalNameRegex.test(html);
  if (!hasInn || !hasOgrn || !hasLegalName) {
    const missing = [
      !hasInn && "ИНН",
      !hasOgrn && "ОГРН",
      !hasLegalName && "название юр.лица (ООО/ИП/АО)"
    ].filter(Boolean).join(", ");
    add("requisites-missing", `Не найдено на странице: ${missing}`, "low");
  }

  // 13. Контакты (телефон или email)
  const phoneRegex = /(?:\+7|8)[\s\-()]?\d{3}[\s\-()]?\d{3}[\s\-()]?\d{2}[\s\-()]?\d{2}/;
  const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  if (!phoneRegex.test(html) && !emailRegex.test(html)) {
    add("contacts-missing", "Не найден ни телефон, ни email на главной странице", "low");
  }

  // 14. Трансграничная передача ПДн (если есть иностранные сервисы)
  const hasForeignService = gaMatch || gfMatch || fbPixelMatch;
  if (hasForeignService) {
    add(
      "pd-cross-border",
      "Используются иностранные сервисы (Google/Meta) — нужно согласие на трансграничную передачу ПДн",
      "critical"
    );
  }

  // 15. ЗоЗПП-проверки (только для коммерческих сайтов)
  const commercial = detectCommercial(html);
  if (commercial.isCommercial) {
    const rubPriceRegex = /(\d[\d\s]{0,10})\s*(₽|руб\.?|RUB)/;
    const foreignCurrencyRegex = /(\d[\d\s]{0,10})\s*(\$|€|USD|EUR|у\.\s?е\.)/;
    if (foreignCurrencyRegex.test(html) && !rubPriceRegex.test(html)) {
      add("prices-currency", "Найдены цены в иностранной валюте без рублёвого эквивалента", "low");
    }

    if (!/<a[^>]*>[^<]*(?:оферт|условия использования|пользовательское соглашение|публичный договор)/i.test(html)) {
      add("offer-missing", "На сайте не найдена ссылка на оферту или условия продажи", "low");
    }

    const hasEcommerceSignal = commercial.signals.some(
      (s) => s.includes("корзин") || s.includes("e-commerce") || s.includes("Элементы корзины")
    );
    if (hasEcommerceSignal) {
      if (!/<a[^>]*>[^<]*(?:возврат|обмен|гарантия товар)/i.test(html)) {
        add("return-policy-missing", "Не найдена страница с условиями возврата товара", "low");
      }
    }
  }

  const violatedIds = new Set(violations.map((v) => v.id));
  const passed: PassedRule[] = QUICK_RULE_IDS
    .filter((id) => !violatedIds.has(id))
    .map((id) => {
      const rule = LAWS.find((l) => l.id === id)!;
      return { id: rule.id, category: rule.category, title: rule.title };
    });

  const totalFineMin = violations.reduce((s, v) => s + v.fineMin, 0);
  const totalFineMax = violations.reduce((s, v) => s + v.fineMax, 0);
  const realisticFine = Math.round((totalFineMin + totalFineMax) / 2);
  const categoriesChecked = new Set(violations.map((v) => v.category)).size;

  return {
    url,
    checkedAt: new Date().toISOString(),
    mode: "quick",
    violations,
    passed,
    totalFineMin,
    totalFineMax,
    realisticFine,
    rulesChecked: RULES_CHECKED,
    categoriesChecked,
  };
}
