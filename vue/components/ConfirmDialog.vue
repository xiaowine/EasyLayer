<template>
    <div v-if="open" class="modal" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <div class="modal-panel">
            <h3 :id="titleId">{{ title }}</h3>
            <p v-html="message"></p>
            <div class="modal-actions">
                <button class="btn" @click="$emit('cancel')">{{ cancelLabel }}</button>
                <button class="btn confirm" @click="$emit('confirm')">{{ confirmLabel }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
    open: { type: Boolean, required: true },
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    confirmLabel: { type: String, default: '确认' },
    cancelLabel: { type: String, default: '取消' },
})

defineEmits(['confirm', 'cancel'])

const titleId = computed(() => 'confirm-' + Math.random().toString(36).slice(2, 9))
</script>

<style scoped lang="scss">
.modal {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(2, 6, 23, 0.6)
}

.modal-panel {
    background: var(--panel);
    padding: 12px;
    border-radius: 8px;
    width: 280px;
    border: 1px solid var(--border)
}

.modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px
}

.btn {
    height: 32px;
    padding: 6px 10px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer
}

.btn.confirm {
    background: var(--accent);
    color: white
}
</style>
