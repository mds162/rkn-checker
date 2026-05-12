"use client";

import { useState } from "react";
import type { CheckResult, Violation } from "../lib/types";
import { OrderFixForm } from "./OrderFixForm";

const fmt = (n: number) =>
  new Intl.NumberFormat("ru-RU").format(n) + " ₽";

const SEVERITY_STYLES: Record<Violation["severity"], string> = {
  critical: "bg-red-100 text-red-900 border-red-300",
  high: "bg-orange-100 text-orange-900 border-orange-300",
  medium: "bg-yellow-100 text-yellow-900 border-yellow-300",
  low: "bg-blue-100 text-blue-900 border-blue-300",
};

const SEVERITY_LABEL: Record<Violation["severity"], string> = {
  critical: "Критично",
  high: "Высокий риск",
  medium: "Средний риск",
  low: "Низкий риск",
};

type Props = {
  result: CheckResult;
  onReset: () => void;
};

export function ResultDisplay({ result, onReset }: Props) {
  const [showOrder, setShowOrder] = useState(false);
  const [paid, setPaid] = useState(false);

  const sorted = [...result.violations].sort((a, b) => b.fineMax - a.fineMax);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4">
      <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
        {result.mode === "quick"
          ? "⚡ Быстрая проверка по 12 правилам (regex). Для полного анализа используйте режим «Полная проверка через AI»."
          : "🤖 Полная проверка через AI по 36 правилам."}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="text-sm text-gray-500 mb-2">Проверен сайт</div>
        <div className="text-xl font-semibold mb-6 break-all">{result.url}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">Риск штрафа</div>
            <div className="text-2xl font-bold text-danger">
              от {fmt(result.totalFineMin)}
            </div>
            <div className="text-lg text-gray-700">до {fmt(result.totalFineMax)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Реальная оценка</div>
            <div className="text-3xl font-bold text-brand">
              ~{fmt(result.realisticFine)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Найдено нарушений</div>
            <div className="text-3xl font-bold">{result.violations.length}</div>
            <div className="text-sm text-gray-500">
              из {result.rulesChecked} проверок ({result.categoriesChecked} категорий)
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="px-5 py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark transition"
          >
            Скачать PDF
          </button>
          <button
            onClick={onReset}
            className="px-5 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition"
          >
            Проверить другой сайт
          </button>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Топ-3 самых дорогих нарушений</h2>
      <div className="space-y-4 mb-8">
        {top3.map((v) => (
          <ViolationCard key={v.id} v={v} />
        ))}
      </div>

      {rest.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6 relative">
          <h2 className="text-2xl font-bold mb-4">
            Полный отчёт по остальным {rest.length} нарушениям
          </h2>
          {paid ? (
            <div className="space-y-4">
              {rest.map((v) => (
                <ViolationCard key={v.id} v={v} />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-4 blur-sm pointer-events-none select-none">
                {rest.slice(0, 3).map((v) => (
                  <ViolationCard key={v.id} v={v} />
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl">
                <div className="text-center">
                  <div className="text-lg font-semibold mb-2">
                    Доступно после оплаты
                  </div>
                  <div className="text-3xl font-bold text-brand mb-4">490 ₽</div>
                  <button
                    onClick={() => setPaid(true)}
                    className="px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition"
                  >
                    Получить полный отчёт
                  </button>
                  <div className="text-xs text-gray-500 mt-2">
                    (демо: оплата не подключена)
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Не хочется разбираться самому?</h2>
        <p className="mb-6 opacity-90">
          Оставьте заявку — наши специалисты за 3 дня исправят все нарушения на вашем сайте.
          Стоимость работ — от 10 000 ₽.
        </p>
        {showOrder ? (
          <OrderFixForm url={result.url} />
        ) : (
          <button
            onClick={() => setShowOrder(true)}
            className="px-6 py-3 bg-white text-brand font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Заказать исправление
          </button>
        )}
      </div>
    </div>
  );
}

function ViolationCard({ v }: { v: Violation }) {
  return (
    <div className={`border-l-4 rounded-lg p-5 ${SEVERITY_STYLES[v.severity]}`}>
      <div className="flex justify-between items-start gap-4 mb-2">
        <h3 className="font-semibold text-lg">{v.title}</h3>
        <span className="text-xs font-bold uppercase whitespace-nowrap">
          {SEVERITY_LABEL[v.severity]}
        </span>
      </div>
      <div className="text-sm opacity-80 mb-2">
        Категория: {v.category} · {v.law}
      </div>
      <div className="text-sm mb-3 italic">{v.evidence}</div>
      <div className="font-semibold">
        Штраф: {fmt(v.fineMin)} – {fmt(v.fineMax)}
      </div>
    </div>
  );
}
