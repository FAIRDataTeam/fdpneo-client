<script setup lang="ts">
/**
 * Recursive tree node. Renders inside ContainerBrowser.
 *
 * Keyboard model:
 *   Enter / Space    → select (emits 'navigate' bubbling up)
 *   ArrowRight       → expand if collapsed, else move into first child
 *   ArrowLeft        → collapse if expanded, else move to parent
 *   (Up/Down handled at the ContainerBrowser level via focus traversal)
 */
import { ref } from "vue";
import type { TreeNode } from "@/data/sampleRecord";

const props = defineProps<{ node: TreeNode; depth?: number; activePath?: string[] }>();
const emit = defineEmits<{ (e: "navigate", id: string): void }>();

const isLeaf = !props.node.children || props.node.children.length === 0;
const startsOpen =
  !!props.activePath?.includes(props.node.id) ||
  (props.depth === 0 && !isLeaf);
const open = ref(startsOpen);
const active = props.activePath?.[props.depth ?? 0] === props.node.id;

function activate() {
  if (!isLeaf) open.value = !open.value;
  emit("navigate", props.node.id);
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    activate();
  } else if (e.key === "ArrowRight" && !isLeaf && !open.value) {
    e.preventDefault();
    open.value = true;
  } else if (e.key === "ArrowLeft" && !isLeaf && open.value) {
    e.preventDefault();
    open.value = false;
  }
}
</script>

<template>
  <div role="treeitem" :aria-expanded="isLeaf ? undefined : open">
    <div
      :class="['node', active ? 'active' : '']"
      tabindex="0"
      :aria-current="active ? 'page' : undefined"
      @click="activate"
      @keydown="onKey"
    >
      <span class="caret">{{ isLeaf ? "·" : open ? "▾" : "▸" }}</span>
      <span class="label">{{ node.label }}</span>
      <span v-if="node.count != null" class="count">{{ node.count }}</span>
    </div>
    <div v-if="!isLeaf && open" class="children" role="group">
      <TreeNode
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :depth="(depth ?? 0) + 1"
        :active-path="activePath ?? []"
        @navigate="(id: string) => emit('navigate', id)"
      />
    </div>
  </div>
</template>
