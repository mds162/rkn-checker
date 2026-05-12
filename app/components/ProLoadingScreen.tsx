"use client";

import { useState, useEffect } from "react";

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

export function ProLoadingScreen({ url }: { url: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, PRO_STEPS.length - 1));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const progress = Math.round(((stepIndex + 1) / PRO_STEPS.length) * 100);

  return (
    <div className="w-full max-w-2xl text-center py-8">
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

      <div className="text-sm text-gray-400 mb-1 truncate px-4">{url}</div>
      <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-blue-50 text-brand border border-blue-200">
        🤖 Полная проверка через AI
      </div>

      <div className="text-lg font-medium text-gray-800 mb-6 min-h-[28px]">
        {PRO_STEPS[stepIndex]}
      </div>

      <div className="text-left space-y-2 max-w-sm mx-auto">
        {PRO_STEPS.map((step, i) => (
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

      <div className="mt-6 text-sm text-gray-400">
        {elapsed} сек · обычно занимает 20–40 сек
      </div>
    </div>
  );
}
