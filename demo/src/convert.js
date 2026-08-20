// Temperature conversions, pivoting through Celsius.
const toCelsius = {
  Celsius: (v) => v,
  Fahrenheit: (v) => ((v - 32) * 5) / 9,
  Kelvin: (v) => v - 273.15
};

const fromCelsius = {
  Celsius: (v) => v,
  Fahrenheit: (v) => (v * 9) / 5 + 32,
  Kelvin: (v) => v + 273.15
};

export const UNITS = ["Celsius", "Fahrenheit", "Kelvin"];

export function convert(value, from, to) {
  const celsius = toCelsius[from](value);
  const out = fromCelsius[to](celsius);
  return Math.round(out * 100) / 100;
}
