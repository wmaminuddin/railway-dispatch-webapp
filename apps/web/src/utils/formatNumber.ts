const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 20
});

/** Format a quantitative value with en-US thousands separators. */
export const formatNumber = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "—";
  if (Number.isInteger(value)) return integerFormatter.format(value);
  return decimalFormatter.format(value);
};

/**
 * Format a quantitative value while preserving a fixed number of fraction digits.
 * Useful for rates and hours that already use toFixed(...) in the UI.
 */
export const formatFixed = (value: number | null | undefined, fractionDigits: number): string => {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
};

/** Recharts-friendly tick/tooltip formatter for quantitative axes. */
export const formatChartNumber = (value: unknown): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return formatNumber(value);
};
