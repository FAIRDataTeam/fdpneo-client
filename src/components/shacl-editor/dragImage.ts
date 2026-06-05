/**
 * Custom HTML5 drag image for the form designer (Phase 4, task 4.2 polish).
 *
 * The default drag image is a washed-out snapshot of the dragged element; this
 * substitutes a compact accent-coloured chip (grip glyph + label) so palette
 * drags and field-card reorders read clearly over the canvas. The element is
 * appended off-screen, handed to `setDragImage`, then removed once the browser
 * has snapshotted it (next tick).
 */
export function setDragImage(ev: DragEvent, label: string): void {
  if (!ev.dataTransfer) return;
  const el = document.createElement("div");
  el.textContent = `⠿  ${label}`;
  Object.assign(el.style, {
    position: "fixed",
    top: "-1000px",
    left: "-1000px",
    padding: "6px 12px",
    borderRadius: "8px",
    background: "var(--accent)",
    color: "#fff",
    font: "600 13px var(--font-sans, sans-serif)",
    boxShadow: "0 6px 16px rgba(20, 24, 31, 0.25)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);
  ev.dataTransfer.setDragImage(el, 14, 14);
  setTimeout(() => el.remove(), 0);
}
