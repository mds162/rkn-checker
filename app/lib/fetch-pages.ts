export type SitePages = {
  homepage: { url: string; html: string; status: number };
  policy?: { url: string; content: string; isPdf: boolean; status: number };
  terms?: { url: string; content: string; isPdf: boolean; status: number };
  contacts?: { url: string; content: string; status: number };
  offer?: { url: string; content: string; status: number };
  returnPolicy?: { url: string; content: string; status: number };
  extraPages: { url: string; content: string; status: number }[];
};

const POLICY_KEYWORDS = [
  "политика конфиденциальности",
  "политика обработки",
  "обработка персональных",
  "privacy",
  "конфиденциальность",
];
const TERMS_KEYWORDS = [
  "пользовательское соглашение",
  "условия использования",
  "условия сервиса",
  "terms",
  "оферта",
];
const CONTACTS_KEYWORDS = ["контакты", "о компании", "реквизиты", "about", "contacts"];
const OFFER_KEYWORDS = ["оферта", "договор-оферта", "условия продажи", "условия покупки", "публичный договор"];
const RETURN_KEYWORDS = ["возврат товара", "возврат и обмен", "условия возврата", "гарантия и возврат"];

const MAX_BYTES = 500_000;
const REQUEST_TIMEOUT = 10_000;
const TOTAL_TIMEOUT = 30_000;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
};

async function fetchWithTimeout(
  url: string,
  timeoutMs = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, redirect: "follow", headers: HEADERS });
  } catch (e) {
    if (e instanceof Error && (e.name === "AbortError" || e.message.includes("aborted"))) {
      throw new Error(`Сайт не ответил за ${timeoutMs / 1000} секунд`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string): Promise<{ content: string; isPdf: boolean; status: number }> {
  const res = await fetchWithTimeout(url);
  const contentType = res.headers.get("content-type") ?? "";
  const isPdf = contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const buffer = Buffer.from(await res.arrayBuffer());
    try {
      // dynamic import to avoid issues with pdf-parse internals
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return { content: data.text.slice(0, MAX_BYTES), isPdf: true, status: res.status };
    } catch {
      return { content: "[PDF не удалось распарсить]", isPdf: true, status: res.status };
    }
  }

  const text = await res.text();
  return { content: text.slice(0, MAX_BYTES), isPdf: false, status: res.status };
}

function extractLinks(html: string, baseUrl: string): { href: string; text: string }[] {
  const results: { href: string; text: string }[] = [];
  const re = /<a\s[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!href || href.startsWith("javascript") || href.startsWith("mailto")) continue;
    try {
      const abs = new URL(href, baseUrl).href;
      results.push({ href: abs, text });
    } catch {
      // skip invalid URLs
    }
  }
  return results;
}

function findLink(
  links: { href: string; text: string }[],
  keywords: string[]
): string | undefined {
  for (const kw of keywords) {
    const found = links.find((l) => l.text.includes(kw));
    if (found) return found.href;
  }
  return undefined;
}

export async function fetchSitePages(inputUrl: string): Promise<SitePages> {
  const deadline = Date.now() + TOTAL_TIMEOUT;

  // 1. Fetch homepage
  const homeRes = await fetchWithTimeout(inputUrl);
  const homeHtml = (await homeRes.text()).slice(0, MAX_BYTES);
  const finalUrl = homeRes.url;

  if (!homeRes.ok && homeHtml.trim().length < 500) {
    if (homeRes.status === 401 || homeRes.status === 403) {
      throw new Error(`Сайт блокирует автоматические запросы (код ${homeRes.status}). Попробуйте позже или проверьте URL.`);
    }
    throw new Error(`Сайт ответил кодом ${homeRes.status}`);
  }

  const homepage: SitePages["homepage"] = {
    url: finalUrl,
    html: homeHtml,
    status: homeRes.status,
  };

  const links = extractLinks(homeHtml, finalUrl);

  const policyUrl = findLink(links, POLICY_KEYWORDS);
  const termsUrl = findLink(links, TERMS_KEYWORDS);
  const contactsUrl = findLink(links, CONTACTS_KEYWORDS);
  const offerUrl = findLink(links, OFFER_KEYWORDS);
  const returnUrl = findLink(links, RETURN_KEYWORDS);

  const result: SitePages = { homepage, extraPages: [] };

  async function safeFetch(
    url: string
  ): Promise<{ content: string; isPdf: boolean; status: number } | null> {
    if (Date.now() > deadline) return null;
    try {
      const remaining = deadline - Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT, remaining));
      const res = await fetch(url, { signal: controller.signal, redirect: "follow", headers: HEADERS });
      clearTimeout(timer);
      const contentType = res.headers.get("content-type") ?? "";
      const isPdf = contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const buffer = Buffer.from(await res.arrayBuffer());
        try {
          const pdfParse = (await import("pdf-parse")).default;
          const data = await pdfParse(buffer);
          return { content: data.text.slice(0, MAX_BYTES), isPdf: true, status: res.status };
        } catch {
          return { content: "[PDF не удалось распарсить]", isPdf: true, status: res.status };
        }
      }

      const text = await res.text();
      return { content: text.slice(0, MAX_BYTES), isPdf: false, status: res.status };
    } catch {
      return null;
    }
  }

  // 2. Fetch policy
  if (policyUrl) {
    const r = await safeFetch(policyUrl);
    if (r) result.policy = { url: policyUrl, ...r };
  }

  // 3. Fetch terms
  if (termsUrl && termsUrl !== policyUrl) {
    const r = await safeFetch(termsUrl);
    if (r) result.terms = { url: termsUrl, ...r };
  }

  // 4. Fetch contacts
  if (contactsUrl && contactsUrl !== policyUrl && contactsUrl !== termsUrl) {
    const r = await safeFetch(contactsUrl);
    if (r) result.contacts = { url: contactsUrl, content: r.content, status: r.status };
  }

  // 5. Fetch offer
  const fetchedUrls = new Set([policyUrl, termsUrl, contactsUrl].filter(Boolean));
  if (offerUrl && !fetchedUrls.has(offerUrl)) {
    const r = await safeFetch(offerUrl);
    if (r) result.offer = { url: offerUrl, content: r.content, status: r.status };
    fetchedUrls.add(offerUrl);
  }

  // 6. Fetch return policy
  if (returnUrl && !fetchedUrls.has(returnUrl)) {
    const r = await safeFetch(returnUrl);
    if (r) result.returnPolicy = { url: returnUrl, content: r.content, status: r.status };
  }

  return result;
}
