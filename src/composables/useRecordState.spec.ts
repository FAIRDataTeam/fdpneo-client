/**
 * useRecordState reads the current publication state from the record's meta
 * graph and exposes a transition mutation. On a successful transition it writes
 * the new state straight into the query cache (so the badge updates without a
 * refetch) and invalidates the state-dependent surfaces.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { defineComponent, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { queryKeys } from "@/api/queries";

const fetchRecordState = vi.fn();
const transitionState = vi.fn();
vi.mock("@/api/state", () => ({
  fetchRecordState: (...a: unknown[]) => fetchRecordState(...a),
  transitionState: (...a: unknown[]) => transitionState(...a),
}));

import { useRecordState } from "./useRecordState";

beforeEach(() => {
  fetchRecordState.mockReset();
  transitionState.mockReset();
});

async function run(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let out!: ReturnType<typeof useRecordState>;
  mount(
    defineComponent({
      setup() {
        out = useRecordState(ref(id));
        return () => null;
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } },
  );
  await flushPromises();
  await new Promise((r) => setTimeout(r, 10));
  await flushPromises();
  return { out, queryClient };
}

describe("useRecordState", () => {
  it("exposes the state read from the meta graph", async () => {
    fetchRecordState.mockResolvedValue("PUBLISHED");
    const { out } = await run("dataset/d1");
    expect(out.state.value).toBe("PUBLISHED");
  });

  it("is null when no state is readable", async () => {
    fetchRecordState.mockResolvedValue(null);
    const { out } = await run("dataset/d1");
    expect(out.state.value).toBeNull();
  });

  it("writes the new state into the cache and invalidates dependent queries on a successful transition", async () => {
    fetchRecordState.mockResolvedValue("DRAFT");
    transitionState.mockResolvedValue({ to_state: "PUBLISHED" });
    const { out, queryClient } = await run("dataset/d1");
    expect(out.state.value).toBe("DRAFT");

    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await out.transition.mutateAsync("PUBLISHED");
    await flushPromises();

    expect(transitionState).toHaveBeenCalledWith("dataset/d1", "PUBLISHED");
    // new state is in the cache (badge updates without a refetch)
    expect(queryClient.getQueryData(queryKeys.recordState("dataset/d1"))).toBe("PUBLISHED");
    expect(out.state.value).toBe("PUBLISHED");
    // the record itself is among the invalidated surfaces
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.record("dataset/d1") });
  });
});
