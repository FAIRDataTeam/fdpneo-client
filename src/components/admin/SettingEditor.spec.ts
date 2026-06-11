/**
 * SettingEditor edits a key's value. Unknown keys use the raw-JSON textarea:
 * bad syntax or a non-object value is rejected inline without hitting the
 * server; a valid object is sent as-is. Known keys (e.g. `search.filters`) get a
 * structured form that assembles the same JSON. Non-admins get a read-only view.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";

const putSetting = vi.fn().mockResolvedValue({});
const resetSetting = vi.fn().mockResolvedValue(undefined);
vi.mock("@/api/settings", () => ({
  putSetting: (k: string, v: unknown) => putSetting(k, v),
  resetSetting: (k: string) => resetSetting(k),
}));

import SettingEditor from "./SettingEditor.vue";

// An unknown key (no structured editor) → the raw-JSON textarea path.
function mountJsonEditor(canEdit = true) {
  return mount(SettingEditor, {
    props: { settingKey: "instance.unknown", value: {}, canEdit },
    global: { plugins: [VueQueryPlugin] },
  });
}

beforeEach(() => {
  putSetting.mockClear();
  resetSetting.mockClear();
});

describe("SettingEditor (raw JSON)", () => {
  it("rejects invalid JSON without calling the server", async () => {
    const w = mountJsonEditor();
    await w.find("textarea").setValue("{ not valid");
    await w.get(".btn.primary").trigger("click");
    await flushPromises();
    expect(putSetting).not.toHaveBeenCalled();
    expect(w.find(".error").text()).toContain("Invalid JSON");
  });

  it("rejects a non-object value", async () => {
    const w = mountJsonEditor();
    await w.find("textarea").setValue("[1, 2, 3]");
    await w.get(".btn.primary").trigger("click");
    await flushPromises();
    expect(putSetting).not.toHaveBeenCalled();
    expect(w.find(".error").text()).toContain("must be a JSON object");
  });

  it("PUTs a valid object", async () => {
    const w = mountJsonEditor();
    await w.find("textarea").setValue('{ "a": 1 }');
    await w.get(".btn.primary").trigger("click");
    await flushPromises();
    expect(putSetting).toHaveBeenCalledWith("instance.unknown", { a: 1 });
  });

  it("is read-only for non-admins", () => {
    const w = mountJsonEditor(false);
    expect(w.find(".btn").exists()).toBe(false);
    expect(w.find("textarea").attributes("readonly")).toBeDefined();
  });
});

describe("SettingEditor (structured)", () => {
  it("renders the structured form for search.filters (no JSON textarea)", () => {
    const w = mount(SettingEditor, {
      props: { settingKey: "search.filters", value: { filters: [] }, canEdit: true },
      global: { plugins: [VueQueryPlugin] },
    });
    expect(w.find("textarea").exists()).toBe(false);
  });

  it("assembles the value from the form and PUTs it", async () => {
    const w = mount(SettingEditor, {
      props: { settingKey: "search.filters", value: { filters: [] }, canEdit: true },
      global: { plugins: [VueQueryPlugin] },
    });
    await w.get(".add").trigger("click"); // add a facet row
    const inputs = w.findAll("input");
    await inputs[0]!.setValue("theme");
    await inputs[1]!.setValue("Theme");
    await inputs[2]!.setValue("http://www.w3.org/ns/dcat#theme");
    await w.get(".btn.primary").trigger("click");
    await flushPromises();
    expect(putSetting).toHaveBeenCalledWith("search.filters", {
      filters: [
        {
          name: "theme",
          label: "Theme",
          predicate: "http://www.w3.org/ns/dcat#theme",
          type_filter: null,
        },
      ],
    });
  });
});
