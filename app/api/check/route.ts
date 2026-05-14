import { NextResponse } from "next/server";
import { fetchSiteHtml, normalizeUrl, toDisplayUrl } from "@/app/lib/fetch-site";
import { fetchSitePages } from "@/app/lib/fetch-pages";
import { analyzeWithClaude } from "@/app/lib/claude";
import { basicCheckHtml } from "@/app/lib/basic-check";
import { detectCmp } from "@/app/lib/cmp-detector";
import { analyzeForms } from "@/app/lib/form-analyzer";
import { detectSpa } from "@/app/lib/spa-detector";

export const runtime = "nodejs";
export const maxDuration = 60;

// Matches link text
const CONTACTS_TEXT_KW = [
  "контакты", "контакт", "о компании", "о нас", "реквизиты",
  "about", "contacts", "contact", "о фирме", "о магазине",
  "наша компания", "связаться", "связь", "написать нам",
  "адрес", "телефон", "где мы", "как нас найти",
];

// Matches href path segment (case-insensitive)
const CONTACTS_HREF_RE =
  /\/(kontakty|kontakt|contact|contacts|about|about-us|aboutus|o-nas|o-kompanii|o-sebe|o-firme|rekvizity|requisites|company|info|corporate|svyaz|svyazatsya|nashi-kontakty|our-contacts|reach-us)(\/|\.|\?|$)/i;

const CONTACTS_PROBE_PATHS = [
  // Русская транслитерация
  "/kontakty", "/kontakty/", "/kontakt", "/kontakt/",
  "/nashi-kontakty", "/nashi-kontakty/",
  "/adres", "/adres/", "/adresa", "/adresa/",
  "/o-nas", "/o-nas/", "/o-kompanii", "/o-kompanii/",
  "/o-sebe", "/o-sebe/", "/o-firme", "/o-firme/",
  "/rekvizity", "/rekvizity/",
  "/svyaz", "/svyaz/", "/svyazatsya", "/svyazatsya/",
  // Английские варианты
  "/contacts", "/contacts/", "/contact", "/contact/",
  "/contact-us", "/contact-us/", "/cont", "/cont/",
  "/address", "/address/",
  "/about", "/about/", "/about-us", "/about-us/",
  "/our-contacts", "/our-contacts/", "/we", "/we/",
  "/reach-us", "/reach-us/", "/get-in-touch", "/get-in-touch/",
  // Прочие
  "/info", "/info/", "/company", "/company/",
  "/requisites", "/requisites/",
];

async function fetchUrl(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return undefined;
    return (await res.text()).slice(0, 200_000);
  } catch {
    return undefined;
  }
}

async function fetchContactsPage(html: string, baseUrl: string): Promise<string | undefined> {
  const parts: string[] = [];
  const fetched = new Set<string>();

  // 1. Ищем все подходящие ссылки на контакты в HTML (до 3 штук)
  const re = /<a\s[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const candidates: string[] = [];
  while ((m = re.exec(html)) !== null && candidates.length < 3) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, " ").trim().toLowerCase();
    const matchesText = CONTACTS_TEXT_KW.some((kw) => text.includes(kw));
    const matchesHref = CONTACTS_HREF_RE.test(href);
    if (matchesText || matchesHref) {
      try {
        const u = new URL(href, baseUrl).href;
        if (u !== baseUrl && !fetched.has(u)) candidates.push(u);
      } catch { /* skip */ }
    }
  }

  for (const u of candidates) {
    const result = await fetchUrl(u);
    if (result) { parts.push(result); fetched.add(u); }
  }

  // 2. Всегда проверяем приоритетные пути (реквизиты/контакты могут быть на другой странице)
  const origin = new URL(baseUrl).origin;
  for (const path of CONTACTS_PROBE_PATHS) {
    const probeUrl = origin + path;
    if (probeUrl === baseUrl || fetched.has(probeUrl)) continue;
    const result = await fetchUrl(probeUrl);
    if (result) {
      parts.push(result);
      fetched.add(probeUrl);
      break;
    }
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

export async function POST(req: Request) {
  let url = "";
  let mode: "quick" | "pro" = "quick";

  try {
    const body = (await req.json()) as { url?: string; mode?: string };
    if (!body.url) {
      return NextResponse.json({ error: "URL не указан" }, { status: 400 });
    }
    url = normalizeUrl(body.url);
    if (body.mode === "pro") mode = "pro";
  } catch {
    return NextResponse.json({ error: "Некорректный адрес сайта" }, { status: 400 });
  }

  if (mode === "pro") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI-режим временно недоступен: API-ключ не настроен" },
        { status: 503 }
      );
    }
    try {
      const pages = await fetchSitePages(url);
      const cmp = detectCmp(pages.homepage.html);
      const forms = analyzeForms(pages.homepage.html);
      const result = await analyzeWithClaude(pages, cmp, forms, apiKey);
      const spa = detectSpa(pages.homepage.html);
      if (spa.isLikelySpa) {
        result.spaDetected = true;
        result.warnings = [
          "Сайт использует JavaScript-рендеринг, часть проверок может быть неточной. Точная проверка таких сайтов появится в Pro+ режиме.",
        ];
      }
      return NextResponse.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Неизвестная ошибка";
      return NextResponse.json(
        { error: `Не удалось проанализировать сайт: ${message}` },
        { status: 500 }
      );
    }
  }

  // Quick mode
  try {
    const { html, finalUrl } = await fetchSiteHtml(url);

    // Try to fetch contacts page for more accurate requisites/contacts checks
    const extraHtml = await fetchContactsPage(html, finalUrl);

    const result = basicCheckHtml(toDisplayUrl(finalUrl), html, extraHtml);
    const spa = detectSpa(html);
    if (spa.isLikelySpa) {
      result.spaDetected = true;
      result.warnings = [
        "Сайт использует JavaScript-рендеринг, часть проверок может быть неточной. Точная проверка таких сайтов появится в Pro+ режиме.",
      ];
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    return NextResponse.json(
      { error: `Не удалось загрузить сайт: ${message}` },
      { status: 500 }
    );
  }
}
