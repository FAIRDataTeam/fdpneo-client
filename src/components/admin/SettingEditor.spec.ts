/**
 * SettingEditor validates the JSON client-side before PUTting: bad syntax or a
 * non-object value is rejected inline without hitting the server; a valid object
 * is sent as-is. Non-admins get a read-only view with no controls.
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

function mountEditor(canEdit = true) {
  return mount(SettingEditor, {
    props: { settingKey: "search.filters", value: { filters: [] }, canEdit },
    global: { plugins: [VueQueryPlugin] },
  });
}

beforeEach(() => {
  putSetting.mockClear();
  resetSetting.mockClear();
});

describe("SettingEditor", () => {
  it("rejects invalid JSON without calling the server", async () => {
    const w = mountEditor();
    await w.find("textarea").setValue("{ not valid");
    await w.get(".btn.primary").trigger("click");
    await flushPromises();
    expect(putSetting).not.toHaveBeenCalled();
    expect(w.find(".error").text()).toContain("Invalid JSON");
  });

  it("rejects a non-object value", async () => {
    const w = mountEditor();
    await w.find("textarea").setValue("[1, 2, 3]");
    await w.get(".btn.primary").trigger("click");
    await flushPromises();
    expect(putSetting).not.toHaveBeenCalled();
    expect(w.find(".error").text()).toContain("must be a JSON object");
  });

  it("PUTs a valid object", async () => {
    const w = mountEditor();
    await w.find("textarea").setValue('{ "filters": [{ "field": "type" }] }');
    await w.get(".btn.primary").trigger("click");
    await flushPromises();
    expect(putSetting).toHaveBeenCalledWith("search.filters", { filters: [{ field: "type" }] });
  });

  it("is read-only for non-admins", () => {
    const w = mountEditor(false);
    expect(w.find(".btn").exists()).toBe(false);
    expect(w.find("textarea").attributes("readonly")).toBeDefined();
  });
});
