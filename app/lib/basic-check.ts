import { LAWS } from "./laws";
import type { CheckResult, Violation } from "./types";

const RULES_CHECKED = 12;

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
      evidence,
      severity,
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

  // 3. Facebook Pixel
  const fbMatch = html.match(/connect\.facebook\.net|fbq\s*\(/i);
  if (fbMatch) {
    add("facebook-pixel", "Найден код Facebook Pixel", "high");
  }

  // 4. Ссылки на Meta-сервисы без пометки об экстремизме
  const metaLinkMatch = html.match(/<a\s[^>]*href=["'][^"']*(?:instagram\.com|facebook\.com)[^"']*["']/i);
  if (metaLinkMatch) {
    const hasDiclaimer = /экстремистск/i.test(html);
    if (!hasDiclaimer) {
      const domain = metaLinkMatch[0].includes("instagram") ? "instagram.com" : "facebook.com";
      add("meta-links", `Ссылка на ${domain} без пометки об экстремистской организации`, "medium");
    }
  }

  // 5. Политика конфиденциальности
  const privacyLink = /<a\s[^>]*>[^<]*(?:политика конфиденциальности|политика обработки|обработка персональных|privacy policy|privacy)[^<]*<\/a>/i.test(html);
  if (!privacyLink) {
    add("pd-policy", "На странице не найдено ссылок на политику конфиденциальности", "high");
  }

  // 6. Cookie-баннер
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

  // 7. SSL
  if (!url.startsWith("https://")) {
    add("ssl", "Сайт не использует HTTPS", "high");
  }

  // 8. Возрастная маркировка
  const hasAgeMarker = /\b(0|6|12|16|18)\+/.test(html);
  if (!hasAgeMarker) {
    add("age-marker", "На странице не найдена возрастная маркировка (0+, 6+, 12+, 16+, 18+)", "medium");
  }

  // 9. Навигация на иностранном языке
  const navMatches = html.match(/<(?:nav|header)[^>]*>([\s\S]*?)<\/(?:nav|header)>/gi) ?? [];
  const aMatches = html.match(/<a\s[^>]*>[\s\S]*?<\/a>/gi)?.slice(0, 5) ?? [];
  const navText = [...navMatches, ...aMatches].join(" ").replace(/<[^>]+>/g, " ");
  if (navText.trim().length > 20) {
    const cyrillicCount = (navText.match(/[а-яёА-ЯЁ]/g) ?? []).length;
    const letterCount = (navText.match(/[a-zA-Zа-яёА-ЯЁ]/g) ?? []).length;
    if (letterCount > 10 && cyrillicCount / letterCount < 0.2) {
      const sample = navText.replace(/\s+/g, " ").trim().slice(0, 80);
      add("lang-headers", `В навигации преобладают слова на иностранном языке: «${sample}»`, "medium");
    }
  }

  // 10. Англицизмы
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

  // 11. ИНН
  const hasInn = /ИНН\s*[:：]?\s*\d{10,12}/i.test(html);
  if (!hasInn) {
    add("req-inn", "На странице не найден ИНН организации", "low");
  }

  // 12. Трансграничная передача ПДн (если есть иностранные сервисы)
  const hasForeignService = gaMatch || gfMatch || fbMatch;
  if (hasForeignService) {
    add(
      "pd-cross-border",
      "Используются иностранные сервисы (Google/Meta) — нужно согласие на трансграничную передачу ПДн",
      "critical"
    );
  }

  const totalFineMin = violations.reduce((s, v) => s + v.fineMin, 0);
  const totalFineMax = violations.reduce((s, v) => s + v.fineMax, 0);
  const realisticFine = Math.round((totalFineMin + totalFineMax) / 2);
  const categoriesChecked = new Set(violations.map((v) => v.category)).size;

  return {
    url,
    checkedAt: new Date().toISOString(),
    mode: "quick",
    violations,
    totalFineMin,
    totalFineMax,
    realisticFine,
    rulesChecked: RULES_CHECKED,
    categoriesChecked,
  };
}
