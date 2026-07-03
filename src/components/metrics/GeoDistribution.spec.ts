import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GeoDistribution from "./GeoDistribution.vue";

const rows = [
  { code: "NL", label: "Netherlands", requests: 120, visitors: 42 },
  { code: "DE", label: "Germany", requests: 50, visitors: 17 },
];

describe("GeoDistribution", () => {
  it("renders a country row per entry", () => {
    const w = mount(GeoDistribution, { props: { rows } });
    expect(w.findAll(".row")).toHaveLength(2);
  });

  // CC BY 4.0 obligation: the DB-IP credit must be visibly present and linked
  // wherever geographic data is shown. It lives on this component so geo data
  // can never render without it.
  it("always shows the DB-IP attribution linking to db-ip.com", () => {
    const w = mount(GeoDistribution, { props: { rows } });
    const credit = w.get(".attribution");
    expect(credit.text()).toContain("IP geolocation by");
    const link = credit.get("a");
    expect(link.text()).toBe("DB-IP");
    expect(link.attributes("href")).toBe("https://db-ip.com");
    expect(link.attributes("rel")).toContain("noopener");
  });

  it("keeps the attribution even with no country rows", () => {
    const w = mount(GeoDistribution, { props: { rows: [] } });
    expect(w.find(".attribution").exists()).toBe(true);
    expect(w.get(".attribution a").attributes("href")).toBe("https://db-ip.com");
  });
});
