import { useState } from "react";
import { priceOrder, money, UNIT_PRICE } from "./pricing.js";

const PRODUCT = {
  name: "Aurora Wireless Headphones",
  blurb: "Active noise cancelling, 40 hour battery, USB-C fast charge."
};

export default function App() {
  const [qty, setQty] = useState(1);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(null);
  const [placed, setPlaced] = useState(false);

  const price = priceOrder(qty, applied);

  const apply = () => {
    setApplied(code.trim().toUpperCase() || null);
    setPlaced(false);
  };

  return (
    <main className="checkout">
      <section className="card product">
        <div className="thumb" aria-hidden="true">🎧</div>
        <h1>{PRODUCT.name}</h1>
        <p className="blurb">{PRODUCT.blurb}</p>
        <div className="unit">{money(UNIT_PRICE)}<span> each</span></div>
        <label htmlFor="qty">Quantity</label>
        <input
          id="qty"
          type="number"
          min="1"
          max="9"
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(9, parseInt(e.target.value, 10) || 1)))}
        />
      </section>

      <section className="card summary">
        <h2>Order summary</h2>
        <div className="promo">
          <input
            id="promo"
            aria-label="Promo code"
            placeholder="Promo code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="button" onClick={apply}>Apply</button>
        </div>
        {price.promo && (
          <div className="chip" role="status">{price.promo.label} applied, saved {money(price.discount)}</div>
        )}

        <dl className="lines">
          <div><dt>Subtotal</dt><dd>{money(price.subtotal)}</dd></div>
          <div><dt>Discount</dt><dd>-{money(price.discount)}</dd></div>
          <div><dt>Tax</dt><dd>{money(price.tax)}</dd></div>
          <div className="grand"><dt>Total</dt><dd><output id="total">{money(price.total)}</output></dd></div>
        </dl>

        <button className="pay" type="button" onClick={() => setPlaced(true)}>Complete purchase</button>
        {placed && <p className="confirm" role="status">Order confirmed. {money(price.total)} charged.</p>}
      </section>
    </main>
  );
}
