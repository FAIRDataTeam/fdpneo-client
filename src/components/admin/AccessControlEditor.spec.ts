/**
 * AccessControlEditor edits `access.control` as a mode switch plus (open mode
 * only) a comma-separated writer-role list, and emits the server's JSON shape.
 */

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import AccessControlEditor from "./AccessControlEditor.vue";

function mountWith(initial: Record<string, unknown>, canEdit = true) {
  const Host = defineComponent({
    components: { AccessControlEditor },
    setup() {
      const value = ref<Record<string, unknown>>(initial);
      return { value, canEdit };
    },
    template: `<AccessControlEditor v-model="value" :can-edit="canEdit" />`,
  });
  return mount(Host);
}

describe("AccessControlEditor", () => {
  it("renders the open default with its writer roles", () => {
    const w = mountWith({ mode: "open", writer_roles: ["admin", "steward"] });
    const radios = w.findAll('input[type="radio"]');
    expect((radios[0]?.element as HTMLInputElement).checked).toBe(true);
    expect((w.find("input.mono").element as HTMLInputElement).value).toBe("admin, steward");
  });

  it("switching to ODRL emits the mode and hides the writer roles", async () => {
    const w = mountWith({ mode: "open", writer_roles: ["admin", "steward"] });
    await w.find('input[value="odrl"]').setValue();
    expect((w.vm as unknown as { value: Record<string, unknown> }).value).toEqual({
      mode: "odrl",
      writer_roles: ["admin", "steward"],
    });
    expect(w.find("input.mono").exists()).toBe(false);
  });

  it("parses the writer-role list and warns when it is empty", async () => {
    const w = mountWith({ mode: "open", writer_roles: ["admin"] });
    await w.find("input.mono").setValue(" curator ,steward,, ");
    expect((w.vm as unknown as { value: Record<string, unknown> }).value).toEqual({
      mode: "open",
      writer_roles: ["curator", "steward"],
    });
    expect(w.find(".warn").exists()).toBe(false);
    await w.find("input.mono").setValue("");
    expect(w.find(".warn").exists()).toBe(true);
  });

  it("is inert for non-admins", () => {
    const w = mountWith({ mode: "open", writer_roles: ["admin"] }, false);
    expect((w.find("fieldset").element as HTMLFieldSetElement).disabled).toBe(true);
  });
});
