const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  HeadingLevel,
  AlignmentType,
  PageNumber,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
  LevelFormat,
  PageBreak,
  ExternalHyperlink,
} = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120 },
    ...opts,
    children: [new TextRun({ text, ...opts.run })],
  });

const h1 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });

const h2 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });

const bullet = (text) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun(text)],
  });

const code = (text) =>
  new Paragraph({
    spacing: { after: 120 },
    shading: { fill: "F4F4F4", type: ShadingType.CLEAR },
    children: [new TextRun({ text, font: "Consolas", size: 20 })],
  });

const tableCell = (text, opts = {}) =>
  new TableCell({
    borders: cellBorders,
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.header
      ? { fill: "0B5FFF", type: ShadingType.CLEAR }
      : { fill: "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts.header || opts.bold,
            color: opts.header ? "FFFFFF" : "000000",
          }),
        ],
      }),
    ],
  });

const tableRow = (cells, header = false, widths = []) =>
  new TableRow({
    children: cells.map((c, i) => tableCell(c, { width: widths[i], header })),
  });

const techTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3120, 6240],
  rows: [
    tableRow(["Технология", "Назначение"], true, [3120, 6240]),
    tableRow(["Next.js 16", "Фреймворк фронтенда + бэкенда (App Router)"], false, [3120, 6240]),
    tableRow(["React 19", "UI-компоненты"], false, [3120, 6240]),
    tableRow(["TypeScript", "Типизация — меньше ошибок"], false, [3120, 6240]),
    tableRow(["Tailwind CSS", "Стили без CSS-файлов"], false, [3120, 6240]),
    tableRow(["@anthropic-ai/sdk", "Обращение к ИИ Claude для анализа сайтов"], false, [3120, 6240]),
    tableRow(["Node.js 24", "Среда исполнения"], false, [3120, 6240]),
  ],
});

const lawsTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [4000, 5360],
  rows: [
    tableRow(["Категория", "Пример штрафа"], true, [4000, 5360]),
    tableRow(["Персональные данные (152-ФЗ)", "до 6 000 000 ₽"], false, [4000, 5360]),
    tableRow(["Cookies", "до 500 000 ₽"], false, [4000, 5360]),
    tableRow(["Иностранные сервисы (Google, Meta)", "до 6 000 000 ₽"], false, [4000, 5360]),
    tableRow(["Реклама (38-ФЗ)", "до 500 000 ₽"], false, [4000, 5360]),
    tableRow(["Государственный язык (53-ФЗ)", "до 100 000 ₽"], false, [4000, 5360]),
    tableRow(["Реквизиты юрлица", "до 10 000 ₽"], false, [4000, 5360]),
    tableRow(["Договоры (оферта)", "до 30 000 ₽"], false, [4000, 5360]),
    tableRow(["Права потребителей", "до 30 000 ₽"], false, [4000, 5360]),
    tableRow(["Доступность (181-ФЗ)", "до 100 000 ₽"], false, [4000, 5360]),
    tableRow(["Возрастная маркировка (436-ФЗ)", "до 200 000 ₽"], false, [4000, 5360]),
    tableRow(["Реестры РКН (149-ФЗ)", "до 300 000 ₽"], false, [4000, 5360]),
    tableRow(["Запрещённые упоминания", "до 500 000 ₽"], false, [4000, 5360]),
    tableRow(["Запрещённый контент", "до 5 000 000 ₽"], false, [4000, 5360]),
    tableRow(["Безопасность (HTTPS)", "до 100 000 ₽"], false, [4000, 5360]),
  ],
});

const doc = new Document({
  creator: "Claude",
  title: "Описание проекта RKN Checker",
  description: "Сервис проверки сайтов на нарушения закона РФ",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "0B5FFF" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "1F1F1F" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "RKN Checker — описание проекта",
                  italics: true,
                  color: "888888",
                  size: 18,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Страница ", size: 18, color: "888888" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 2400, after: 200 },
          children: [
            new TextRun({ text: "RKN Checker", bold: true, size: 64, color: "0B5FFF", font: "Arial" }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Сервис проверки сайтов на нарушения закона РФ",
              size: 28,
              color: "555555",
              font: "Arial",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Описание проекта · апрель 2026",
              size: 22,
              color: "888888",
              italics: true,
            }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        h1("1. Что это за проект"),
        p(
          "RKN Checker — веб-сервис, который анализирует любой российский сайт и показывает, какие требования законодательства РФ он нарушает и сколько штрафов за это рискует получить владелец."
        ),
        p(
          "Идея взята с практикума по «смысло-кодингу»: пользователь вводит URL своего сайта в форму на главной, нажимает кнопку — искусственный интеллект скачивает HTML-страницу, проверяет её по 36 правилам из 15 категорий и возвращает структурированный отчёт."
        ),

        h2("Для кого"),
        bullet("Владельцы малого и среднего бизнеса с собственным сайтом"),
        bullet("Маркетологи и веб-студии — для проверки клиентских сайтов"),
        bullet("Юристы по интернет-праву — для первичной экспресс-оценки"),

        h2("Бизнес-модель"),
        bullet("Базовая проверка — бесплатно, показывает топ-3 нарушений"),
        bullet("Полный отчёт в PDF — платно (490 ₽)"),
        bullet("Услуга «Заказать исправление» — от 10 000 ₽ (специалисты исправляют все нарушения за 3 дня)"),

        new Paragraph({ children: [new PageBreak()] }),

        h1("2. Технологический стек"),
        p("Современный JavaScript-стек с типизацией и серверным рендерингом:"),
        techTable,

        new Paragraph({ children: [new PageBreak()] }),

        h1("3. Структура проекта"),
        p("Файлы организованы по принципу App Router в Next.js:"),
        code("rkn-checker/"),
        code("├── app/"),
        code("│   ├── api/check/route.ts        — API: принимает URL, возвращает отчёт"),
        code("│   ├── components/"),
        code("│   │   ├── CheckForm.tsx         — форма ввода URL"),
        code("│   │   ├── ResultDisplay.tsx     — отображение результата"),
        code("│   │   └── OrderFixForm.tsx      — форма заявки на исправление"),
        code("│   ├── lib/"),
        code("│   │   ├── laws.ts               — база из 36 правил РФ"),
        code("│   │   ├── types.ts              — TypeScript-типы"),
        code("│   │   ├── fetch-site.ts         — загрузка HTML по URL"),
        code("│   │   ├── claude.ts             — обращение к ИИ Anthropic"),
        code("│   │   └── demo.ts               — демо-результат без ключа"),
        code("│   ├── layout.tsx                — общий layout"),
        code("│   ├── page.tsx                  — главная страница"),
        code("│   └── globals.css               — стили"),
        code("├── Закон_РФ.md                   — справочник законов"),
        code("├── README.md                     — инструкция запуска"),
        code("├── package.json                  — зависимости"),
        code("└── .env.local                    — ключ Anthropic API"),

        new Paragraph({ children: [new PageBreak()] }),

        h1("4. База законов и нарушений"),
        p(
          "Сердце сервиса — справочник из 36 правил, разбитых на 15 категорий. ИИ проверяет HTML сайта на соответствие каждому правилу. Если правило нарушено — добавляет его в отчёт со ссылкой на закон, штрафом и уликой (что именно нашлось в коде)."
        ),
        lawsTable,
        p(
          "При полном нарушении всех правил сумма штрафов превышает 15 миллионов рублей. Типовой российский сайт обычно набирает на 3–8 миллионов.",
          { run: { italics: true, color: "555555" } }
        ),

        new Paragraph({ children: [new PageBreak()] }),

        h1("5. Два режима работы"),

        h2("Демо-режим (без ключа)"),
        p(
          "Если в файле .env.local нет ключа ANTHROPIC_API_KEY — сервис возвращает заранее заготовленный пример из 12 типичных нарушений. Это позволяет посмотреть интерфейс и понять, как всё устроено, не тратя деньги на API."
        ),

        h2("ИИ-режим (с ключом)"),
        p(
          "Когда ключ Anthropic API подключён — каждый запрос реально скачивает HTML указанного сайта и отправляет его в Claude вместе с базой из 36 правил. ИИ читает код, ищет нарушения и возвращает структурированный JSON. Стоимость одной проверки — около 2–4 рублей."
        ),
        p(
          "Получить ключ: console.anthropic.com → API Keys → Create Key. Вставить в файл .env.local в строку ANTHROPIC_API_KEY=sk-ant-api03-..."
        ),

        new Paragraph({ children: [new PageBreak()] }),

        h1("6. Как запустить"),
        p("В терминале PowerShell или bash:"),
        code("cd C:\\Users\\User\\Desktop\\rkn-checker"),
        code("npm install        # один раз — установить зависимости"),
        code("npm run dev        # запустить локальный сервер"),
        p("После этого откроется на http://localhost:3000"),
        p(
          "Чтобы остановить сервер — нажать Ctrl+C в окне терминала."
        ),

        new Paragraph({ children: [new PageBreak()] }),

        h1("7. Что можно улучшить дальше"),
        bullet("Подключить реальную оплату полного отчёта (ЮKassa, CloudPayments)"),
        bullet("Сохранять результаты проверок в базу — чтобы пользователь мог вернуться позже"),
        bullet("Личный кабинет с историей проверок"),
        bullet("Email-уведомления, когда сайт меняется и появляются новые нарушения"),
        bullet("Деплой на Vercel / Cloudflare Pages — чтобы сайт был доступен в интернете"),
        bullet("Реальный модуль автоматического исправления нарушений"),
        bullet("Обновление базы законов по мере выхода новых ФЗ"),

        h1("8. Контекст и источники"),
        p(
          "Идея и архитектура взяты с онлайн-трансляции практикума по «смысло-кодингу» (вайб-кодингу) — Claude Opus 4.7 в среде VS Code + Claude Code."
        ),
        p(
          "Стек, набор правил и многоэтапная сборка (исследование → план → фазы → параллельные агенты) — стандартный для подобных AI-генерируемых проектов 2026 года."
        ),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
          children: [
            new TextRun({
              text: "— Конец документа —",
              italics: true,
              color: "888888",
            }),
          ],
        }),
      ],
    },
  ],
});

const outputPath = "C:\\Users\\User\\Desktop\\Описание_проекта_RKN_Checker.docx";

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log("OK: " + outputPath);
  console.log("Размер: " + (buffer.length / 1024).toFixed(1) + " КБ");
});
