<template>
  <Teleport to="body">
    <div v-if="visible" class="help-overlay" @click.self="emit('close')">
      <div class="help-card">
        <h2>游戏指引</h2>
        <div class="help-section">
          <h3>核心玩法</h3>
          <p>点击中央<b>脉冲按钮</b>获取数字 → 买<b>生产者</b>自动产出 → 买<b>升级</b>提速。</p>
          <p>数字达到 <b>100T (10^14)</b> 时解锁<b>坍缩</b>，重置并获取星尘，以更强姿态重来。</p>
        </div>
        <div class="help-section">
          <h3>Prestige 层</h3>
          <div class="help-row"><span class="hl-prestige">✦ 坍缩</span> 数字≥10^14 → 获得星尘，全局倍率提升</div>
          <div class="help-row"><span class="hl-expand">◉ 膨胀</span> 累计星尘≥100 → 获得暗能量</div>
          <div class="help-row"><span class="hl-transcend">◆ 超越</span> 累计暗能≥100 → 获得奇点，元升级</div>
        </div>
        <div class="help-section">
          <h3>操作技巧</h3>
          <div class="help-row">批量购买：生产者卡片可切换 <b>×1 ×5 ×10 ×100 ×MAX</b></div>
          <div class="help-row">自动存档每30秒，手动存档点底栏 ⚙ → 保存</div>
          <div class="help-row">手机端用底部标签切换生产者和升级面板</div>
        </div>
        <button class="help-close" @click="emit('close')">知道了</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { visible } = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();
</script>

<style scoped>
.help-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); }
.help-card { width: 420px; max-width: 92vw; max-height: 85vh; overflow-y: auto; padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--border-radius); }
.help-card h2 { text-align: center; margin-bottom: var(--spacing-md); color: var(--color-text); }
.help-section { margin-bottom: var(--spacing-md); }
.help-section h3 { font-size: 13px; color: var(--color-narrative); margin-bottom: var(--spacing-xs); border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 4px; }
.help-section p { font-size: 12px; color: var(--color-text-dim); line-height: 1.6; margin-bottom: 4px; }
.help-row { font-size: 12px; color: var(--color-text-dim); margin-bottom: 4px; }
.hl-prestige { color: var(--color-prestige); font-weight: 600; }
.hl-expand { color: #00bcd4; font-weight: 600; }
.hl-transcend { color: #ffd700; font-weight: 600; }
.help-close { display: block; width: 100%; margin-top: var(--spacing-md); padding: 10px; background: var(--color-surface-hover); color: var(--color-text); border-radius: var(--border-radius); cursor: pointer; font-size: 14px; }
</style>
