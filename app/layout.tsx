import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Аудит152 — проверка сайта на нарушения закона РФ",
  description:
    "Узнайте, сколько штрафов рискует получить ваш сайт. 36 автоматических проверок по ФЗ-152, ЗоЗПП, рекламному законодательству.",
  icons: {
    icon: '/favicon-audit152.svg',
    shortcut: '/favicon-audit152.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
