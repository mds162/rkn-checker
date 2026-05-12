"use client";

import { useState, useEffect } from "react";
import type { CheckResult } from "../lib/types";

type Props = {
  onResult: (result: CheckResult) => void;
};

const QUICK_STEPS = [
  "Загружаем страницу…",
  "Проверяем трекеры и скрипты…",
  "Проверяем cookie-баннер…",
  "Анализируем навигацию…",
  "Считаем штрафы…",
];

const PRO_STEPS = [
  "Загружаем главную страницу…",
  "Ищем политику конфиденциальности…",
  "Загружаем политику и условия…",
  "Анализируем формы и чекбоксы…",
  "Определяем CMP-платформу…",
  "Передаём данные в Claude AI…",
  "AI читает политику конфиденциальности…",
  "AI проверяет реквизиты юрлица…",
  "AI анализирует рекламу и маркировку…",
  "Формируем отчёт…",
];

function LoadingScreen({ mode, url }: { mode: "quick" | "pro"; url: string }) {
  const steps = mode === "quick" ? QUICK_STEPS : PRO_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = mode === "quick" ? 300 : 2800;
    const timer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }, interval);
    return () => clearInterval(timer);
  }, [mode, steps.length]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  return (
    <div className="w-full max-w-2xl text-center py-8">
      {/* Spinner */}
      <div className="flex justify-center mb-6">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="#2563eb" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-brand">
            {progress}%
          </div>
        </div>
      </div>

      {/* URL */}
      <div className="text-sm text-gray-400 mb-1 truncate px-4">{url}</div>

      {/* Mode badge */}
      <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4
        bg-blue-50 text-brand border border-blue-200">
        {mode === "quick" ? "⚡ Быстрая проверка" : "🤖 Полная проверка через AI"}
      </div>

      {/* Current step */}
      <div className="text-lg font-medium text-gray-800 mb-6 min-h-[28px]">
        {steps[stepIndex]}
      </div>

      {/* Steps list */}
      <div className="text-left space-y-2 max-w-sm mx-auto">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            {i < stepIndex ? (
              <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs flex-shrink-0">✓</span>
            ) : i === stepIndex ? (
              <span className="w-5 h-5 rounded-full border-2 border-brand flex-shrink-0 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
            )}
            <span className={i <= stepIndex ? "text-gray-800" : "text-gray-400"}>{step}</span>
          </div>
        ))}
      </div>

      {/* Timer */}
      <div className="mt-6 text-sm text-gray-400">
        {elapsed} сек{mode === "pro" ? " · обычно занимает 20–40 сек" : ""}
      </div>
    </div>
  );
}

export function CheckForm({ onResult }: Props) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"quick" | "pro">("quick");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Ошибка проверки");
      }
      onResult(data as CheckResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingScreen mode={mode} url={url} />;
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("quick")}
          className={`flex-1 py-3 px-4 transition ${
            mode === "quick"
              ? "bg-brand text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Быстрая проверка <span className="opacity-75">(бесплатно)</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("pro")}
          className={`flex-1 py-3 px-4 border-l border-gray-200 transition ${
            mode === "pro"
              ? "bg-brand text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Полная проверка через AI <span className="opacity-75">(бета)</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.ru"
          required
          className="flex-1 px-5 py-4 rounded-xl border border-gray-300 text-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="px-8 py-4 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition text-lg whitespace-nowrap"
        >
          Проверить сайт
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}
    </form>
  );
}
