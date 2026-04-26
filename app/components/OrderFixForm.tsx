"use client";

import { useState } from "react";

export function OrderFixForm({ url }: { url: string }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // В реальном проекте — POST на /api/order. Сейчас просто демо.
    console.log("Заявка:", { url, name, phone });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="bg-white/20 rounded-lg p-4">
        <div className="font-semibold mb-1">Заявка принята</div>
        <div className="text-sm opacity-90">
          Мы перезвоним вам по номеру {phone} в течение часа в рабочее время.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
      <input
        type="text"
        placeholder="Ваше имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full px-4 py-3 rounded-lg text-gray-900 border-0"
      />
      <input
        type="tel"
        placeholder="+7 (___) ___-__-__"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        className="w-full px-4 py-3 rounded-lg text-gray-900 border-0"
      />
      <label className="flex items-start gap-2 text-sm opacity-90">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          required
          className="mt-1"
        />
        <span>
          Согласен на обработку персональных данных в соответствии с политикой конфиденциальности
        </span>
      </label>
      <button
        type="submit"
        disabled={!agreed || !phone || !name}
        className="px-6 py-3 bg-white text-brand font-semibold rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Отправить заявку
      </button>
    </form>
  );
}
