# SPEC: Полное обновление чекера — Фаза 1

## Контекст

Проект — RKN Checker, форк `klodklodin26-oss/rkn-checker`. Next.js 16 + TypeScript. Сейчас работает в двух режимах: `demo` (фейковые данные без API-ключа) и `ai` (вызов Claude Sonnet 4.5 с HTML главной страницы).

Цель Фазы 1 — превратить базовый AI-чекер в **серьёзный продукт с двумя тарифами** и **глубоким анализом**, который реально (а не только на словах) превосходит большинство конкурентов в этой нише.

Все улучшения делаются **без headless-браузера** (Playwright/Puppeteer). Реальный cookie-аудит и анализ работы трекеров в рантайме — отдельная Фаза 2, делаем потом.

## Финальная архитектура

Два режима вместо трёх. `demo` удаляем полностью.

| Режим | Технология | Стоимость для нас | Скорость | Глубина |
|---|---|---|---|---|
| **Quick** (бесплатно для всех) | Regex по HTML | 0 ₽ | <1 сек | Базовая, 15-17 правил |
| **Pro** (платно/по email-лиду) | Многостраничный fetch + Claude AI + детекторы | ~15-20 ₽ за проверку | 20-40 сек | Глубокая, все 36 правил + чтение политики + детект CMP |

## Этапы реализации

Делай поэтапно. После каждого этапа: `npm run build`, `npm run dev`, проверь что работает, покажи мне результат. Только потом следующий этап.

---

### Этап 1: Quick-режим (регулярки)

Создать `app/lib/basic-check.ts`. Функция `basicCheckHtml(url, html)` возвращает `CheckResult` с режимом `"quick"`.

**Правила для Quick-режима** (используй ID из существующего `app/lib/laws.ts`, не выдумывай новые ID):

1. **`google-analytics`** — регулярка `/google-analytics\.com|googletagmanager\.com|gtag\s*\(|ga\s*\(\s*['"]create['"]/i`
2. **`google-fonts`** — `/fonts\.googleapis\.com|fonts\.gstatic\.com/i`
3. **`facebook-pixel`** — `/connect\.facebook\.net|fbq\s*\(/i`
4. **`meta-links`** — есть ссылка на `instagram.com` или `facebook.com` (через `<a href=`) И в HTML нет слова "экстремистск" в радиусе 500 символов от ссылки
5. **`pd-policy`** — нет ссылки `<a>` с текстом, содержащим "политика конфиденциальности" / "политика обработки" / "обработка персональных" / "privacy"
6. **`cookie-banner`** — в HTML нет пары "cookie"|"куки" + "принять"|"согласен"|"accept" в пределах 300 символов
7. **`lang-headers`** — в `<nav>`, `<header>` и первых 5 `<a>` доля кириллицы <20%
8. **`lang-anglicisms`** — найдено 2+ из списка `["sale", "new", "premium", "contact us", "subscribe", "buy now", "more info", "join us"]` в кнопках/заголовках

**Доп. правила, если соответствующие ID есть в `laws.ts`** (если нет — пропусти, не выдумывай):

9. Яндекс.Метрика — `/mc\.yandex\.ru|ym\s*\(\s*\d+/i`
10. reCAPTCHA Google — `/google\.com\/recaptcha|grecaptcha/i`
11. VK Pixel — `/vk-cdn\.net\/pixel|vk\.com\/js\/api\/openapi\.js/i`
12. Mixed content — на HTTPS-странице есть `<img src="http://...">` или `<script src="http://...">`
13. `pd-cross-border` — добавляется автоматически, если сработали правила #1, #2, #3 или #10 (иностранные сервисы → нужно согласие на трансграничную передачу)

**В Quick-режиме НЕ обрезай HTML до 200 КБ.** Регулярки работают на всём, что скачалось.

Файл `app/lib/types.ts`: в `CheckResult.mode` добавить `"quick"`. Удалить `"demo"` если хочешь чистоту (или оставить — на твой выбор).

**Проверка этапа:** на странице `localhost:3000` выбрать Quick → ввести `https://habr.com` → должно найти Google Analytics, Yandex.Metrika, отсутствие cookie-баннера. На `https://example.com` → ноль или 1 нарушение.

---

### Этап 2: Многостраничный fetch для Pro

Создать `app/lib/fetch-pages.ts`. Функция `fetchSitePages(url)`:

1. Скачивает главную страницу (как раньше)
2. Парсит HTML, находит ссылки `<a>` с текстом, содержащим:
   - **Политика**: "политика конфиденциальности", "политика обработки", "обработка персональных", "privacy"
   - **Условия**: "пользовательское соглашение", "условия использования", "terms"
   - **Контакты/реквизиты**: "контакты", "о компании", "реквизиты"
3. Резолвит относительные ссылки до абсолютных
4. Скачивает каждую из найденных страниц (максимум 5 штук)
5. Если ссылка на политику ведёт на `.pdf` — скачивает PDF, извлекает текст через библиотеку `pdf-parse` (`npm install pdf-parse`)
6. Возвращает объект:

```ts
type SitePages = {
  homepage: { url: string; html: string; status: number };
  policy?: { url: string; content: string; isPdf: boolean; status: number };
  terms?: { url: string; content: string; isPdf: boolean; status: number };
  contacts?: { url: string; content: string; status: number };
  extraPages: { url: string; content: string; status: number }[];
};
```

**Таймауты и лимиты:**
- Один запрос — максимум 10 секунд
- Общий лимит — 30 секунд на все страницы
- Если страница политики отдала 404 / 500 / пустоту — это **отдельное нарушение** (rule `pd-policy-link` или `pd-policy`)
- Размер каждой страницы — до 500 КБ (для Pro можно больше, потому что нам важно глубокое содержимое)

**Проверка этапа:** написать тестовый вызов `fetchSitePages('https://habr.com')`, в логи распечатать сколько страниц скачано и какого размера. Убедиться, что находит политику и пользовательское соглашение.

---

### Этап 3: Детектор CMP (Consent Management Platforms)

Создать `app/lib/cmp-detector.ts`. Содержит список известных CMP-провайдеров и их сигнатур:

```ts
export type CmpInfo = { name: string; signatures: RegExp[] };

export const KNOWN_CMPS: CmpInfo[] = [
  { name: "Cookiebot", signatures: [/consent\.cookiebot\.com/i, /cookiebot\.js/i] },
  { name: "OneTrust", signatures: [/cdn\.cookielaw\.org/i, /onetrust/i, /optanonconsent/i] },
  { name: "CookieYes", signatures: [/cookie-cdn\.cookieyes\.com/i, /cookieyes\.com/i] },
  { name: "Termly", signatures: [/termly\.io/i, /app\.termly\.io/i] },
  { name: "Iubenda", signatures: [/iubenda\.com/i, /cdn\.iubenda\.com/i] },
  { name: "Osano", signatures: [/cmp\.osano\.com/i] },
  { name: "TrustArc", signatures: [/trustarc\.com/i, /truste\.com/i] },
  { name: "Quantcast", signatures: [/quantcast/i, /quantserve\.com/i] },
  { name: "Sourcepoint", signatures: [/sourcepoint\.com/i, /sp-prod/i] },
  { name: "Didomi", signatures: [/didomi\.io/i] },
  { name: "Usercentrics", signatures: [/usercentrics\.com/i, /usercentrics\.eu/i] },
  { name: "Klaro", signatures: [/klaro\.kiprotect/i, /klaro\.js/i] },
  { name: "CookieScript", signatures: [/cookie-script\.com/i] },
  { name: "Tarte au Citron", signatures: [/tarteaucitron\.js/i] },
  { name: "Civic Cookie Control", signatures: [/cookiecontrol/i] },
  { name: "CookieConsent (Insites)", signatures: [/cookieconsent\.insites/i] },
  { name: "Axeptio", signatures: [/axept\.io/i] },
  { name: "Complianz", signatures: [/complianz\.gdpr/i, /cmplz-/i] },
  { name: "GDPR Cookie Compliance", signatures: [/moove_gdpr/i] },
  { name: "CookiePro", signatures: [/cookiepro/i] },
  // Российские
  { name: "Cookieinformation", signatures: [/cookieinformation\.com/i] },
  { name: "Cookiescan", signatures: [/cookiescan\.ru/i] },
];

export function detectCmp(html: string): { detected: boolean; name?: string } {
  for (const cmp of KNOWN_CMPS) {
    for (const sig of cmp.signatures) {
      if (sig.test(html)) {
        return { detected: true, name: cmp.name };
      }
    }
  }
  return { detected: false };
}
```

В Pro-режиме при анализе:
- Если CMP детектирован → отдельное поле в результате `cmpDetected: { name: "Cookiebot" }`
- Если CMP не детектирован, но в HTML есть похожие на баннер слова → пометить как "вероятно есть кастомный баннер, не из списка известных CMP"
- Если ничего не найдено → нарушение `cookie-banner` усиливается

**Проверка этапа:** проверь известный сайт с Cookiebot (например, поищи через Google `site:example.com cookiebot`) — должен детектировать.

---

### Этап 4: Парсинг чекбоксов и форм

Создать `app/lib/form-analyzer.ts`. Используя простой HTML-парсер (можно `node-html-parser`, `npm install node-html-parser`) или регулярки:

1. Найти все `<form>` в HTML
2. Для каждой формы определить:
   - Какие поля собирает: `email`, `tel`, `name`, текстовые с подходящими атрибутами `placeholder`/`name`
   - Если есть `<input type="email">` или `<input type="tel">` или поле с `name` содержащим "phone"/"email" → форма **собирает ПДн**
3. Для каждой формы, собирающей ПДн:
   - **Есть ли чекбокс согласия?** — `<input type="checkbox">` внутри `<form>` или рядом
   - **Если чекбокс есть — он предзаполнен?** — атрибут `checked` или `checked="checked"` → это **нарушение**, "предзаполненные галочки запрещены ст. 9 ФЗ-152"
   - **Есть ли ссылка на политику от формы?** — внутри `<form>` или в его метке `<label>` должна быть `<a href>` со словами "политика"/"privacy"

Возвращает:
```ts
type FormAnalysis = {
  totalForms: number;
  pdFormsCount: number; // сколько форм собирают ПДн
  formsWithoutConsent: number;
  formsWithPreCheckedConsent: number; // нарушение!
  formsWithoutPolicyLink: number;
};
```

В Pro-режиме результат вливается в нарушения:
- `formsWithPreCheckedConsent > 0` → нарушение со ссылкой на ст. 9 ФЗ-152, штраф 30 000–150 000 ₽
- `formsWithoutPolicyLink > 0` → усиление нарушения `pd-consent`
- `formsWithoutConsent > 0` → нарушение `pd-consent`

**Проверка этапа:** создай локальный HTML-файл с тремя формами (одна правильная, одна без чекбокса, одна с `checked="checked"`) и прогони через analyzer. Должны быть корректные результаты.

---

### Этап 5: PDF-парсер политики (опционально, если ссылка ведёт на PDF)

В `fetch-pages.ts` (Этап 2) уже есть логика "если PDF — распарсить". Здесь реализовать:

```ts
import pdfParse from 'pdf-parse';

async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}
```

Установить: `npm install pdf-parse`. Типы: `npm install -D @types/pdf-parse` если есть.

Если парсинг падает (битый PDF, защищённый паролем) — поймать ошибку и зафиксировать как нарушение "Политика недоступна в машиночитаемом виде".

---

### Этап 6: Обновлённый Claude-промпт для Pro-режима

Файл `app/lib/claude.ts`. Системный промпт переписать так, чтобы:

1. Объяснить Claude, что он получает **многостраничный контент**: главная + политика + условия + контакты
2. Дать ему уже посчитанные результаты: список найденных CMP, результаты form-analyzer, мета-информацию о страницах
3. Поставить новые задачи:
   - Проанализировать **содержимое политики** на наличие обязательных пунктов 152-ФЗ:
     - Цели обработки ПДн
     - Перечень обрабатываемых данных
     - Сроки хранения
     - Правовые основания
     - Контакты оператора
     - Права субъектов
   - Если какого-то пункта нет — отдельное нарушение
   - Сопоставить **связь форм с политикой**: указано ли в политике, какие именно формы собирают какие данные
   - Найти на странице **контактов** реквизиты юр.лица (ИНН, ОГРН, наименование), без них — нарушение
   - Найти на главной **маркировку рекламы** (`erid=`), если есть рекламные блоки
   - Найти **превосходные степени** "лучший", "№1", "единственный" в маркетинговом тексте

Промпт должен возвращать строго **JSON-результат** в существующем формате `CheckResult`, чтобы не ломать UI.

Структура входных данных для Claude:
```
URL: <url>
Главная страница (HTML, первые 200 КБ): <html>
Политика конфиденциальности (текст): <содержимое или "не найдена">
Пользовательское соглашение (текст): <содержимое или "не найдено">
Страница контактов (текст): <содержимое или "не найдена">
Найденные CMP: Cookiebot / OneTrust / нет
Анализ форм: всего форм X, собирают ПДн Y, без согласия Z, предзаполненных W
```

---

### Этап 7: Обновить роут `app/api/check/route.ts`

Принимать в теле запроса:
```ts
{ url: string, mode: "quick" | "pro" }
```

Маршрутизация:
- `mode === "quick"` → `fetchSiteHtml(url)` без обрезки → `basicCheckHtml(url, html)` → return result
- `mode === "pro"` → `fetchSitePages(url)` (этап 2) → `detectCmp` (этап 3) → `analyzeFormForms` (этап 4) → `analyzeWithClaude(...)` (обновлённый этап 6) → return result
- Если `mode === "pro"` и нет `ANTHROPIC_API_KEY` → 503 "AI-режим временно недоступен, используйте Quick"

---

### Этап 8: Удалить demo-режим

Полностью удалить `app/lib/demo.ts` и все ссылки на него в коде. Перепроверить `route.ts`, `page.tsx`, `types.ts`. Если где-то осталась логика `if (!apiKey) returnDemo()` — заменить на возврат ошибки или на принудительный Quick-режим.

---

### Этап 9: Обновить главную страницу `app/page.tsx`

1. **Селектор режима** на форме проверки:
   - Радио-кнопки или toggle: "Быстрая проверка (бесплатно)" / "Глубокий аудит (Pro)"
   - По умолчанию — Quick
   - Под Pro показать "от 299 ₽" (точную цену потом, пока без оплаты)
   - При выборе Pro — пока сделать **бесплатным для теста**, без модалки оплаты. Когда подключим платежи — добавим. На данном этапе важнее, что технически Pro работает.

2. **Карточки преимуществ** (те, которые сейчас списаны у конкурента) — переписать **под то, что мы реально делаем**:

   **Политика конфиденциальности (Pro):**
   - Поиск ссылки на политику в HTML
   - Открытие политики, проверка доступности
   - Парсинг PDF-политики, если она в виде PDF
   - Анализ содержимого: цели обработки, перечень данных, сроки, основания, контакты, права субъектов
   - Проверка обновлённости (есть ли дата редакции)

   **Формы и согласия (Pro):**
   - Поиск всех форм на странице
   - Определение, какие формы собирают ПДн (email, телефон, имя)
   - Проверка наличия чекбоксов согласия
   - **Детект предзаполненных галочек (нарушение ст. 9 ФЗ-152)**
   - Связка форм с политикой конфиденциальности

   **Cookies и трекеры (Pro):**
   - Детект 20+ известных CMP-платформ (Cookiebot, OneTrust, CookieYes, Termly, Iubenda и др.)
   - Поиск иностранных трекеров: Google Analytics, Facebook Pixel, Google Fonts, reCAPTCHA
   - Российские трекеры: Яндекс.Метрика, VK Pixel
   - Анализ наличия кастомного cookie-баннера (если CMP не из списка)
   - *Пометить плашкой "Скоро": проверка cookies до клика в реальном браузере — это Фаза 2*

3. **Бейдж "Quick" / "Pro"** на результатах проверки — чтобы пользователь видел каким режимом проверяли.

4. **CTA после Quick** — кнопка "Нашли больше нарушений? Запустить глубокий Pro-аудит за 299 ₽" (пока без оплаты, просто переключатель режима).

---

### Этап 10: Тесты на трёх сайтах

После реализации всех этапов прогнать оба режима на:
- `https://example.com` — должно быть мало нарушений (минималистичный сайт)
- `https://habr.com` — должно найти Google Analytics, Yandex Metrika, какой-то CMP или его отсутствие
- `https://ozon.ru` — крупный российский сайт, должно найти много, включая формы и трекеры

Распечатать результат каждого режима, убедиться что Quick быстрый (<1 сек), Pro работает (20-40 сек), и результаты различаются (Pro находит больше).

---

## Критерии готовности

- [ ] `basic-check.ts` реализован, Quick-режим работает за <1 сек
- [ ] `fetch-pages.ts` скачивает главную + политику + соглашение + контакты
- [ ] `cmp-detector.ts` с 20+ платформами в списке
- [ ] `form-analyzer.ts` парсит формы и находит предзаполненные галочки
- [ ] PDF-парсер работает (если политика в PDF)
- [ ] Claude-промпт переписан, получает многостраничный контент
- [ ] `route.ts` маршрутизирует по `mode`
- [ ] `demo.ts` удалён
- [ ] `page.tsx` показывает выбор режима + честные карточки
- [ ] `npm run build` проходит без ошибок и warnings
- [ ] Pro-режим находит больше нарушений чем Quick на одном и том же сайте

## Деплой после реализации

```powershell
git add .
git commit -m "Phase 1: Quick mode + enhanced Pro mode with multi-page fetch, CMP detection, form analysis"
git push origin main
.\deploy.ps1
```

## Что НЕ делаем в этой задаче

- Платёжный шлюз (ЮKassa / Robokassa) — отдельная задача
- Email-регистрация и личный кабинет — отдельная задача
- Headless-браузер (Playwright) — Фаза 2
- Реальный cookie-аудит (что ставится до клика) — Фаза 2
- Многостраничный crawl всего сайта (а не только 3-4 ключевых) — Фаза 3
- PDF-отчёт по результатам — позже
- Rate limiting и защита от атак — отдельная задача перед публичным запуском

## Если что-то непонятно

Спрашивай меня (Claude в чате) или пользователя. Не выдумывай новые ID правил — используй только те, что в `app/lib/laws.ts`. Если для какой-то проверки в `laws.ts` нет подходящего ID — добавь новое правило в `laws.ts`, согласовав с пользователем (через вопрос в чате Claude Code).

Поехали с Этапа 1.
