import { NextResponse } from "next/server";
import { fetchSiteHtml, normalizeUrl } from "@/app/lib/fetch-site";
import { analyzeWithClaude } from "@/app/lib/claude";
import { buildDemoResult } from "@/app/lib/demo";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let url = "";
  try {
    const body = (await req.json()) as { url?: string };
    if (!body.url) {
      return NextResponse.json({ error: "URL не указан" }, { status: 400 });
    }
    url = normalizeUrl(body.url);
  } catch {
    return NextResponse.json({ error: "Некорректный адрес сайта" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Демо-режим, если ключа нет — возвращаем заранее заготовленный набор.
  if (!apiKey) {
    return NextResponse.json(buildDemoResult(url));
  }

  try {
    const { html, finalUrl } = await fetchSiteHtml(url);
    const result = await analyzeWithClaude(finalUrl, html, apiKey);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    return NextResponse.json(
      { error: `Не удалось проанализировать сайт: ${message}` },
      { status: 500 }
    );
  }
}
