/** UpdateCheckEditor: a checkbox bound to `{ enabled }`. */

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import UpdateCheckEditor from "./UpdateCheckEditor.vue";

describe("UpdateCheckEditor", () => {
  it("reflects and writes the enabled flag", async () => {
    const w = mount(UpdateCheckEditor, {
      props: {
        modelValue: { enabled: true },
        canEdit: true,
        "onUpdate:modelValue": (v: unknown) => w.setProps({ modelValue: v as Record<string, unknown> }),
      },
    });
    const box = w.find('input[type="checkbox"]');
    expect((box.element as HTMLInputElement).checked).toBe(true);
    await box.setValue(false);
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([{ enabled: false }]);
  });

  it("is read-only without edit rights", () => {
    const w = mount(UpdateCheckEditor, { props: { modelValue: { enabled: false }, canEdit: false } });
    expect(w.find("input").attributes("disabled")).toBeDefined();
  });
});
