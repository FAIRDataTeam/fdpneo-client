/**
 * Chart.js controller/element registration.
 *
 * Chart.js 4 ships tree-shake-friendly modules — registering only what we
 * use keeps the metrics-dashboard chunk lean. Add to this list as new chart
 * types appear; don't import `chart.js/auto` because that pulls everything.
 */

import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

let registered = false;

export function registerCharts(): void {
  if (registered) return;
  Chart.register(
    LineController,
    BarController,
    LineElement,
    PointElement,
    BarElement,
    LinearScale,
    CategoryScale,
    Filler,
    Tooltip,
  );
  registered = true;
}
