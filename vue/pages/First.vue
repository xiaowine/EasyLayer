<template>
    <div class="page-root">
        <LayerSwap />
    </div>
</template>

<script setup lang="ts">
import LayerSwap from '../components/LayerSwap.vue'
</script>

<style lang="scss" scoped>
.page-root {
    background: var(--bg);
    color: var(--text);
    display: flex;
    flex-direction: column;
    align-items: flex-start
}
</style>
