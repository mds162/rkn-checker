import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Проверка сайта на нарушения закона РФ",
  description:
    "Узнайте, сколько штрафов рискует получить ваш сайт. 36 автоматических проверок по ФЗ.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
