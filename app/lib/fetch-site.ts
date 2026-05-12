export async function fetchSiteHtml(
  url: string,
  options?: { maxBytes?: number }
): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      },
    });
    const html = await response.text();
    const maxBytes = options?.maxBytes ?? Infinity;
    const sliced = html.slice(0, maxBytes);

    // Если сервер вернул ошибку и тела почти нет — бросаем понятное сообщение
    if (!response.ok && sliced.trim().length < 500) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Сайт блокирует автоматические запросы (код ${response.status}). Попробуйте Pro-режим или проверьте URL вручную.`);
      }
      throw new Error(`Сайт ответил кодом ${response.status}`);
    }

    // Иначе используем что вернулось — даже с 4xx часто приходит реальный HTML
    return { html: sliced, finalUrl: response.url };
  } catch (e) {
    if (e instanceof Error && (e.name === "AbortError" || e.message.includes("aborted"))) {
      throw new Error("Сайт не ответил за 20 секунд — возможно, он недоступен или слишком медленный");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export function toDisplayUrl(url: string): string {
  try {
    const { domainToUnicode } = require("url") as typeof import("url");
    const u = new URL(url);
    const unicode = domainToUnicode(u.hostname);
    if (unicode && unicode !== u.hostname) {
      return url.replace(u.hostname, unicode);
    }
  } catch { /* noop */ }
  return url;
}

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  new URL(url); // выбросит ошибку, если адрес кривой
  return url;
}
