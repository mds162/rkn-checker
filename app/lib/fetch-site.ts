export async function fetchSiteHtml(
  url: string,
  options?: { maxBytes?: number }
): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
      },
    });
    if (!response.ok) {
      throw new Error(`Сайт ответил кодом ${response.status}`);
    }
    const html = await response.text();
    const maxBytes = options?.maxBytes ?? Infinity;
    return { html: html.slice(0, maxBytes), finalUrl: response.url };
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  new URL(url); // выбросит ошибку, если адрес кривой
  return url;
}
