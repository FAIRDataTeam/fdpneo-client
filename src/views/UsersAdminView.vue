<script setup lang="ts">
/**
 * Users admin (Phase 9.3) — manage IdP users via the server `/users` facade
 * (ADR-0013). Search, role + enabled editing, invite-create, delete. Admin-only
 * + feature-gated (`user_management`; the route is blocked when off). Identity
 * itself (password, email verification) stays in the IdP.
 */
import { computed, ref } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth";
import { parseFdpError, type ParsedError } from "@/api/errors";
import { createUser, deleteUser, updateUser, type CreateUserInput, type ListUsersParams, type User } from "@/api/users";
import { useAssignableRoles, useInvalidateUsers, useUsers } from "@/composables/useUsers";

const auth = useAuthStore();
const meId = computed(() => {
  const sub = (auth.user?.profile as Record<string, unknown> | undefined)?.sub;
  return typeof sub === "string" ? sub : null;
});

const LIMIT = 20;
const params = ref<ListUsersParams>({ search: "", limit: LIMIT, offset: 0 });
const { users, total, isLoading, isError } = useUsers(params);
const roles = useAssignableRoles();
const invalidate = useInvalidateUsers();
const error = ref<ParsedError | null>(null);

const page = computed(() => Math.floor((params.value.offset ?? 0) / LIMIT) + 1);
const pages = computed(() => Math.max(1, Math.ceil(total.value / LIMIT)));
function setSearch(v: string) {
  params.value = { ...params.value, search: v, offset: 0 };
}
function step(delta: number) {
  const next = Math.max(0, (params.value.offset ?? 0) + delta * LIMIT);
  params.value = { ...params.value, offset: next };
}

const isSelf = (u: User) => u.id === meId.value;

// --- inline role/enabled editor -------------------------------------------
const editId = ref<string | null>(null);
const draftRoles = ref<string[]>([]);
const draftEnabled = ref(true);
function startEdit(u: User) {
  editId.value = u.id;
  draftRoles.value = [...u.roles];
  draftEnabled.value = u.enabled;
  error.value = null;
}
function toggleRole(r: string) {
  draftRoles.value = draftRoles.value.includes(r)
    ? draftRoles.value.filter((x) => x !== r)
    : [...draftRoles.value, r];
}

const save = useMutation({
  mutationFn: (id: string) => updateUser(id, { roles: draftRoles.value, enabled: draftEnabled.value }),
  onSuccess: async () => {
    editId.value = null;
    error.value = null;
    await invalidate();
  },
  onError: (e) => (error.value = parseFdpError(e)),
});

const remove = useMutation({
  mutationFn: (id: string) => deleteUser(id),
  onSuccess: async () => {
    error.value = null;
    await invalidate();
  },
  onError: (e) => (error.value = parseFdpError(e)),
});
function onDelete(u: User) {
  if (!isSelf(u) && window.confirm(`Delete user "${u.username}"? This removes them from the IdP.`)) {
    remove.mutate(u.id);
  }
}

// --- create / invite -------------------------------------------------------
const showCreate = ref(false);
const cUsername = ref("");
const cEmail = ref("");
const cRoles = ref<string[]>([]);
const cInvite = ref(true);
function toggleCreateRole(r: string) {
  cRoles.value = cRoles.value.includes(r) ? cRoles.value.filter((x) => x !== r) : [...cRoles.value, r];
}
const create = useMutation({
  mutationFn: () => {
    const input: CreateUserInput = { username: cUsername.value.trim(), roles: cRoles.value, sendInvite: cInvite.value };
    const email = cEmail.value.trim();
    if (email) input.email = email;
    return createUser(input);
  },
  onSuccess: async () => {
    showCreate.value = false;
    cUsername.value = "";
    cEmail.value = "";
    cRoles.value = [];
    error.value = null;
    await invalidate();
  },
  onError: (e) => (error.value = parseFdpError(e)),
});
function submitCreate() {
  error.value = null;
  if (!cUsername.value.trim()) {
    error.value = { title: "Missing username", message: "A username is required.", code: "client.validation", status: null, docsUrl: null, violations: [], fromServer: false };
    return;
  }
  if (cInvite.value && !cEmail.value.trim()) {
    error.value = { title: "Email required", message: "An email is required to send an invite.", code: "client.validation", status: null, docsUrl: null, violations: [], fromServer: false };
    return;
  }
  create.mutate();
}
</script>

<template>
  <section class="page">
    <header class="head">
      <div class="eyebrow mono">FDP Neo · Admin</div>
      <h1>Users</h1>
      <p class="lede">
        Manage who can sign in and what they can do. Accounts live in the identity provider; this
        manages their FDP <strong>roles</strong> and access. Passwords and email verification stay in the IdP.
      </p>
    </header>

    <div v-if="!auth.isAdmin" class="notice"><p>User management requires the admin role.</p></div>

    <template v-else>
      <div class="toolbar">
        <input
          class="search"
          type="search"
          :value="params.search"
          placeholder="Search username, email, name…"
          aria-label="Search users"
          @input="setSearch(($event.target as HTMLInputElement).value)"
        />
        <button class="btn primary" @click="showCreate = !showCreate">{{ showCreate ? "Cancel" : "+ New user" }}</button>
      </div>

      <div v-if="error" class="error">
        <strong>{{ error.title }}</strong>
        <p>{{ error.message }}</p>
      </div>

      <form v-if="showCreate" class="create" @submit.prevent="submitCreate">
        <div class="create__row">
          <label class="f"><span>Username *</span><input v-model="cUsername" placeholder="jdoe" /></label>
          <label class="f"><span>Email</span><input v-model="cEmail" type="email" placeholder="jdoe@org.example" /></label>
        </div>
        <div class="rolepick">
          <span class="muted">Roles:</span>
          <label v-for="r in roles" :key="r" class="rolechk">
            <input type="checkbox" :checked="cRoles.includes(r)" @change="toggleCreateRole(r)" /> {{ r }}
          </label>
        </div>
        <label class="rolechk"><input v-model="cInvite" type="checkbox" /> Send invite email (set password + verify)</label>
        <div>
          <button class="btn primary" type="submit" :disabled="create.isPending.value">
            {{ create.isPending.value ? "Creating…" : "Create user" }}
          </button>
        </div>
      </form>

      <div v-if="isLoading" class="muted">Loading…</div>
      <div v-else-if="isError" class="muted">Couldn't load users.</div>
      <table v-else class="tbl">
        <thead>
          <tr><th>User</th><th>Email</th><th>Roles</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <template v-for="u in users" :key="u.id">
            <tr :class="{ disabled: !u.enabled }">
              <td>
                <div class="uname">{{ u.username }}<span v-if="isSelf(u)" class="you">you</span></div>
                <div class="sub mono">{{ [u.firstName, u.lastName].filter(Boolean).join(" ") || "—" }}</div>
              </td>
              <td>{{ u.email || "—" }}</td>
              <td>
                <span v-for="r in u.roles" :key="r" class="chip">{{ r }}</span>
                <span v-if="!u.roles.length" class="muted">—</span>
              </td>
              <td><span class="badge" :class="u.enabled ? 'on' : 'off'">{{ u.enabled ? "Enabled" : "Disabled" }}</span></td>
              <td class="actions">
                <button class="btn sm" @click="editId === u.id ? (editId = null) : startEdit(u)">
                  {{ editId === u.id ? "Close" : "Edit" }}
                </button>
                <button class="btn sm ghost danger" :disabled="isSelf(u)" :title="isSelf(u) ? 'You can\'t delete yourself' : ''" @click="onDelete(u)">
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="editId === u.id" class="editrow">
              <td colspan="5">
                <div class="editor">
                  <div class="rolepick">
                    <span class="muted">Roles:</span>
                    <label v-for="r in roles" :key="r" class="rolechk">
                      <input
                        type="checkbox"
                        :checked="draftRoles.includes(r)"
                        :disabled="isSelf(u) && r === 'admin'"
                        @change="toggleRole(r)"
                      />
                      {{ r }}
                    </label>
                  </div>
                  <label class="rolechk">
                    <input type="checkbox" :checked="draftEnabled" :disabled="isSelf(u)" @change="draftEnabled = ($event.target as HTMLInputElement).checked" />
                    Enabled
                  </label>
                  <span v-if="isSelf(u)" class="hint">You can't remove your own admin access or disable yourself.</span>
                  <button class="btn primary sm" :disabled="save.isPending.value" @click="save.mutate(u.id)">
                    {{ save.isPending.value ? "Saving…" : "Save" }}
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!users.length"><td colspan="5" class="muted">No users found.</td></tr>
        </tbody>
      </table>

      <div v-if="pages > 1" class="pager">
        <button class="btn sm" :disabled="page <= 1" @click="step(-1)">‹ Prev</button>
        <span class="muted">Page {{ page }} of {{ pages }} · {{ total }} users</span>
        <button class="btn sm" :disabled="page >= pages" @click="step(1)">Next ›</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 64px 48px;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}
.eyebrow {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 32px;
  color: var(--ink);
}
.lede {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-2);
  max-width: 660px;
}
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 24px 0 12px;
}
.search {
  flex: 1;
}
input {
  font-family: var(--font-sans);
  font-size: 14px;
  padding: 9px 11px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  box-sizing: border-box;
}
.create {
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--surface);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}
.create__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.f {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.f span {
  font-size: 11px;
  color: var(--muted);
}
.f input {
  width: 100%;
}
.rolepick {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}
.rolechk {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--ink);
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.tbl th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
}
.tbl td {
  padding: 10px;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
tr.disabled td {
  opacity: 0.55;
}
.uname {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.you {
  font-size: 10px;
  text-transform: uppercase;
  background: var(--accent-soft);
  color: var(--accent, var(--ink));
  padding: 1px 6px;
  border-radius: 999px;
}
.sub {
  font-size: 11px;
  color: var(--muted);
}
.chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
  margin-right: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}
.badge.on {
  background: var(--ok-soft);
  color: var(--ok);
}
.badge.off {
  background: var(--signal-soft);
  color: var(--signal);
}
.actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.editrow td {
  background: var(--surface-2);
}
.editor {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.hint {
  font-size: 11px;
  color: var(--muted);
}
.pager {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 14px;
}
.notice,
.error {
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  padding: 12px 14px;
  font-size: 13px;
}
.notice {
  color: var(--muted);
}
.error {
  border-color: var(--signal);
  margin-bottom: 12px;
}
.btn.danger {
  color: var(--signal);
}
.muted {
  color: var(--muted);
  font-size: 13px;
}
</style>
