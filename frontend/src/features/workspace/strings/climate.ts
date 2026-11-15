/** UI strings for the Inspector's Climate tab: monthly cycles and the 12-month projection. */
export const climate = {
  heading: "Monthly climate",
  intro: (first: number, last: number) =>
    `The next 12 months, expected from each month's ${first}–${last} average. Not a forecast.`,
  loading: "Loading monthly NASA POWER data…",
  error: "Couldn't load monthly NASA POWER data for this plot.",
  legend: {
    label: "Chart key",
    expected: (first: number, last: number) => `Expected (${first}–${last} average)`,
    range: "Range across those years",
    years: "Each year",
    measured: "Measured, last 12 months",
  },
  factors: {
    rain: { title: "Rainfall", unit: "mm", per: "mm per month" },
    temp: { title: "Temperature", unit: "°C", per: "°C, monthly mean" },
    humidity: { title: "Humidity", unit: "%", per: "%, monthly mean" },
  },
  /** Headline beside each chart title. */
  summary: {
    rain: (total: string) => `${total} expected`,
    temp: (mean: string) => `${mean} average`,
    humidity: (mean: string) => `${mean} average`,
  },
  wettest: (month: string) => `Wettest: ${month}`,
  readout: (month: string, expected: string, low: string, high: string) =>
    `${month}: expected ${expected} (${low}–${high})`,
  readoutMeasured: (month: string, value: string) => `${month} measured ${value}`,
  hint: "Hover or tab through the months for values.",
  chartLabel: (factor: string) => `${factor} by month: expected next 12 months, range, each year and last 12 months`,
  table: {
    month: "Month",
    expected: "Expected",
    range: "Range",
    measured: "Measured (last 12 months)",
  },
  noValue: "—",
} as const;
