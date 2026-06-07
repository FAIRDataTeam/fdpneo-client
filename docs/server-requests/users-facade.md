# Server request: `/users` admin facade (unblocks client 9.3 — user management)

**Status:** proposed contract · **Requested by:** fdp-client (Phase 9.3) · **Date:** 2026-06-07
**Owner:** fdp-server · **Consumers:** fdp-client `UsersAdminView` (`/admin/users`)

## Why

The client wants in-app **user & role management** (Phase 9.3). Identities live
in the IdP (Keycloak), so the client must not talk to Keycloak's admin API
directly (it has no admin credentials and shouldn't). We need a **thin,
admin-scoped facade** on `fdp-server` that proxies the IdP's user-admin
operations — symmetric with the existing managed-document admin surfaces
(`/schemas`, `/policies`, `/licenses`, `/resource-definitions`).

This is the **only remaining blocker** for completing Phase 9 on the client; all
other open Phase-9 items are either done or deferred to v1.x.

## Scope

A CRUD-ish facade over the realm's users, limited to what an FDP admin needs:
list/search users, see and change their **FDP roles** (`steward`, `admin`),
enable/disable, create/invite, and remove. **Out of scope:** passwords, MFA,
federation/SSO config, and any non-FDP realm roles — those stay in the IdP's own
admin console (the client already links to it from the profile page).

## AuthN/AuthZ

- All endpoints **require an authenticated admin** (`require_auth` +
  `_require_admin`), same as `PUT /policies`.
- The server calls Keycloak's Admin REST API using a **service account / admin
  client** configured server-side (client never sees those credentials).

## Conventions (match existing endpoints)

- JSON, `snake_case` keys (as in `PolicyInfo`, error envelopes).
- Errors use the standard envelope: `{ code, message, docs_url, details }`
  (e.g. `fdp.not_found`, `fdp.forbidden`, `fdp.conflict`, `fdp.bad_request`).
- `id` is the IdP user id (the same value as the token `sub`).

## Data model

```jsonc
// UserInfo
{
  "id": "ba0cf67c-7dca-4e51-bdf8-bf467c3bdb6b", // = token `sub`
  "username": "admin",
  "email": "admin@fdp.local",
  "first_name": "Admin",        // nullable
  "last_name": "User",          // nullable
  "roles": ["steward", "admin"],// FDP realm roles only (see /users/roles)
  "enabled": true
}
```

## Endpoints

### `GET /users` — list / search (admin)
Query params: `search` (matches username/email/name, optional),
`limit` (default 50, max 200), `offset` (default 0).
```jsonc
200 → { "users": [UserInfo, ...], "total": 137 }
```

### `GET /users/roles` — assignable FDP roles (admin)
So the client renders the role picker without hard-coding the set.
```jsonc
200 → { "roles": ["steward", "admin"] }
```

### `GET /users/{id}` — one user (admin)
`200 → UserInfo` · `404 fdp.not_found`

### `POST /users` — create / invite (admin)
```jsonc
// body
{ "username": "jdoe", "email": "jdoe@org.example",
  "first_name": "J", "last_name": "Doe",
  "roles": ["steward"], "enabled": true,
  "send_invite": true }   // if true, IdP sends a set-password/verify email; no password in this API
```
`201 → UserInfo` · `409 fdp.conflict` (username/email already exists) ·
`400 fdp.bad_request` (missing username/email, unknown role).

### `PATCH /users/{id}` — update roles / enabled / profile (admin)
Partial; any subset of `roles`, `enabled`, `first_name`, `last_name`, `email`.
`roles` is the **full desired set** (server diffs against current and adds/removes).
`200 → UserInfo` · `404` · `400` (unknown role) · `409` (email collision).

### `DELETE /users/{id}` — remove (admin)
`204` · `404`.

## Safety / edge cases (please enforce server-side)

- **No self-lockout:** reject a request where the caller removes their own
  `admin` role or sets their own `enabled:false` → `409 fdp.conflict`
  (`message: "cannot remove your own admin access"`). The client will also guard,
  but the server is the authority.
- **Unknown roles** (anything not in `GET /users/roles`) → `400`.
- **Last admin:** consider rejecting removal/demotion of the final admin
  (optional, but nice).
- Email/username uniqueness is the IdP's; surface its conflict as `409`.

## Pagination / search

`total` + `limit`/`offset` is enough for the client's table (it'll do simple
prev/next). `search` server-side avoids shipping the whole directory.

## What the client will build once this lands

Mirrors the resource-definition admin:
- `src/api/users.ts` — `listUsers(search?, {limit,offset})`, `getUser`,
  `createUser`, `updateUser(id, patch)`, `deleteUser`, `listAssignableRoles`;
  snake→camel mappers, `normaliseError`.
- `useUsers` composable (TanStack Query) + `useInvalidateUsers`.
- `UsersAdminView` (route `/admin/users`, admin-gated, in `UserMenu`): searchable
  table (username · email · role chips · enabled), a role/enabled editor drawer,
  and a create/invite form. Self-lockout guarded in the UI too.

## Open questions for the server team

1. Is a Keycloak **service-account admin client** acceptable in this deployment,
   or should this wait for a different identity backend? (Determines feasibility.)
2. Confirm the FDP role set is exactly `{steward, admin}` (anything else the PDP
   reads?), and whether `GET /users/roles` should return realm roles verbatim or
   a curated FDP subset.
3. Should `POST /users` ever set a password directly, or is invite-only
   (`send_invite`) the only supported creation path? (Client assumes invite-only.)
4. Any rate/size limits on `GET /users` we should design the table around?

---

*Cross-ref: client [TASKS.md §9.11](../../TASKS.md) (Phase 9 completion plan).
The IdP account console is already linked from the client profile page
(`ProfileView`, 9.10) — this facade is specifically for **admin** management of
**other** users.*
