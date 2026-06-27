// Runtime configuration placeholder.
//
// In a container deployment the entrypoint OVERWRITES this file from environment
// variables ($FDP_API_URL / $FDP_PUBLIC_ORIGIN) before nginx starts, so one
// built image serves any deployment. For `npm run dev` and static hosting this
// empty default leaves the build-time VITE_* values (and same-origin) in effect.
//
// Deployer white-labeling (optional) — match your organisation's look & feel
// without rebuilding the image. Add a `branding` block:
//
//   window.__FDP_CONFIG__ = {
//     branding: {
//       orgName: "Erasmus MC Data Repository",   // header lockup label
//       logoUrl: "/branding/logo.svg",           // header lockup
//       logoUrlDark: "/branding/logo-dark.svg",  // optional dark-theme variant
//       faviconUrl: "/branding/icon.svg",         // browser-tab icon (falls back to logoUrl)
//       faviconUrlDark: "/branding/icon-dark.svg",// optional dark-theme variant
//       theme:     { "--accent": "#7a1f2b", "--signal": "#0d6e6e" },  // light overrides
//       themeDark: { "--accent": "#e08aa0" },                         // dark overrides
//     },
//   };
//
// Only an allowlisted set of CSS custom properties is honoured (see
// src/composables/useBranding.ts -> BRANDABLE_TOKENS): --accent, --accent-deep,
// --accent-soft, --accent-line, --signal, --signal-soft, --paper, --paper-deep,
// --surface, --ink. Unknown keys are ignored. Serve logos same-origin (or as a
// data: URI) to satisfy the img-src CSP (see index.html).
window.__FDP_CONFIG__ = {};
