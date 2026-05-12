import { NextResponse } from "next/server";
import { fetchSiteHtml, normalizeUrl } from "@/app/lib/fetch-site";
import { fetchSitePages } from "@/app/lib/fetch-pages";
import { analyzeWithClaude } from "@/app/lib/claude";
import { basicCheckHtml } from "@/app/lib/basic-check";
import { detectCmp } from "@/app/lib/cmp-detector";
import { analyzeForms } from "@/app/lib/form-analyzer";
import { detectSpa } from "@/app/lib/spa-detector";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const result = basicCheckHtml(finalUrl, html);
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
