# SPEC: добавить Quick-режим проверки (бесплатный, без ИИ)

## Контекст

Проект — RKN Checker, форк `klodklodin26-oss/rkn-checker`. Это Next.js 16 + TypeScript приложение, которое проверяет сайты на соответствие законам РФ. Сейчас работает в двух режимах:

- **demo** — заглушка с фейковыми данными (когда нет API-ключа). Файл `app/lib/demo.ts`.
- **ai** — настоящий анализ через Claude API (модель `claude-sonnet-4-5`). Файл `app/lib/claude.ts`.

Задача — добавить **третий режим Quick**, который проверяет HTML регулярными выражениями без вызова Anthropic API. Это будет бесплатная "быстрая проверка" для всех пользователей. И **полностью удалить demo-режим** — он больше не нужен.

## Архитектура после изменений

Два режима вместо трёх:

| Режим | Технология | Стоимость для нас | Скорость | Покрытие |
|---|---|---|---|---|
| **Quick** (default) | Regex по HTML | 0 ₽ | <1 сек | ~17 правил из 36 |
| **Pro** | Claude Sonnet 4.5 | ~12 ₽/проверка | 10–30 сек | Все 36 правил |

В Quick-режиме не действует ограничение 200 КБ — обрабатываем весь HTML целиком, потому что регулярки работают локально и не стоят денег.

В Pro-режиме пока оставляем существующее поведение (200 КБ, как было). В отдельной задаче потом сделаем умную нарезку HTML.

## Какие правила покрывает Quick-режим

Используй существующие ID правил из `app/lib/laws.ts`. Регулярки и логика детекта:

### 1. `google-analytics` — Google Analytics
Регулярка: `/google-analytics\.com|googletagmanager\.com|gtag\s*\(|ga\s*\(\s*['"]create['"]/i`
Evidence: `"Найден код Google Analytics: <первое совпадение>"`

### 2. `google-fonts` — Google Fonts
Регулярка: `/fonts\.googleapis\.com|fonts\.gstatic\.com/i`
Evidence: `"Найдена ссылка на Google Fonts: <первое совпадение>"`

### 3. `facebook-pixel` — Meta/Facebook Pixel
Регулярка: `/connect\.facebook\.net|fbq\s*\(/i`
Evidence: `"Найден код Facebook Pixel"`

### 4. `meta-links` — ссылки на Instagram/Facebook без пометки
Сначала ищем ссылки на `instagram.com` или `facebook.com` (не в скриптах, в `<a href=`).
Если нашли — проверяем, есть ли где-то в HTML текст "экстремистск" или "признана экстремистской" (case-insensitive).
Если есть ссылка, но НЕТ пометки → нарушение.
Evidence: `"Ссылка на <домен> без пометки об экстремистской организации"`

### 5. `pd-policy` — отсутствует политика конфиденциальности
Ищем ссылки (тег `<a>`) с текстом, содержащим: "политика конфиденциальности", "политика обработки", "обработка персональных", "privacy policy", "privacy".
Если ни одной такой ссылки нет → нарушение.
Evidence: `"На странице не найдено ссылок на политику конфиденциальности"`

### 6. `cookie-banner` — отсутствие cookie-баннера
Ищем в HTML признаки баннера: одновременно должны быть слова "cookie" (или "куки") + одно из ["принять", "согласен", "ок", "понятно", "accept"] в пределах 300 символов друг от друга.
Если не нашли такой пары → нарушение.
Evidence: `"Не найден баннер согласия на cookies"`

### 7. `yandex-metrika` — Яндекс.Метрика без оповещения
Регулярка: `/mc\.yandex\.ru|ym\s*\(\s*\d+|metrika/i`
Метрика сама по себе не нарушение, но если она есть + нет cookie-баннера (правило 6 сработало) — добавляем это нарушение тоже.
Это уже есть в `laws.ts` или нет? Если нет — пропусти, не выдумывай новые ID.

### 8. `recaptcha-google` — Google reCAPTCHA
Регулярка: `/google\.com\/recaptcha|grecaptcha|recaptcha\/api\.js/i`
Evidence: `"Найден код Google reCAPTCHA — передача данных пользователей в Google"`
(если в `laws.ts` нет такого ID — пропусти, не добавляй новых)

### 9. `lang-headers` — навигация только на иностранном
Достаём содержимое всех `<nav>` и `<header>` элементов и первые 5 ссылок `<a>` в них. Считаем долю кириллических символов от всех букв. Если кириллицы <20% → нарушение.
Evidence: `"В навигации преобладают слова на иностранном языке: <примеры>"`

### 10. `lang-anglicisms` — англицизмы без перевода
Ищем кнопки и заголовки (`<button>`, `<h1>`, `<h2>`, `<a class="...btn...">`) с типичными англоязычными маркетинговыми словами: `sale`, `new`, `premium`, `contact us`, `subscribe`, `buy now`, `more info`.
Если нашли 2+ — нарушение.
Evidence: `"Найдены англицизмы: <список>"`

### 11. `pd-cross-border` — потенциальная трансграничная передача ПДн
Если сработали правила 1 (GA), 2 (Google Fonts), 3 (FB Pixel) или 8 (reCAPTCHA) — добавляем это правило, потому что Google и Meta — иностранные сервисы.
Evidence: `"Используются иностранные сервисы (см. предыдущие пункты) — нужно согласие на трансграничную передачу ПДн"`

### 12. `ad-marker` — отсутствие маркировки рекламы
Этот пункт пока **не реализовываем в Quick** — без AI слишком много false positives. В Pro-режиме останется как есть.

### Дополнительные простые проверки

Если в `laws.ts` есть подходящие ID — добавь и эти. Если нет — пропусти, не выдумывай:

- **Mixed content** (на HTTPS-странице есть HTTP-ресурсы): искать `http://` (не `https`) внутри `src=` или `href=` в HTML.
- **VK Pixel**: `/vk-cdn\.net\/pixel|vk\.com\/js\/api\/openapi\.js/i`

## Структура кода

### Новый файл: `app/lib/basic-check.ts`

```ts
import { LAWS } from "./laws";
import type { CheckResult, Violation } from "./types";

export function basicCheckHtml(url: string, html: string): CheckResult {
  const violations: Violation[] = [];

  // Хелпер для добавления нарушения по ID
  function add(id: string, evidence: string, severity: Violation["severity"]) {
    const rule = LAWS.find(l => l.id === id);
    if (!rule) return; // если в laws нет такого ID — игнорируем
    violations.push({
      id: rule.id,
      category: rule.category,
      title: rule.title,
      law: rule.law,
      fineMin: rule.fineMin,
      fineMax: rule.fineMax,
      evidence,
      severity,
    });
  }

  // Проверки 1-11 здесь, каждая в виде блока с регуляркой/логикой и вызовом add(...)

  const totalFineMin = violations.reduce((s, v) => s + v.fineMin, 0);
  const totalFineMax = violations.reduce((s, v) => s + v.fineMax, 0);
  const realisticFine = Math.round((totalFineMin + totalFineMax) / 2);
  const categoriesChecked = new Set(LAWS.map(l => l.category)).size;

  return {
    url,
    checkedAt: new Date().toISOString(),
    mode: "quick", // новый mode, добавь в types.ts
    violations,
    totalFineMin,
    totalFineMax,
    realisticFine,
    rulesChecked: 11, // или сколько реально проверили
    categoriesChecked,
  };
}
```

### Обновить `app/lib/types.ts`

В типе `CheckResult.mode` добавить `"quick"`, удалить `"demo"` (или оставить, если хочешь backward compat — на выбор).

### Обновить `app/api/check/route.ts`

Принимать в теле запроса параметр `mode: "quick" | "pro"`. По умолчанию `quick`.

- `mode === "quick"` → fetch HTML (без обрезки!) → `basicCheckHtml(url, html)` → вернуть результат
- `mode === "pro"` → fetch HTML → если есть `process.env.ANTHROPIC_API_KEY`, вызвать `analyzeWithClaude(...)` → вернуть результат
- Если `mode === "pro"` и нет ключа → вернуть ошибку 503 "AI-режим временно недоступен"

**Важно**: в Quick-режиме НЕ обрезай HTML до 200 КБ. Создай в `fetch-site.ts` новую функцию `fetchSiteHtmlFull(url)` или добавь параметр `truncate?: boolean`.

### Обновить `app/lib/fetch-site.ts`

Сделать обрезание HTML опциональным:
```ts
export async function fetchSiteHtml(url: string, options?: { maxBytes?: number }): Promise<{ html: string; finalUrl: string }> {
  // ...
  const html = await response.text();
  const maxBytes = options?.maxBytes ?? Infinity;
  return { html: html.slice(0, maxBytes), finalUrl: response.url };
}
```

Тогда:
- Quick вызывает `fetchSiteHtml(url)` — без ограничений
- Pro вызывает `fetchSiteHtml(url, { maxBytes: 200000 })` — как было

### Удалить `app/lib/demo.ts`

И все упоминания demo-режима в route.ts и других местах.

### Обновить главную страницу `app/page.tsx`

Сейчас, насколько я понимаю, форма просто отправляет URL. Нужно добавить выбор режима:

- Радио-кнопки или сегмент-контрол: "Быстрая проверка (бесплатно)" / "Полная проверка через AI (от 199 ₽)"
- По умолчанию выбран **Quick**
- При клике на **Pro** — пока что просто показать модалку "В разработке: оплата подключим позже. Для теста используйте бесплатную проверку." (платежи делаем отдельной задачей)
- Альтернатива: на старте сделать Pro доступным без оплаты (для теста), но с кнопкой попроще
- Решение принимает разработчик при реализации, главное — две явные кнопки/опции

В результатах проверки показывать в шапке:
- "Быстрая проверка (17 правил)" или "Полная проверка через AI (36 правил)"

### Обновить README

Добавить раздел "Режимы проверки" с описанием Quick и Pro.

## Что НЕ делаем в этой задаче

Эти вещи — отдельные шаги, в другие итерации:
- Платёжный шлюз (ЮKassa / Robokassa)
- Email-регистрация пользователей
- Rate limiting по IP
- Умная нарезка HTML для Pro-режима
- PDF-отчёт

## Критерии готовности

- [ ] `basic-check.ts` реализован, проверяет ~10–17 правил по регуляркам
- [ ] `route.ts` принимает параметр `mode` и роутит на quick/pro
- [ ] `fetch-site.ts` поддерживает опциональное обрезание
- [ ] `demo.ts` удалён, все ссылки на demo-режим вычищены
- [ ] `page.tsx` показывает выбор режима
- [ ] `npm run build` проходит без ошибок
- [ ] `npm run dev` локально: введи `https://habr.com` в форму, выбери Quick → должны прийти результаты в течение секунды
- [ ] То же с `https://example.com` (минималистичная страница) → ноль нарушений или мало
- [ ] Pro-режим работает как раньше (с ключом) или показывает понятную ошибку (без ключа)

## Деплой

Когда всё локально работает:
```bash
git add .
git commit -m "Add Quick mode (regex-based free check), remove demo mode"
git push origin main
```

И затем (на Windows):
```powershell
.\deploy.ps1
```

(скрипт уже должен быть на моём компе после первого деплоя — он обновит сайт на сервере через SSH)

## Если что-то пойдёт не так

- TypeScript-ошибки из-за `mode: "quick"` → проверить что в `types.ts` обновлён union тип
- Регулярки не ловят что-то очевидное → распечатать первые 500 символов HTML в лог и подебажить
- `npm run build` падает → запустить `npm run lint` отдельно, посмотреть конкретные ошибки

Поехали.
