"use client";

import { useState } from "react";
import type { CheckResult, PassedRule, Violation } from "../lib/types";
import { LAWS } from "../lib/laws";
import { OrderFixForm } from "./OrderFixForm";

const fmt = (n: number) =>
  new Intl.NumberFormat("ru-RU").format(n) + " ₽";

const RISK_BORDER: Record<"high" | "medium" | "low", string> = {
  high: "border-l-4 border-red-500 bg-red-50",
  medium: "border-l-4 border-yellow-500 bg-yellow-50",
  low: "border-l-4 border-gray-300 bg-gray-50",
};

const RISK_BADGE: Record<"high" | "medium" | "low", string> = {
  high: "bg-red-100 text-red-800 border border-red-300",
  medium: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  low: "bg-gray-100 text-gray-700 border border-gray-300",
};

const RISK_LABEL: Record<"high" | "medium" | "low", string> = {
  high: "Высокий риск",
  medium: "Средний риск",
  low: "Низкий риск",
};

const RISK_ORDER: Record<"high" | "medium" | "low", number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function getEffectiveRisk(v: Violation): "high" | "medium" | "low" {
  if (v.realRiskLevel) return v.realRiskLevel;
  if (v.severity === "critical" || v.severity === "high") return "high";
  if (v.severity === "medium") return "medium";
  return "low";
}

type Props = {
  result: CheckResult;
  onReset: () => void;
  onCheckPro?: (url: string) => void;
  proLoading?: boolean;
  proError?: string | null;
};

export function ResultDisplay({ result, onReset, onCheckPro, proLoading, proError }: Props) {
  const [showOrder, setShowOrder] = useState(false);

  const sorted = [...result.violations].sort((a, b) => {
    const ra = RISK_ORDER[getEffectiveRisk(a)];
    const rb = RISK_ORDER[getEffectiveRisk(b)];
    if (ra !== rb) return ra - rb;
    return b.fineMax - a.fineMax;
  });

  const highCount = sorted.filter((v) => getEffectiveRisk(v) === "high").length;
  const mediumCount = sorted.filter((v) => getEffectiveRisk(v) === "medium").length;
  const lowCount = sorted.filter((v) => getEffectiveRisk(v) === "low").length;

  const checkedIds = new Set([
    ...result.violations.map((v) => v.id),
    ...result.passed.map((p) => p.id),
  ]);
  const uncheckedRules = LAWS.filter((l) => !checkedIds.has(l.id));
  const uncheckedCategories = [...new Set(uncheckedRules.map((r) => r.category))];

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4">
      <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
        {result.mode === "quick"
          ? "⚡ Быстрая проверка по 12 правилам (regex). Для полного анализа используйте режим «Полная проверка через AI»."
          : "🤖 Полная проверка через AI по 36 правилам."}
      </div>

      {/* SPA Warning */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-400 rounded-lg flex gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            {result.warnings.map((w, i) => (
              <p key={i} className="text-amber-900 text-sm">{w}</p>
            ))}
          </div>
        </div>
      )}

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

      {/* Risk level summary */}
      {result.violations.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {highCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
              <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-red-800 font-semibold text-sm">{highCount} высоких риска</span>
            </div>
          )}
          {mediumCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
              <span className="text-yellow-800 font-semibold text-sm">{mediumCount} средних риска</span>
            </div>
          )}
          {lowCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="text-gray-700 font-semibold text-sm">{lowCount} низких риска</span>
            </div>
          )}
        </div>
      )}

      {/* All violations */}
      {sorted.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mb-4">Найденные нарушения</h2>
          <div className="space-y-4 mb-8">
            {sorted.map((v) => (
              <ViolationCard key={v.id} v={v} />
            ))}
          </div>
        </>
      )}

      {/* Passed rules */}
      {result.passed.filter((p) => !UNVERIFIABLE_IDS.has(p.id)).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-bold mb-4 text-green-700">
            ✓ Пройдено успешно — {result.passed.filter((p) => !UNVERIFIABLE_IDS.has(p.id)).length} из {result.rulesChecked} проверок
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.passed.filter((p) => !UNVERIFIABLE_IDS.has(p.id)).map((p) => (
              <PassedCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}

      {/* AI upsell for quick mode */}
      {result.mode === "quick" && uncheckedRules.length > 0 && onCheckPro && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🤖</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-amber-900 mb-2">
                Быстрая проверка охватывает только 12 из {uncheckedRules.length + checkedIds.size} правил
              </h2>
              <p className="text-amber-800 text-sm mb-4">
                AI читает весь HTML и проверяет {uncheckedRules.length} дополнительных правил — реквизиты,
                рекламу, пользовательские соглашения, возрастной контент и другое. Это занимает 15–30 секунд.
              </p>
              <div className="mb-5">
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                  Категории, которые проверит AI:
                </div>
                <div className="flex flex-wrap gap-2">
                  {uncheckedCategories.map((cat) => (
                    <span key={cat} className="text-sm bg-white border border-amber-300 text-amber-900 px-3 py-1 rounded-full font-medium">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
              {proError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                  {proError}
                </div>
              )}
              <button
                onClick={() => onCheckPro(result.url)}
                disabled={proLoading}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
              >
                {proLoading ? "AI анализирует… подождите 15–30 сек" : "Запустить полную проверку через AI →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl p-8 text-white mb-6">
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

      {/* Disclaimer */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
        ⚠️ Результаты автоматической проверки носят информационный характер и не являются юридическим заключением. Реальная квалификация нарушений зависит от обстоятельств, статуса оператора ПДн, поданных в Роскомнадзор уведомлений и судебной практики. Для точной оценки рисков обратитесь к юристу.
      </div>
    </div>
  );
}

// Правила, которые нельзя надёжно проверить автоматически:
// реестр РКН, местонахождение серверов, трафик
const UNVERIFIABLE_IDS = new Set([
  "pd-localization",
  "pd-roskomnadzor",
  "rkn-blogger",
  "zpp-return",   // старые правила — заменены на return-policy-missing
  "zpp-warranty",
]);

const PASSED_LABEL: Record<string, string> = {
  // Персональные данные — что реально найдено в HTML
  "pd-policy": "Политика конфиденциальности найдена",
  "pd-policy-link": "Политика доступна с главной страницы",
  "pd-consent": "Нарушений по согласию на обработку ПДн не выявлено",
  "pd-cross-border": "Иностранных сервисов с передачей ПДн не найдено",
  "pd-localization": "Явных признаков хранения ПДн за рубежом не выявлено",
  "pd-roskomnadzor": "Нарушений по регистрации в реестре операторов не выявлено",
  // Cookies
  "cookie-banner": "Cookie-баннер обнаружен",
  "cookie-russian": "Нарушений по языку cookie-баннера не выявлено",
  "cookie-passive": "Нарушений по пассивной установке cookies не выявлено",
  // Иностранные сервисы
  "google-analytics": "Google Analytics не обнаружен",
  "google-fonts": "Google Fonts не используется",
  "facebook-pixel": "Facebook Pixel не обнаружен",
  "meta-links": "Ссылок на Meta-сервисы без пометки не найдено",
  "meta-ads-pixel": "Facebook/Meta Pixel не обнаружен",
  "meta-logo": "Логотипов Instagram/Facebook на странице не найдено",
  "meta-links-text": "Текстовых упоминаний Meta-сервисов без пометки не найдено",
  // Реклама
  "ad-marker": "Рекламы без маркировки на проверенных страницах не найдено",
  "ad-best": "Недостоверных превосходных степеней на проверенных страницах не найдено",
  "ad-medical": "Рекламы медуслуг без предупреждений на проверенных страницах не найдено",
  // Государственный язык
  "lang-anglicisms": "Англицизмы в заголовках не обнаружены",
  "lang-headers": "Навигация на русском языке",
  // Реквизиты
  "req-company": "Наименование организации найдено",
  "req-inn": "ИНН организации найден",
  "req-address": "Адрес юрлица найден",
  "requisites-missing": "ИНН, ОГРН и наименование юр.лица найдены",
  "contacts-missing": "Контактная информация (телефон или email) найдена",
  // Договоры
  "offer": "Нарушений по публичной оферте не выявлено",
  "user-agreement": "Нарушений по пользовательскому соглашению не выявлено",
  "offer-missing": "Оферта или условия продажи найдены",
  "return-policy-missing": "Условия возврата найдены",
  "prices-currency": "Цены указаны в рублях",
  // Права потребителей
  "zpp-return": "Нарушений по условиям возврата не выявлено",
  "zpp-warranty": "Нарушений по гарантийным обязательствам не выявлено",
  // Доступность
  "a11y-version": "Нарушений по доступности для слабовидящих не выявлено",
  // Возрастная маркировка
  "age-marker": "Возрастная маркировка найдена",
  // Реестры РКН
  "rkn-blogger": "Признаков обязательной регистрации как СМИ/блогер не выявлено",
  // Запрещённые упоминания
  "extremist": "Упоминаний запрещённых организаций без пометки не найдено",
  // Обратная связь
  "contact-form": "Нарушений по ссылкам на политику ПДн в формах не выявлено",
  // Запрещённый контент
  "lgbt": "ЛГБТ-контента на проверенных страницах не найдено",
  "drugs": "Информации о наркотиках на проверенных страницах не найдено",
  "suicide": "Описаний суицида на проверенных страницах не найдено",
  // Безопасность
  "ssl": "Сайт работает по HTTPS",
};

function PassedCard({ p }: { p: PassedRule }) {
  const label = PASSED_LABEL[p.id] ?? `Нарушение не обнаружено: ${p.title.toLowerCase()}`;
  return (
    <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
      <span className="text-green-600 mt-0.5 font-bold">✓</span>
      <div>
        <div className="font-medium text-green-900">{label}</div>
        <div className="text-green-700 text-xs mt-0.5">{p.category}</div>
      </div>
    </div>
  );
}

function ViolationCard({ v }: { v: Violation }) {
  const risk = getEffectiveRisk(v);
  return (
    <div className={`rounded-lg p-5 ${RISK_BORDER[risk]}`}>
      <div className="flex justify-between items-start gap-4 mb-2">
        <h3 className="font-semibold text-lg text-gray-900">{v.title}</h3>
        <span className={`text-xs font-bold uppercase whitespace-nowrap px-2 py-1 rounded-full ${RISK_BADGE[risk]}`}>
          {RISK_LABEL[risk]}
        </span>
      </div>
      <div className="text-sm text-gray-600 mb-2">
        Категория: {v.category} · {v.law}
      </div>
      <div className="text-sm mb-3 italic text-gray-700">{v.evidence}</div>
      <div className="font-semibold text-gray-900">
        Штраф: {fmt(v.fineMin)} – {fmt(v.fineMax)}
      </div>
      {v.enforcementNote && (
        <div className="mt-3 text-xs text-gray-500 border-t border-gray-200 pt-2">
          <span className="font-semibold">Реальная практика:</span> {v.enforcementNote}
        </div>
      )}
    </div>
  );
}
