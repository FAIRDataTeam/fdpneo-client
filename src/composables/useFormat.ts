/**
 * Locale-aware number/date formatting.
 *
 * Wraps the `Intl` formatters with the active UI locale (from the locale store)
 * so figures and dates follow the chosen language — e.g. `1,234` (en) vs
 * `1.234` (de/nl). Returns reactive helpers: switching language re-formats
 * without a reload. Use this instead of `Intl.NumberFormat()` /
 * `toLocaleString(undefined, …)`, which silently pin to the browser locale.
 */

import { computed } from "vue";
import { useLocaleStore } from "@/stores/locale";

export function useFormat() {
  const locale = useLocaleStore();

  const numberFmt = computed(() => new Intl.NumberFormat(locale.current));

  /** Format an integer/decimal in the active locale's grouping. */
  function formatNumber(n: number): string {
    return numberFmt.value.format(n);
  }

  /** Format a date/timestamp in the active locale with explicit `Intl` options. */
  function formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(locale.current, options).format(value);
  }

  return { formatNumber, formatDate, locale: computed(() => locale.current) };
}
