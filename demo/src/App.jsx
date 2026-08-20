import { useState } from "react";
import { convert, UNITS } from "./convert.js";

export default function App() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("Celsius");
  const [to, setTo] = useState("Fahrenheit");
  const [result, setResult] = useState(null);

  const onConvert = () => {
    const v = parseFloat(amount);
    if (Number.isNaN(v)) {
      setResult(null);
      return;
    }
    setResult(convert(v, from, to));
  };

  return (
    <main className="app">
      <h1>Unit Converter</h1>
      <p className="sub">Temperature, converted instantly.</p>

      <div className="card">
        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter a value"
        />

        <div className="row">
          <div className="field">
            <label htmlFor="from">From</label>
            <select id="from" value={from} onChange={(e) => setFrom(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="to">To</label>
            <select id="to" value={to} onChange={(e) => setTo(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <button type="button" onClick={onConvert}>Convert</button>

        <output className="result" aria-live="polite">
          {result === null ? "—" : `${result} ${to}`}
        </output>
      </div>
    </main>
  );
}
