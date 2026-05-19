<script setup lang="ts"></script>

<template>
  <footer>
    <div class="left">
      <span>FDP Neo · v2.0.0-preview</span>
      <span>·</span>
      <span>Conforms to FDP Spec 1.2</span>
    </div>
    <div class="right">
      <a href="#">API</a>
      <a href="#">About</a>
      <a href="#">Specification</a>
    </div>
  </footer>
</template>

<style scoped>
footer {
  padding: 20px 28px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
  background: var(--surface);
}
.left,
.right {
  display: flex;
  gap: 14px;
}
.right a {
  color: inherit;
}
</style>
