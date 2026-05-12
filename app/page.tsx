"use client";

import { useState } from "react";
import { CheckForm } from "./components/CheckForm";
import { ResultDisplay } from "./components/ResultDisplay";
import { TOTAL_RULES, TOTAL_CATEGORIES } from "./lib/laws";
import type { CheckResult } from "./lib/types";

export default function Home() {
  const [result, setResult] = useState<CheckResult | null>(null);

  if (result) {
    return <ResultDisplay result={result} onReset={() => setResult(null)} />;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-3xl mb-10">
        <div className="inline-block px-4 py-1 bg-blue-50 text-brand text-sm font-medium rounded-full mb-6">
          Бесплатная проверка · Результат за 30 секунд
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          Узнайте, насколько ваш сайт нарушает закон РФ
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          {TOTAL_RULES} автоматических проверок по федеральным законам
        </p>
        <p className="text-gray-500">
          Разбор политики конфиденциальности, cookies, рекламы, ПДн —
          по {TOTAL_CATEGORIES} категориям
        </p>
      </div>

      <CheckForm onResult={setResult} />

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl text-center">
        <Stat value={`${TOTAL_RULES}`} label="правил проверяется" />
        <Stat value="до 6 млн ₽" label="штраф по 152-ФЗ" />
        <Stat value="3 мин" label="средняя проверка" />
      </div>

      <footer className="mt-20 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} RKN Checker · Next.js + Claude AI
      </footer>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="text-3xl font-bold text-brand mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
