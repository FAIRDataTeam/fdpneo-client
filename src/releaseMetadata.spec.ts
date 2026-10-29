/** release.json (server ADR-0028 §2) stays in step with package.json. */

import { describe, expect, it } from "vitest";
import pkg from "../package.json";
import release from "../release.json";

describe("release.json", () => {
  it("describes the version in package.json", () => {
    expect(release.schema).toBe(1);
    expect(release.component).toBe("client");
    expect(release.version).toBe(pkg.version);
    expect(typeof release.manual_steps).toBe("boolean");
    expect(typeof release.security).toBe("boolean");
    expect(release.min_upgrade_from).toMatch(/^\d+\.\d+\.\d+$/);
    expect(release.requires.server).toMatch(/^(>=|==)?\d+\.\d+\.\d+$/);
  });
});
