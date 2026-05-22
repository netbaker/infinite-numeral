<template>
  <div class="crit-effect anim-crit-pulse">
    <span class="crit-effect__text">暴击!</span>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.crit-effect {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  white-space: nowrap;
  z-index: 20;
}

.crit-effect__text {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-milestone);
  text-shadow: 0 0 12px rgba(255, 215, 0, 0.8), 0 0 24px rgba(255, 215, 0, 0.4);
  letter-spacing: 4px;
}
</style>
