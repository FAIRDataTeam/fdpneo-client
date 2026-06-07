/**
 * User admin client (server ADR-0013, `/users`) — a thin, admin-scoped facade
 * over the IdP. List/search, role + enabled management, invite-create, delete.
 * Capability-gated server-side (`features.user_management`); when the facade is
 * unconfigured the endpoints return 503 `fdp.service_unavailable`. JSON in/out;
 * `snake_case` ↔ camelCase mapped here. See docs/server-requests/users-facade.md.
 */

import { http } from "./http";
import type { components } from "./schema";

type RawUser = components["schemas"]["UserInfo"];

export interface User {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  enabled: boolean;
}

export interface UserList {
  users: User[];
  total: number;
}

export interface CreateUserInput {
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  enabled?: boolean;
  sendInvite?: boolean;
}

export interface UpdateUserInput {
  roles?: string[];
  enabled?: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
}

function toUser(r: RawUser): User {
  return {
    id: r.id,
    username: r.username,
    email: r.email ?? null,
    firstName: r.first_name ?? null,
    lastName: r.last_name ?? null,
    roles: r.roles ?? [],
    enabled: r.enabled,
  };
}

export interface ListUsersParams {
  search?: string;
  limit?: number;
  offset?: number;
}

/** List/search users (admin). `total` supports prev/next paging. */
export async function listUsers(params: ListUsersParams = {}): Promise<UserList> {
  const query: Record<string, string | number> = {};
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.limit != null) query.limit = params.limit;
  if (params.offset != null) query.offset = params.offset;
  const res = await http.get<{ users?: RawUser[]; total?: number }>("/users", { params: query });
  return { users: (res.data.users ?? []).map(toUser), total: res.data.total ?? 0 };
}

/** The FDP roles assignable to users (curated; e.g. ["steward","admin"]). */
export async function listAssignableRoles(): Promise<string[]> {
  const res = await http.get<{ roles?: string[] }>("/users/roles");
  return res.data.roles ?? [];
}

export async function getUser(id: string): Promise<User> {
  const res = await http.get<RawUser>(`/users/${encodeURIComponent(id)}`);
  return toUser(res.data);
}

/** Create/invite a user (admin). Invite-only: no password flows through here. */
export async function createUser(input: CreateUserInput): Promise<User> {
  const body = {
    username: input.username,
    email: input.email ?? null,
    first_name: input.firstName ?? null,
    last_name: input.lastName ?? null,
    roles: input.roles,
    enabled: input.enabled ?? true,
    send_invite: input.sendInvite ?? true,
  };
  const res = await http.post<RawUser>("/users", body);
  return toUser(res.data);
}

/** Update roles / enabled / profile (admin). `roles` is the full desired set. */
export async function updateUser(id: string, patch: UpdateUserInput): Promise<User> {
  const body: Record<string, unknown> = {};
  if (patch.roles !== undefined) body.roles = patch.roles;
  if (patch.enabled !== undefined) body.enabled = patch.enabled;
  if (patch.firstName !== undefined) body.first_name = patch.firstName;
  if (patch.lastName !== undefined) body.last_name = patch.lastName;
  if (patch.email !== undefined) body.email = patch.email;
  const res = await http.patch<RawUser>(`/users/${encodeURIComponent(id)}`, body);
  return toUser(res.data);
}

export async function deleteUser(id: string): Promise<void> {
  await http.delete(`/users/${encodeURIComponent(id)}`);
}
