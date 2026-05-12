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
        "User-Agent":
          "Mozilla/5.0 (compatible; RKN-Checker/1.0; +https://example.com/bot)",
        Accept: "text/html,application/xhtml+xml",
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
