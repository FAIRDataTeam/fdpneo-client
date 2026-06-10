import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http", () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { http } from "@/api/http";
import { createUser, listAssignableRoles, listUsers, updateUser } from "./users";

/* eslint-disable @typescript-eslint/unbound-method -- mocking method references */
const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockPatch = vi.mocked(http.patch);
/* eslint-enable @typescript-eslint/unbound-method */

afterEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPatch.mockReset();
});

describe("listUsers", () => {
  it("maps snake_case to camelCase and forwards search/paging params", async () => {
    mockGet.mockResolvedValue({
      data: { users: [{ id: "u1", username: "jdoe", email: "j@x", first_name: "J", last_name: "Doe", roles: ["steward"], enabled: true }], total: 1 },
    });
    const out = await listUsers({ search: "doe", limit: 20, offset: 40 });
    expect(mockGet.mock.calls[0]![1]).toEqual({ params: { search: "doe", limit: 20, offset: 40 } });
    expect(out.total).toBe(1);
    expect(out.users[0]).toEqual({ id: "u1", username: "jdoe", email: "j@x", firstName: "J", lastName: "Doe", roles: ["steward"], enabled: true });
  });

  it("omits blank search and defaults missing optionals", async () => {
    mockGet.mockResolvedValue({ data: { users: [{ id: "u2", username: "bare", roles: [], enabled: false }] } });
    const out = await listUsers({ search: "  " });
    expect(mockGet.mock.calls[0]![1]).toEqual({ params: {} });
    expect(out.users[0]).toMatchObject({ email: null, firstName: null, lastName: null, enabled: false });
    expect(out.total).toBe(0);
  });
});

describe("listAssignableRoles", () => {
  it("returns the curated role set", async () => {
    mockGet.mockResolvedValue({ data: { roles: ["steward", "admin"] } });
    expect(await listAssignableRoles()).toEqual(["steward", "admin"]);
  });
});

describe("createUser", () => {
  it("POSTs an invite-style body in snake_case", async () => {
    mockPost.mockResolvedValue({ data: { id: "n1", username: "new", roles: ["steward"], enabled: true } });
    await createUser({ username: "new", email: "n@x", roles: ["steward"] });
    expect(mockPost.mock.calls[0]![0]).toBe("/fdp-api/users");
    expect(mockPost.mock.calls[0]![1]).toMatchObject({ username: "new", email: "n@x", roles: ["steward"], enabled: true, send_invite: true });
  });
});

describe("updateUser", () => {
  it("PATCHes only the provided fields, snake_cased", async () => {
    mockPatch.mockResolvedValue({ data: { id: "u1", username: "jdoe", roles: ["admin"], enabled: false } });
    await updateUser("u1", { roles: ["admin"], enabled: false });
    expect(mockPatch.mock.calls[0]![0]).toBe("/fdp-api/users/u1");
    expect(mockPatch.mock.calls[0]![1]).toEqual({ roles: ["admin"], enabled: false });
  });
});
