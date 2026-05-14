import Anthropic from "@anthropic-ai/sdk";
import { LAWS } from "./laws";
import type { CheckResult, Violation } from "./types";
import type { SitePages } from "./fetch-pages";
import type { CmpResult } from "./cmp-detector";
import type { FormAnalysis } from "./form-analyzer";

const SYSTEM_PROMPT = `Ты — эксперт по российскому интернет-законодательству. Анализируешь сайт на нарушения требований РФ.

Ты получаешь: HTML главной страницы, текст политики конфиденциальности, пользовательского соглашения, страницы контактов, данные о CMP-платформе и формах.

Список правил для проверки (используй только эти ID, не выдумывай новые):
${LAWS.map((l) => `- ${l.id}: ${l.title} | ${l.law} | штраф ${l.fineMin}–${l.fineMax} ₽ | реальный риск: ${l.realRiskLevel} | как проверить: ${l.howToCheck}`).join("\n")}

Инструкции по анализу:

1. ГЛАВНАЯ СТРАНИЦА (HTML):
   - Трекеры: Google Analytics, Facebook Pixel, Google Fonts, reCAPTCHA, Яндекс.Метрика, VK Pixel
   - Ссылки на Instagram/Facebook — нужна пометка "Meta признана экстремистской"
   - Cookie-баннер: если CMP не найден и нет баннера — нарушение cookie-banner
   - Англицизмы и навигация на иностранном языке
   - Возрастная маркировка
   - Реклама с erid-токеном или без маркировки "Реклама"
   - Превосходные степени "лучший", "№1", "единственный" без подтверждения

2. ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ:
   - Если не найдена или не загрузилась — нарушение pd-policy
   - Если найдена — проверь наличие обязательных пунктов 152-ФЗ:
     * Цели обработки ПДн
     * Перечень обрабатываемых данных
     * Сроки хранения
     * Правовые основания
     * Контактные данные оператора
     * Права субъектов ПДн
   - Если каких-то пунктов нет — нарушения pd-policy или pd-consent

3. СТРАНИЦА КОНТАКТОВ / О КОМПАНИИ:
   - Проверь наличие: полного наименования (ООО/ИП), ИНН, ОГРН/ОГРНИП, физического адреса
   - Если нет — нарушения req-company, req-inn, req-address

4. ФОРМЫ (данные из form-analyzer):
   - formsWithoutConsent > 0 → нарушение pd-consent
   - formsWithPreCheckedConsent > 0 → нарушение pd-consent (предзаполненные галочки запрещены ст. 9 ФЗ-152)
   - formsWithoutPolicyLink > 0 → нарушение contact-form

5. CMP (cookie-менеджер):
   - Если detected: false → вероятное нарушение cookie-banner (если нет признаков кастомного баннера)
   - Если isCustom: true → предупреди, но не считай автоматически нарушением
   - ВАЖНО: правило cookie-passive (cookies ставятся до клика) НЕЛЬЗЯ проверить из статического HTML — оно требует реального браузера. НЕ добавляй это нарушение, если в HTML нет явного доказательства (например, трекер инициализируется без проверки согласия внутри обработчика кнопки). Наличие CMP или cookie-баннера само по себе НЕ является нарушением cookie-passive.

6. ЗАКОН О ЗАЩИТЕ ПРАВ ПОТРЕБИТЕЛЕЙ (ЗоЗПП) — только если сайт коммерческий:
   - Определи коммерческий ли сайт: есть кнопки «купить»/«в корзину», ценники, каталог товаров
   - Если коммерческий — проверь:
     * requisites-missing: ИНН, ОГРН/ОГРНИП, КПП, юридический адрес, полное наименование
     * contacts-missing: телефон или email
     * offer-missing: публичная оферта или пользовательское соглашение (ссылка в footer)
     * return-policy-missing: условия возврата (только для интернет-магазинов с корзиной)
     * prices-currency: цены в рублях (если есть цены в $ или € без рублёвого эквивалента)
   - Если сайт некоммерческий (блог, визитка, портфолио) — правила offer-missing, return-policy-missing, prices-currency НЕ применяются

7. META-символика:
   - meta-logo: найди логотипы/иконки Instagram/Facebook (fa-instagram, fa-facebook, файлы .../instagram.svg)
   - meta-ads-pixel: найди Facebook Pixel (connect.facebook.net, fbq())
   - meta-links-text: найди текстовые упоминания Instagram/Facebook без пометки об экстремизме

Поле severity для каждого нарушения бери из поля "реальный риск" в списке правил выше (high/medium/low). Не выдумывай значение. Если находишь нарушение, которого нет в списке — укажи severity: "medium" по умолчанию.

Верни СТРОГО валидный JSON без markdown, без текста до/после:
{
  "violations": [
    { "id": "<id из списка выше>", "evidence": "<конкретное доказательство>", "severity": "low|medium|high" }
  ]
}`;

function truncate(text: string | undefined, maxChars: number): string {
  if (!text) return "не найдено";
  return text.length > maxChars ? text.slice(0, maxChars) + "\n[обрезано...]" : text;
}

// Вырезает <script> и <style> теги из HTML перед отправкой в Claude.
// Скрипты занимают 60–80% типичного HTML-файла, но бесполезны для анализа контента.
// Это позволяет покрыть в 3–4x больше реального текста в том же лимите токенов.
function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s{3,}/g, "\n");
}

export async function analyzeWithClaude(
  pages: SitePages,
  cmp: CmpResult,
  forms: FormAnalysis,
  apiKey: string
): Promise<CheckResult> {
  const client = new Anthropic({ apiKey });

  const cmpSummary = cmp.detected
    ? `Обнаружен: ${cmp.name}${cmp.isCustom ? " (кастомный, не из стандартного списка)" : ""}`
    : "Не обнаружен";

  const formSummary = `Всего форм: ${forms.totalForms}, собирают ПДн: ${forms.pdFormsCount}, без согласия: ${forms.formsWithoutConsent}, предзаполненные галочки: ${forms.formsWithPreCheckedConsent}, без ссылки на политику: ${forms.formsWithoutPolicyLink}`;

  const cleanedHomepage = stripScriptsAndStyles(pages.homepage.html);

  const userContent = `URL: ${pages.homepage.url}

=== ГЛАВНАЯ СТРАНИЦА (HTML без скриптов/стилей, до 300 КБ) ===
${truncate(cleanedHomepage, 300_000)}

=== ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ ===
URL: ${pages.policy?.url ?? "не найдена"}
${pages.policy ? (pages.policy.isPdf ? "[PDF-документ]" : "") : ""}
${truncate(pages.policy?.content, 30_000)}

=== ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ ===
URL: ${pages.terms?.url ?? "не найдено"}
${truncate(pages.terms?.content, 15_000)}

=== СТРАНИЦА КОНТАКТОВ / О КОМПАНИИ ===
URL: ${pages.contacts?.url ?? "не найдена"}
${truncate(pages.contacts?.content, 15_000)}

=== ПУБЛИЧНАЯ ОФЕРТА / УСЛОВИЯ ПРОДАЖИ ===
URL: ${pages.offer?.url ?? "не найдена"}
${truncate(pages.offer?.content, 10_000)}

=== УСЛОВИЯ ВОЗВРАТА ===
URL: ${pages.returnPolicy?.url ?? "не найдена"}
${truncate(pages.returnPolicy?.content, 10_000)}

=== CMP (Cookie Management Platform) ===
${cmpSummary}

=== АНАЛИЗ ФОРМ ===
${formSummary}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude не вернул текстовый ответ");
  }

  const cleaned = textBlock.text.replace(/```json\s*|\s*```/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    violations: { id: string; evidence: string; severity: Violation["severity"] }[];
  };

  const violations: Violation[] = parsed.violations
    .map((v): Violation | null => {
      const rule = LAWS.find((l) => l.id === v.id);
      if (!rule) return null;
      return {
        id: rule.id,
        category: rule.category,
        title: rule.title,
        law: rule.law,
        lawArticle: rule.lawArticle,
        fineMin: rule.fineMin,
        fineMax: rule.fineMax,
        evidence: v.evidence,
        severity: rule.realRiskLevel,
        enforcementNote: rule.enforcementNote,
      };
    })
    .filter((x): x is Violation => x !== null);

  // Dedup: req-inn/req-company/req-address are subsets of requisites-missing
  const hasRequisitesMissing = violations.some((v) => v.id === "requisites-missing");
  const dedupedViolations = hasRequisitesMissing
    ? violations.filter((v) => !["req-inn", "req-company", "req-address"].includes(v.id))
    : violations;

  const violatedIds = new Set(dedupedViolations.map((v) => v.id));
  const passed = LAWS
    .filter((l) => !violatedIds.has(l.id))
    .map((l) => ({ id: l.id, category: l.category, title: l.title }));

  const totalFineMin = dedupedViolations.reduce((s, v) => s + v.fineMin, 0);
  const totalFineMax = dedupedViolations.reduce((s, v) => s + v.fineMax, 0);
  const realisticFine = Math.round((totalFineMin + totalFineMax) / 2);
  const categoriesChecked = new Set(LAWS.map((l) => l.category)).size;

  return {
    url: pages.homepage.url,
    checkedAt: new Date().toISOString(),
    mode: "pro",
    violations: dedupedViolations,
    passed,
    totalFineMin,
    totalFineMax,
    realisticFine,
    rulesChecked: LAWS.length,
    categoriesChecked,
  };
}
