// Order pricing. A promo discounts the subtotal; tax is charged on the
// discounted amount, and the total is what the customer pays.
export const UNIT_PRICE = 40;
export const TAX_RATE = 0.1;

export const PROMOS = {
  SAVE10: { label: "SAVE10", rate: 0.1 },
  SAVE25: { label: "SAVE25", rate: 0.25 }
};

export function priceOrder(qty, promoCode) {
  const promo = PROMOS[(promoCode || "").trim().toUpperCase()] || null;
  const subtotal = UNIT_PRICE * qty;
  const discount = promo ? subtotal * promo.rate : 0;
  const discounted = subtotal - discount;
  const tax = discounted * TAX_RATE;
  const total = discounted + tax;
  return { subtotal, discount, tax, total, promo };
}

export const money = (n) => `$${n.toFixed(2)}`;
