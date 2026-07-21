<template>
  <div
    class="factor-card"
    :class="[
      `factor-card--${def.category}`,
      { 'factor-card--inactive': !isActive, 'factor-card--maxed': isMaxed },
    ]"
  >
    <!-- 头部：图标 + 名称 + 等级 -->
    <div class="factor-card__header">
      <span class="factor-card__icon">{{ def.icon }}</span>
      <span class="factor-card__name">{{ def.name }}</span>
      <span class="factor-card__level">Lv.{{ level }}/{{ def.maxLevel }}</span>
    </div>

    <!-- 描述 -->
    <div class="factor-card__desc">{{ def.description }}</div>

    <!-- 效果值 -->
    <div class="factor-card__effect">
      <span class="factor-card__effect-label">效果:</span>
      <span class="factor-card__effect-value" :class="'factor-card__effect--' + def.effectType">
        {{ effectLabel }}
      </span>
    </div>

    <!-- 底部状态条：等级进度 + 分类标签 -->
    <div class="factor-card__footer">
      <span class="factor-card__category" :class="'factor-card__cat--' + def.category">
        {{ categoryLabel }}
      </span>
      <div v-if="!isMaxed" class="factor-card__bar">
        <div
          class="factor-card__bar-fill"
          :style="{ width: (level / def.maxLevel * 100) + '%' }"
        />
      </div>
      <span v-else class="factor-card__maxed">◆ 已穷尽</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FactorDef, FactorCategory } from '@/types/game';

const props = defineProps<{
  def: FactorDef;
  level: number;
  active: boolean;
}>();

const isActive = computed(() => props.active);
const isMaxed = computed(() => props.level >= props.def.maxLevel);

/** 效果描述文本 */
const effectLabel = computed(() => {
  const d = props.def;
  const lv = props.level;
  if (lv <= 0 || !isActive.value) return '— 未激活';
  const eff = d.baseEffect + d.effectPerLevel * (lv - 1);
  switch (d.effectType) {
    case 'click_multiplier':
      return `点击 ×${eff.toFixed(2)}`;
    case 'producer_multiplier':
      return `产出 ×${eff.toFixed(2)}`;
    case 'global_multiplier':
      return `全局 ×${eff.toFixed(2)}`;
    case 'cost_discount':
      return `-${(eff * 100).toFixed(0)}% 成本`;
    default:
      return `+${eff.toFixed(2)}`;
  }
});

/** 分类显示名称 */
const catNames: Record<FactorCategory, string> = {
  prime: '素数',
  perfect: '幂次',
  fibonacci: '斐波那契',
  power: '整幂',
  repdigit: '重复',
  special: '常数',
};
const categoryLabel = computed(() => catNames[props.def.category]);
</script>

<style scoped>
.factor-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 10px;
  border-radius: var(--border-radius, 4px);
  border: 1px solid var(--color-border);
  background: var(--color-surface, var(--color-border));
  transition: border-color 0.2s ease, background 0.2s ease;
}

.factor-card:hover:not(.factor-card--inactive) {
  background: rgba(255, 255, 255, 0.05);
}

/* ---- 分类着色 ---- */
.factor-card--prime     { border-left: 3px solid #ce93d8; }
.factor-card--perfect  { border-left: 3px solid #4dd0e1; }
.factor-card--fibonacci{ border-left: 3px solid #a5d6a7; }
.factor-card--power    { border-left: 3px solid #ffcc80; }
.factor-card--repdigit { border-left: 3px solid #ef9a9a; }
.factor-card--special  { border-left: 3px solid #b39ddb; }

/* ---- 非激活态 ---- */
.factor-card--inactive {
  opacity: 0.35;
  filter: grayscale(0.5);
}
.factor-card--inactive .factor-card__name {
  color: var(--color-text-dim, var(--color-text-dim));
}
.factor-card--maxed {
  border-left-width: 4px;
}
.factor-card--maxed .factor-card__level {
  color: #ffd54f;
  font-weight: 700;
}

/* ---- Header ---- */
.factor-card__header {
  display: flex;
  align-items: center;
  gap: 5px;
}
.factor-card__icon { font-size: 14px; line-height: 1; }
.factor-card__name {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text, #eee);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.factor-card__level {
  font-size: 10px;
  color: var(--color-narrative, #aaa);
  font-weight: 500;
  white-space: nowrap;
}

/* ---- 描述 ---- */
.factor-card__desc {
  font-size: 10px;
  color: var(--color-text-dim, #999);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---- 效果 ---- */
.factor-card__effect {
  display: flex;
  align-items: center;
  gap: 4px;
}
.factor-card__effect-label {
  font-size: 10px;
  color: var(--color-text-dim, #999);
}
.factor-card__effect-value {
  font-size: 11px;
  font-weight: 600;
}
.factor-card__effect--click_multiplier    { color: #ce93d8; }
.factor-card__effect--producer_multiplier { color: #4dd0e1; }
.factor-card__effect--global_multiplier   { color: #ffd54f; }
.factor-card__effect--cost_discount       { color: #a5d6a7; }

/* ---- Footer ---- */
.factor-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.factor-card__category {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--color-border);
  color: var(--color-text-dim, #999);
  white-space: nowrap;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.factor-card__cat--prime     { background: rgba(206,147,216,0.12); color: #ce93d8; }
.factor-card__cat--perfect  { background: rgba(77,208,225,0.12); color: #4dd0e1; }
.factor-card__cat--fibonacci{ background: rgba(165,214,167,0.12); color: #a5d6a7; }
.factor-card__cat--power    { background: rgba(255,204,128,0.12); color: #ffcc80; }
.factor-card__cat--repdigit { background: rgba(239,154,154,0.12); color: #ef9a9a; }
.factor-card__cat--special  { background: rgba(179,155,219,0.12); color: #b39ddb; }

/* ---- 进度条 ---- */
.factor-card__bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
  overflow: hidden;
}
.factor-card__bar-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(255,215,0,0.4), rgba(255,215,0,0.8));
  transition: width 0.3s ease;
}
.factor-card__maxed {
  font-size: 9px;
  color: #ffd54f;
  font-weight: 600;
  margin-left: auto;
}

/* ---- 移动端适配 ---- */
@media (max-width: 767px) {
  .factor-card { padding: 5px 8px; gap: 2px; }
  .factor-card__name { font-size: 11px; }
  .factor-card__desc { font-size: 9px; -webkit-line-clamp: 1; }
  .factor-card__effect-value { font-size: 10px; }
  .factor-card__level { font-size: 9px; }
}
</style>
