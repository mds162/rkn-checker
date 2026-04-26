import { LAWS } from "./laws";
import type { CheckResult, Violation } from "./types";

const DEMO_IDS = [
  "pd-cross-border",
  "google-analytics",
  "google-fonts",
  "cookie-banner",
  "cookie-passive",
  "lang-anglicisms",
  "req-inn",
  "a11y-version",
  "ad-marker",
  "contact-form",
  "ssl",
  "meta-links",
];

const SEVERITY: Record<string, Violation["severity"]> = {
  "pd-cross-border": "critical",
  "google-analytics": "critical",
  "google-fonts": "high",
  "cookie-banner": "high",
  "cookie-passive": "medium",
  "lang-anglicisms": "medium",
  "req-inn": "low",
  "a11y-version": "medium",
  "ad-marker": "high",
  "contact-form": "high",
  ssl: "high",
  "meta-links": "medium",
};

export function buildDemoResult(url: string): CheckResult {
  const violations: Violation[] = DEMO_IDS.map((id) => {
    const rule = LAWS.find((l) => l.id === id)!;
    return {
      id: rule.id,
      category: rule.category,
      title: rule.title,
      law: rule.law,
      fineMin: rule.fineMin,
      fineMax: rule.fineMax,
      evidence: "Демо-режим: пример нарушения. Подключите Anthropic API для реального анализа.",
      severity: SEVERITY[id] ?? "medium",
    };
  });

  const totalFineMin = violations.reduce((s, v) => s + v.fineMin, 0);
  const totalFineMax = violations.reduce((s, v) => s + v.fineMax, 0);
  const realisticFine = Math.round((totalFineMin + totalFineMax) / 2);
  const categoriesChecked = new Set(LAWS.map((l) => l.category)).size;

  return {
    url,
    checkedAt: new Date().toISOString(),
    mode: "demo",
    violations,
    totalFineMin,
    totalFineMax,
    realisticFine,
    rulesChecked: LAWS.length,
    categoriesChecked,
  };
}
