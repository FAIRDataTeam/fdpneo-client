// Runtime configuration placeholder.
//
// In a container deployment the entrypoint OVERWRITES this file from environment
// variables ($FDP_API_URL / $FDP_PUBLIC_ORIGIN) before nginx starts, so one
// built image serves any deployment. For `npm run dev` and static hosting this
// empty default leaves the build-time VITE_* values (and same-origin) in effect.
window.__FDP_CONFIG__ = {};
