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
  "наша компания", "связаться", "связь",
];

// Matches href path segment (case-insensitive)
const CONTACTS_HREF_RE =
  /\/(contact|contacts|about|about-us|aboutus|o-nas|o-kompanii|o-sebe|o-firme|rekvizity|requisites|company|info|corporate|svyaz|svyazatsya)(\/|\.|\?|$)/i;

async function fetchContactsPage(html: string, baseUrl: string): Promise<string | undefined> {
  const re = /<a\s[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  let contactUrl: string | undefined;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, " ").trim().toLowerCase();
    const matchesText = CONTACTS_TEXT_KW.some((kw) => text.includes(kw));
    const matchesHref = CONTACTS_HREF_RE.test(href);
    if (matchesText || matchesHref) {
      try { contactUrl = new URL(href, baseUrl).href; } catch { /* skip */ }
      if (contactUrl) break;
    }
  }
  if (!contactUrl || contactUrl === baseUrl) return undefined;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(contactUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timer);
    return (await res.text()).slice(0, 200_000);
  } catch {
    return undefined;
  }
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
