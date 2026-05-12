export type SpaDetection = {
  isLikelySpa: boolean;
  signals: string[];
  textContentLength: number;
};

export function detectSpa(html: string): SpaDetection {
  const signals: string[] = [];

  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const textLength = textOnly.length;

  if (textLength < 500 && html.length > 5000) {
    signals.push(`Очень мало видимого текста (${textLength} символов) при размере HTML ${html.length}`);
  }

  if (/__NEXT_DATA__|__NUXT__|window\.__INITIAL_STATE__|ng-version=|data-reactroot|v-app/.test(html)) {
    signals.push("Обнаружены признаки React/Next/Vue/Nuxt/Angular");
  }

  if (/<div\s+id=["'](root|app|__nuxt|__next)["'][^>]*>\s*<\/div>/.test(html)) {
    signals.push("Пустой root-контейнер SPA-фреймворка");
  }

  const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi) || [];
  const totalScriptSize = scriptMatches.reduce((s, m) => s + m.length, 0);
  if (totalScriptSize > textLength * 5 && totalScriptSize > 10000) {
    signals.push("Размер скриптов в разы больше видимого контента");
  }

  return {
    isLikelySpa: signals.length >= 2,
    signals,
    textContentLength: textLength,
  };
}
