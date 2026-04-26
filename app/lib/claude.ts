import Anthropic from "@anthropic-ai/sdk";
import { LAWS } from "./laws";
import type { CheckResult, Violation } from "./types";

const SYSTEM_PROMPT = `Ты — эксперт по российскому интернет-законодательству. Твоя задача — проверить HTML-код сайта на нарушения требований РФ и вернуть СТРОГО валидный JSON.

Список правил, которые нужно проверить (ID правила обязательно используй из этого списка):
${LAWS.map((l) => `- ${l.id}: ${l.title} | ${l.law} | штраф ${l.fineMin}–${l.fineMax} ₽ | как проверить: ${l.howToCheck}`).join("\n")}

Правила анализа:
1. Проверяй ТОЛЬКО то, что реально видно в HTML.
2. Если сомневаешься — лучше не указывай нарушение.
3. Для каждого нарушения дай короткую улику (evidence) — конкретно что нашёл (например "найден тег <script src='google-analytics.com/...'>").
4. severity: critical (штраф больше 1 млн), high (300к–1млн), medium (100к–300к), low (меньше 100к).

Верни JSON в формате:
{
  "violations": [
    { "id": "<id из списка>", "evidence": "<что нашёл>", "severity": "low|medium|high|critical" }
  ]
}

Никакого текста до или после JSON. Никаких markdown-блоков.`;

export async function analyzeWithClaude(
  url: string,
  html: string,
  apiKey: string
): Promise<CheckResult> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `URL: ${url}\n\nHTML сайта (обрезан до 200КБ):\n\n${html}`,
      },
    ],
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
    .map((v) => {
      const rule = LAWS.find((l) => l.id === v.id);
      if (!rule) return null;
      return {
        id: rule.id,
        category: rule.category,
        title: rule.title,
        law: rule.law,
        fineMin: rule.fineMin,
        fineMax: rule.fineMax,
        evidence: v.evidence,
        severity: v.severity,
      } satisfies Violation;
    })
    .filter((x): x is Violation => x !== null);

  const totalFineMin = violations.reduce((s, v) => s + v.fineMin, 0);
  const totalFineMax = violations.reduce((s, v) => s + v.fineMax, 0);
  const realisticFine = Math.round((totalFineMin + totalFineMax) / 2);
  const categoriesChecked = new Set(LAWS.map((l) => l.category)).size;

  return {
    url,
    checkedAt: new Date().toISOString(),
    mode: "ai",
    violations,
    totalFineMin,
    totalFineMax,
    realisticFine,
    rulesChecked: LAWS.length,
    categoriesChecked,
  };
}
