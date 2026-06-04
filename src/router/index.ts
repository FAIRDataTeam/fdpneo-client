/**
 * Application router.
 *
 * Routes are lazy-loaded so the visual editors and dashboard (which pull in
 * heavy dependencies like Vue Flow and Chart.js) don't bloat the initial
 * bundle for users who only browse metadata.
 *
 * Auth-required routes go through the `requireAuth` guard, which redirects
 * unauthenticated users to the OIDC login flow.
 *
 * Routes carrying `meta.feature` are gated on the server's feature flags
 * (`GET /config`): when the server reports the feature disabled, the route
 * redirects to not-found (TASKS 10.1). Features default permissive, so this
 * only hides a route the server explicitly turned off.
 */

import {
  createRouter,
  createWebHistory,
  type RouteMeta,
  type RouteRecordRaw,
} from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import type { FeatureFlags } from "@/api/config";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "browse",
    component: () => import("@/views/MetadataBrowseView.vue"),
    meta: { title: "Browse" },
  },
  {
    path: "/search",
    name: "search",
    component: () => import("@/views/SearchView.vue"),
    meta: { title: "Search", feature: "search" },
  },
  {
    path: "/records/:id+",
    name: "record-detail",
    component: () => import("@/views/RecordDetailView.vue"),
    props: true,
    meta: { title: "Record" },
  },
  {
    path: "/records/:id+/edit",
    name: "record-edit",
    component: () => import("@/views/EntityEditView.vue"),
    props: true,
    meta: { title: "Edit record", requiresAuth: true },
  },
  {
    path: "/create/:type",
    name: "entity-create",
    component: () => import("@/views/EntityCreateView.vue"),
    meta: { title: "Create record", requiresAuth: true },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("@/views/StewardDashboardView.vue"),
    meta: { title: "My metadata", requiresAuth: true },
  },
  {
    path: "/repository/edit",
    name: "repository-edit",
    component: () => import("@/views/RepositoryEditView.vue"),
    meta: { title: "Edit repository", requiresAuth: true },
  },
  {
    path: "/sparql",
    name: "sparql",
    component: () => import("@/views/SparqlPlaygroundView.vue"),
    meta: { title: "SPARQL", feature: "sparql" },
  },
  {
    path: "/schemas",
    name: "schemas",
    component: () => import("@/views/SchemaEditorView.vue"),
    meta: { title: "Schemas", requiresAuth: true },
  },
  {
    path: "/policies",
    name: "policies",
    component: () => import("@/views/PolicyEditorView.vue"),
    meta: { title: "Policies", requiresAuth: true },
  },
  {
    path: "/admin/resource-definitions",
    name: "resource-definitions",
    component: () => import("@/views/ResourceDefinitionAdminView.vue"),
    meta: { title: "Resource types", requiresAuth: true },
  },
  {
    path: "/admin/settings",
    name: "instance-settings",
    component: () => import("@/views/SettingsView.vue"),
    meta: { title: "Settings", requiresAuth: true },
  },
  {
    path: "/account/tokens",
    name: "api-keys",
    component: () => import("@/views/ApiKeysView.vue"),
    meta: { title: "Access tokens", requiresAuth: true },
  },
  {
    path: "/metrics",
    name: "metrics",
    component: () => import("@/views/MetricsDashboardView.vue"),
    meta: { title: "Metrics", feature: "metrics" },
  },
  {
    path: "/auth/callback",
    name: "auth-callback",
    component: () => import("@/views/AuthCallbackView.vue"),
    meta: { title: "Signing in…" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/views/NotFoundView.vue"),
    meta: { title: "Not found" },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * Whether a route is blocked by a disabled server feature. Pure so it can be
 * unit-tested without a live router. A route with no `meta.feature` is never
 * blocked; otherwise it is blocked only when the flag is explicitly `false`.
 */
export function routeFeatureBlocked(meta: RouteMeta, features: FeatureFlags): boolean {
  const feature = meta.feature as keyof FeatureFlags | undefined;
  return feature ? features[feature] === false : false;
}

router.beforeEach((to) => {
  if (typeof to.meta.title === "string") {
    document.title = `${to.meta.title} — FAIR Data Point`;
  }

  if (routeFeatureBlocked(to.meta, useConfigStore().features)) {
    return { name: "not-found" };
  }

  if (!to.meta.requiresAuth) return true;

  const auth = useAuthStore();
  if (auth.isAuthenticated) return true;

  // Kick off the IdP redirect. The auth store rides the `returnTo` in the
  // OIDC `state` parameter so it survives the round-trip back to
  // /auth/callback even on a hard reload. Cancel this in-app navigation so
  // the protected view never paints.
  void auth.login(to.fullPath);
  return false;
});
