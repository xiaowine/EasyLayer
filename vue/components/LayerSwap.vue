<template>
    <div class="layer-swap-root" role="region" aria-label="图层交换面板">
        <div class="card">
            <!-- 上半：交换 -->
            <div class="section swap-section">
                <div class="label">交换图层内导线</div>
                <div class="controls">
                    <select v-model="selectedA" class="select">
                        <option v-for="(l, i) in raw" :key="l.id" :value="i">{{ l.name }}</option>
                    </select>

                    <button class="btn" type="button" @click.prevent="swapNow" title="交换所选图层" aria-label="交换">↔</button>

                    <select v-model="selectedB" class="select">
                        <option v-for="(l, i) in raw" :key="'b-' + l.id" :value="i">{{ l.name }}</option>
                    </select>
                </div>
                <div class="center-row"><button class="btn swap" @click="requestSwap"
                        :aria-label="`请求交换 ${raw[selectedA]?.name ?? ''} 与 ${raw[selectedB]?.name ?? ''}`">交换导线</button>
                </div>
            </div>

            <!-- 下半：删除 -->
            <div class="section del-section">
                <div class="label">删除图层内导线</div>
                <div class="controls">
                    <select v-model="selectedDel" class="select delete-select">
                        <option v-for="(l, i) in raw" :key="'del-' + l.id" :value="i">{{ l.name }}
                        </option>
                    </select>
                    <button class="btn delete" @click="requestDelete" :disabled="raw.length === 0"
                        :aria-label="`删除 ${raw[selectedDel]?.name ?? ''}`">
                        <span class="icon">🗑</span>
                        <span class="label">删除导线</span>
                    </button>
                </div>
            </div>
        </div>

        <ConfirmDialog :open="showConfirm" title="确认删除"
            :message="`确定删除图层 “${raw[indexToDelete ?? selectedDel]?.name ?? ''}” 内导线吗？`" confirmLabel="删除"
            cancelLabel="取消" @confirm="confirmDelete" @cancel="cancelDelete" />
    </div>

    <ConfirmDialog :open="showSwapConfirm" title="确认交换"
        :message="`确定交换图层 “${raw[selectedA]?.name ?? ''}” 与 “${raw[selectedB]?.name ?? ''}” 内导线吗？`" confirmLabel="交换"
        cancelLabel="取消" @confirm="confirmSwap" @cancel="cancelSwap" />
</template>

<script setup lang="ts">
import ConfirmDialog from './ConfirmDialog.vue'
import { ref, onMounted, watch } from 'vue'
import { isEDA } from '../utils/utils';

const loading = ref(false)
const raw = ref<IPCB_LayerItem[]>([])
const selectedA = ref(0)
const selectedB = ref(1)
const selectedDel = ref(0)

const showConfirm = ref(false)
const indexToDelete = ref<number | null>(null)

const showSwapConfirm = ref(false)


async function refreshLayers() {
    loading.value = true
    try {
        if (isEDA) {
            const allowedTypes = new Set([1, 2, 15, 16, 17, 18, 19, 20, 21, 22]);
            const allLayers = (await eda.pcb_Layer.getAllLayers()) ?? [];
            raw.value = allLayers
                .filter(layer => allowedTypes.has(layer.id) && Boolean(layer.layerStatus))
                .map(layer => {
                    let name = layer.name ?? '';
                    if (name === 'Top Layer') name = '顶层';
                    else if (name === 'Bottom Layer') name = '底层';
                    else if (name.includes('Inner')) name = name.replace(/Inner/g, '内层');
                    return { ...layer, name };
                });
        } else {
            raw.value = Array.from({ length: 6 }).map((_, i) => ({
                id: i + 1,
                name: `Layer ${i + 1}`,
                type: i % 2 === 0 ? 'INTERNAL_ELECTRICAL' : 'SIGNAL',
                color: '#000000',
                transparency: 0,
                inactiveColor: '#222222',
                inactiveTransparency: 0,
                layerStatus: 0,
                locked: false,
            })) as unknown as IPCB_LayerItem[]
        }
    } finally {
        loading.value = false
    }
}

function normalizeSelections() {
    selectedA.value = Math.max(0, Math.min(selectedA.value, raw.value.length - 1))
    selectedB.value = Math.max(0, Math.min(selectedB.value, raw.value.length - 1))
    selectedDel.value = 0
}

async function performSwap(aId: number, bId: number) {
    loading.value = true
    if (isEDA) {
        const [aLineIds, bLineIds] = await Promise.all([
            eda.pcb_PrimitiveLine.getAllPrimitiveId(undefined, aId),
            eda.pcb_PrimitiveLine.getAllPrimitiveId(undefined, bId),
        ])
        console.log(`Swapping ${aLineIds.length} primitives from layer ${aId} with ${bLineIds.length} primitives from layer ${bId}...`)
        await Promise.all([
            ...aLineIds.map(id => eda.pcb_PrimitiveLine.modify(id, { layer: bId })),
            ...bLineIds.map(id => eda.pcb_PrimitiveLine.modify(id, { layer: aId })),
        ])
    }
    loading.value = false
    await refreshLayers()
    normalizeSelections()
}

async function performDelete(layerId: number) {
    loading.value = true
    if (isEDA) {
        const ids = await eda.pcb_PrimitiveLine.getAllPrimitiveId(undefined, layerId);
        console.log(`Deleting ${ids.length} primitives from layer ${layerId}...`)
        for (const id of ids) {
            await eda.pcb_PrimitiveLine.delete(id)
        }
    }
    loading.value = true
    await refreshLayers()
    normalizeSelections()
}


function requestSwap() {
    if (selectedA.value === selectedB.value) return
    showSwapConfirm.value = true
}

function cancelSwap() {
    showSwapConfirm.value = false
}

async function swapNow() {
    if (selectedA.value == null || selectedB.value == null) return
    if (selectedA.value === selectedB.value) return
    const aIndex = selectedA.value
    const bIndex = selectedB.value
    selectedA.value = bIndex
    selectedB.value = aIndex
}

async function confirmSwap() {
    if (selectedA.value == null || selectedB.value == null) return
    const aIndex = selectedA.value
    const bIndex = selectedB.value
    const aId = raw.value[aIndex]?.id
    const bId = raw.value[bIndex]?.id
    if (aId == null || bId == null) return
    await performSwap(aId, bId)
    cancelSwap()
}

function requestDelete() {
    indexToDelete.value = selectedDel.value
    showConfirm.value = true
}

function cancelDelete() {
    indexToDelete.value = null
    showConfirm.value = false
}

async function confirmDelete() {
    if (indexToDelete.value == null) return
    const idx = indexToDelete.value
    const id = raw.value[idx]?.id
    if (id == null) return
    await performDelete(id)
    cancelDelete()
}

onMounted(async () => {
    await refreshLayers()
    selectedA.value = 0
    selectedB.value = Math.min(1, Math.max(0, raw.value.length - 1))
    selectedDel.value = 0
})

watch(
    loading,
    (newVal) => {
        if (isEDA) {
            if (newVal) {
                eda.sys_LoadingAndProgressBar.showLoading();
            } else {
                eda.sys_LoadingAndProgressBar.destroyLoading();
            }
        }
    },
    { flush: 'sync' },
)
</script>

<style lang="scss" scoped>
.layer-swap-root {
    padding: 12px;
}

.card {
    background: var(--panel);
    border: 1px solid var(--border);
    padding: 8px;
    border-radius: 10px;
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.section {
    display: flex;
    flex-direction: column;
    gap: 8px
}

.label {
    color: var(--muted);
    font-size: 12px
}

.controls {
    display: flex;
    gap: 8px;
    align-items: center
}

.center-row {
    display: flex;
    justify-content: center
}

.select {
    height: 32px;
    padding: 4px 8px;
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    min-width: 120px;
}

.select option {
    background: var(--panel);
    color: var(--text);
}

.delete-select {
    min-width: 140px
}

.btn {
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.14s ease;
}

.btn .icon {
    margin-right: 6px;
    font-size: 14px;
    display: inline-flex
}

.btn.swap {
    color: var(--accent);
    font-weight: 600;
    background: rgba(58, 160, 255, 0.06)
}

.btn.delete {
    color: #FF4D4F;
    background: transparent;
    border: 1px solid rgba(255, 77, 79, 0.12);
    padding: 6px 10px
}

.btn.delete:hover {
    background: rgba(255, 77, 79, 0.06);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(2, 6, 23, 0.5)
}

.btn.delete:active {
    transform: translateY(0)
}

.btn.confirm {
    background: var(--accent);
    color: white
}

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
    width: 320px;
    border: 1px solid var(--border)
}

.modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px
}

.sr {
    position: absolute;
    left: -9999px
}
</style>
