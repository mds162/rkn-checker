export type CmpInfo = { name: string; signatures: RegExp[] };

export const KNOWN_CMPS: CmpInfo[] = [
  { name: "Cookiebot", signatures: [/consent\.cookiebot\.com/i, /cookiebot\.js/i] },
  { name: "OneTrust", signatures: [/cdn\.cookielaw\.org/i, /onetrust/i, /optanonconsent/i] },
  { name: "CookieYes", signatures: [/cookie-cdn\.cookieyes\.com/i, /cookieyes\.com/i] },
  { name: "Termly", signatures: [/termly\.io/i, /app\.termly\.io/i] },
  { name: "Iubenda", signatures: [/iubenda\.com/i, /cdn\.iubenda\.com/i] },
  { name: "Osano", signatures: [/cmp\.osano\.com/i] },
  { name: "TrustArc", signatures: [/trustarc\.com/i, /truste\.com/i] },
  { name: "Quantcast", signatures: [/quantcast/i, /quantserve\.com/i] },
  { name: "Sourcepoint", signatures: [/sourcepoint\.com/i, /sp-prod/i] },
  { name: "Didomi", signatures: [/didomi\.io/i] },
  { name: "Usercentrics", signatures: [/usercentrics\.com/i, /usercentrics\.eu/i] },
  { name: "Klaro", signatures: [/klaro\.kiprotect/i, /klaro\.js/i] },
  { name: "CookieScript", signatures: [/cookie-script\.com/i] },
  { name: "Tarte au Citron", signatures: [/tarteaucitron\.js/i] },
  { name: "Civic Cookie Control", signatures: [/cookiecontrol/i] },
  { name: "CookieConsent (Insites)", signatures: [/cookieconsent\.insites/i] },
  { name: "Axeptio", signatures: [/axept\.io/i] },
  { name: "Complianz", signatures: [/complianz\.gdpr/i, /cmplz-/i] },
  { name: "GDPR Cookie Compliance", signatures: [/moove_gdpr/i] },
  { name: "CookiePro", signatures: [/cookiepro/i] },
  { name: "Cookieinformation", signatures: [/cookieinformation\.com/i] },
  { name: "Cookiescan", signatures: [/cookiescan\.ru/i] },
];

const CUSTOM_BANNER_SIGNALS = [
  /cookie[_-]?banner/i,
  /cookie[_-]?consent/i,
  /cookie[_-]?notice/i,
  /cookie[_-]?popup/i,
  /gdpr[_-]?banner/i,
  /consent[_-]?modal/i,
  /cookie[_-]?overlay/i,
];

export type CmpResult =
  | { detected: true; name: string; isCustom: false }
  | { detected: true; name: "Кастомный баннер"; isCustom: true }
  | { detected: false };

export function detectCmp(html: string): CmpResult {
  for (const cmp of KNOWN_CMPS) {
    for (const sig of cmp.signatures) {
      if (sig.test(html)) {
        return { detected: true, name: cmp.name, isCustom: false };
      }
    }
  }
  for (const sig of CUSTOM_BANNER_SIGNALS) {
    if (sig.test(html)) {
      return { detected: true, name: "Кастомный баннер", isCustom: true };
    }
  }
  return { detected: false };
}
