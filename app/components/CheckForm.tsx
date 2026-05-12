"use client";

import { useState } from "react";
import type { CheckResult } from "../lib/types";

type Props = {
  onResult: (result: CheckResult) => void;
};

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
          disabled={loading}
          className="flex-1 px-5 py-4 rounded-xl border border-gray-300 text-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-8 py-4 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition text-lg whitespace-nowrap"
        >
          {loading ? "Анализирую..." : "Проверить сайт"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="mt-4 text-gray-600 text-sm">
          {mode === "quick"
            ? "Загружаем страницу и проверяем по 12 правилам. Займёт меньше секунды."
            : "ИИ читает страницу и проверяет 36 правил по 15 категориям. Это занимает 15–30 секунд."}
        </div>
      )}
    </form>
  );
}
