/** Version helpers and the notices derived from the server's update view (ADR-0028). */

import { describe, expect, it } from "vitest";
import {
  compareVersions,
  newerThan,
  parseVersion,
  satisfies,
  updateNotices,
  type ReleaseInfo,
  type UpdatesView,
} from "./updates";

const release = (version: string, extra: Partial<ReleaseInfo> = {}): ReleaseInfo => ({
  version,
  url: `https://example.org/releases/v${version}`,
  metadata_present: true,
  security: false,
  manual_steps: false,
  ...extra,
});

const view = (extra: Partial<UpdatesView> = {}): UpdatesView => ({
  enabled: true,
  env_enabled: true,
  checked_at: "2026-10-29T12:00:00Z",
  error: null,
  server_version: "0.19.0",
  latest_server: null,
  latest_client: null,
  server_releases: [],
  client_releases: [],
  ...extra,
});

describe("version helpers", () => {
  it("parses plain and v-prefixed versions only", () => {
    expect(parseVersion("0.19.0")).toEqual([0, 19, 0]);
    expect(parseVersion("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("0.19.0-rc1")).toBeNull();
    expect(parseVersion("dev")).toBeNull();
  });

  it("compares numerically, not lexically", () => {
    expect(compareVersions([0, 10, 0], [0, 9, 9])).toBeGreaterThan(0);
    expect(compareVersions([1, 0, 0], [1, 0, 0])).toBe(0);
  });

  it("checks requirements", () => {
    expect(satisfies("0.19.0", ">=0.18.0")).toBe(true);
    expect(satisfies("0.17.0", ">=0.18.0")).toBe(false);
    expect(satisfies("0.18.0", "==0.18.0")).toBe(true);
    expect(satisfies("0.18.0", null)).toBe(true);
    expect(satisfies("dev", ">=0.18.0")).toBeNull();
  });

  it("filters releases newer than the current one", () => {
    const releases = [release("0.9.0"), release("0.8.0"), release("0.7.0")];
    expect(newerThan(releases, "0.8.0").map((r) => r.version)).toEqual(["0.9.0"]);
    expect(newerThan(releases, "dev")).toEqual([]);
  });
});

describe("updateNotices", () => {
  it("is empty when everything is current", () => {
    expect(updateNotices(view({ client_releases: [release("0.8.0")] }), "0.8.0")).toEqual([]);
  });

  it("flags security and manual steps anywhere in the skipped range", () => {
    const notices = updateNotices(
      view({
        server_releases: [release("0.21.0"), release("0.20.0", { security: true, manual_steps: true })],
      }),
      "0.8.0",
    );
    expect(notices).toHaveLength(1);
    const [server] = notices;
    expect(server?.component).toBe("server");
    expect(server?.latest.version).toBe("0.21.0");
    expect(server?.security).toBe(true);
    expect(server?.manualSteps).toBe(true);
    expect(server?.metadataMissing).toBe(false);
  });

  it("says when a client release needs a newer server", () => {
    const notices = updateNotices(
      view({ client_releases: [release("0.9.0", { requires_server: ">=0.20.0" }), release("0.8.0")] }),
      "0.8.0",
    );
    expect(notices.map((n) => n.component)).toEqual(["client"]);
    expect(notices[0]?.needsServer).toBe(">=0.20.0");
  });

  it("marks releases without metadata", () => {
    const notices = updateNotices(
      view({ server_releases: [release("0.20.0", { metadata_present: false, security: null })] }),
      "0.8.0",
    );
    expect(notices[0]?.metadataMissing).toBe(true);
    expect(notices[0]?.security).toBe(false);
  });
});
