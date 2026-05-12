export type CommercialSignals = {
  isCommercial: boolean;
  confidence: "high" | "medium" | "low";
  signals: string[];
};

export function detectCommercial(html: string): CommercialSignals {
  const signals: string[] = [];

  if (/bitrix|catalog\.action|opencart|tilda.*store|insales|shopify/i.test(html)) {
    signals.push("Обнаружена e-commerce платформа");
  }

  if (/корзина|в корзину|купить|add to cart|оформить заказ|checkout/i.test(html)) {
    signals.push("Элементы корзины или кнопки покупки");
  }

  if (/(\d[\d\s]{0,10})\s*(₽|руб|RUB)/.test(html)) {
    signals.push("Ценники в рублях");
  }

  if (/каталог|товары|product-card|product__|item-card/i.test(html)) {
    signals.push("Каталог или карточки товаров");
  }

  if (/способы оплаты|доставка|тарифы доставки|курьер|сдэк|почта россии/i.test(html)) {
    signals.push("Информация об оплате/доставке");
  }

  return {
    isCommercial: signals.length >= 2,
    confidence: signals.length >= 3 ? "high" : signals.length === 2 ? "medium" : "low",
    signals,
  };
}
