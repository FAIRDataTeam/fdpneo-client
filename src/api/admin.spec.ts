/**
 * Admin reset client: posts the confirmation token to /admin/reset.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { post: vi.fn() } }));

import { http } from "@/api/http";
import { resetToFactoryDefaults, RESET_CONFIRMATION_TOKEN } from "./admin";

// eslint-disable-next-line @typescript-eslint/unbound-method -- mocking a method reference
const mockPost = vi.mocked(http.post);

beforeEach(() => mockPost.mockReset());

describe("resetToFactoryDefaults", () => {
  it("exposes the server's confirmation token", () => {
    expect(RESET_CONFIRMATION_TOKEN).toBe("reset-to-factory-defaults");
  });

  it("POSTs the confirmation and returns the counts", async () => {
    const resp = { profileName: "default", profileVersion: "1", settingsCleared: 2, schemas: 3, offers: 1, resourceDefinitions: 5, seedRecords: 4 };
    mockPost.mockResolvedValueOnce({ data: resp });
    await expect(resetToFactoryDefaults("reset-to-factory-defaults")).resolves.toEqual(resp);
    expect(mockPost).toHaveBeenCalledWith("/fdp-api/admin/reset", { confirmation: "reset-to-factory-defaults" });
  });
});
