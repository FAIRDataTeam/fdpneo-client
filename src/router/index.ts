/**
 * Application router.
 *
 * Routes are lazy-loaded so the visual editors and dashboard (which pull in
 * heavy dependencies like Vue Flow and Chart.js) don't bloat the initial
 * bundle for users who only browse metadata.
 *
 * Auth-required routes go through the `requireAuth` guard, which redirects
 * unauthenticated users to the OIDC login flow.
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth";

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
    meta: { title: "Search" },
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
    meta: { title: "SPARQL" },
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
    path: "/metrics",
    name: "metrics",
    component: () => import("@/views/MetricsDashboardView.vue"),
    meta: { title: "Metrics" },
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

router.beforeEach((to) => {
  if (typeof to.meta.title === "string") {
    document.title = `${to.meta.title} — FAIR Data Point`;
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
