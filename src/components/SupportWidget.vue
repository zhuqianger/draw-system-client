<template>
  <div class="support-root">
    <transition name="support-pop">
      <section v-if="open" class="support-panel" role="dialog" aria-label="使用助手">
        <header class="support-header">
          <div>
            <div class="support-title">使用助手</div>
            <div class="support-subtitle">根据本系统操作说明回答</div>
          </div>
          <button class="support-close" type="button" aria-label="关闭" @click="open = false">
            <el-icon><Close /></el-icon>
          </button>
        </header>

        <div ref="scroller" class="support-messages">
          <div v-for="(message, index) in messages" :key="index" class="support-row" :class="message.role">
            <div class="support-bubble">
              <div v-if="message.title" class="support-bubble-title">{{ message.title }}</div>
              <div class="support-bubble-text">{{ message.text }}</div>
            </div>
          </div>
          <div v-if="loading" class="support-row assistant">
            <div class="support-bubble support-bubble-text">正在查找说明…</div>
          </div>
        </div>

        <div v-if="suggestions.length" class="support-chips">
          <button
            v-for="item in suggestions"
            :key="item"
            type="button"
            class="support-chip"
            :disabled="loading"
            @click="ask(item)"
          >
            {{ item }}
          </button>
        </div>

        <form class="support-form" @submit.prevent="submit">
          <input
            v-model="draft"
            class="support-input"
            type="text"
            maxlength="200"
            placeholder="例如：队长怎么出价？"
            :disabled="loading"
          />
          <button class="support-send" type="submit" :disabled="loading || !draft.trim()">发送</button>
        </form>
      </section>
    </transition>

    <button
      class="support-fab"
      type="button"
      :aria-expanded="open"
      aria-label="打开使用助手"
      @click="toggle"
    >
      <el-icon :size="26"><ChatDotRound /></el-icon>
    </button>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { ChatDotRound, Close } from '@element-plus/icons-vue'
import { askSupport, getSupportSuggestions } from '../api/support'

const open = ref(false)
const loading = ref(false)
const draft = ref('')
const scroller = ref(null)
const suggestions = ref([
  '管理员怎么创建拍卖流程？',
  '队长怎么出价？',
  '普通池和流拍池有什么区别？'
])
const messages = ref([
  {
    role: 'assistant',
    text: '我可以回答管理员和队长怎么操作，以及费用、摇号、流拍这些规则。点下面的问题，或直接输入你的疑问。'
  }
])

const scrollToEnd = async () => {
  await nextTick()
  if (scroller.value) {
    scroller.value.scrollTop = scroller.value.scrollHeight
  }
}

const toggle = () => {
  open.value = !open.value
  if (open.value) {
    scrollToEnd()
  }
}

const ask = async (question) => {
  const text = question.trim()
  if (!text || loading.value) return
  messages.value.push({ role: 'user', text })
  draft.value = ''
  loading.value = true
  await scrollToEnd()
  try {
    const res = await askSupport(text)
    if (res.code === 200 && res.data) {
      messages.value.push({
        role: 'assistant',
        title: res.data.title || '',
        text: res.data.answer
      })
      if (res.data.suggestions?.length) {
        suggestions.value = res.data.suggestions
      }
    } else {
      messages.value.push({ role: 'assistant', text: res.message || '暂时无法回答，请稍后再试。' })
    }
  } catch (error) {
    messages.value.push({ role: 'assistant', text: '连接服务器失败，请确认后端已启动。' })
  } finally {
    loading.value = false
    await scrollToEnd()
  }
}

const submit = () => {
  ask(draft.value)
}

onMounted(async () => {
  try {
    const res = await getSupportSuggestions()
    if (res.code === 200 && res.data?.length) {
      suggestions.value = res.data
    }
  } catch (error) {
    // 使用页面上的默认问题
  }
})
</script>

<style scoped>
.support-root {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 3000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.support-fab {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, #5b6ee1 0%, #7a4ea8 100%);
  box-shadow: 0 10px 24px rgba(80, 60, 140, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.support-fab:hover {
  transform: translateY(-1px);
}

.support-panel {
  position: absolute;
  right: 0;
  bottom: 68px;
  width: min(380px, calc(100vw - 32px));
  height: min(560px, calc(100vh - 120px));
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(40, 30, 80, 0.28);
}

.support-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  color: #fff;
  background: linear-gradient(135deg, #5b6ee1 0%, #7a4ea8 100%);
}

.support-title {
  font-size: 16px;
  font-weight: 650;
}

.support-subtitle {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.85;
}

.support-close {
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 18px;
}

.support-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: #f6f7fb;
}

.support-row {
  display: flex;
  margin-bottom: 10px;
}

.support-row.user {
  justify-content: flex-end;
}

.support-bubble {
  max-width: 88%;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  color: #303133;
  line-height: 1.55;
  font-size: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.support-row.user .support-bubble {
  background: #5b6ee1;
  color: #fff;
}

.support-bubble-title {
  margin-bottom: 4px;
  font-weight: 650;
  color: #5b4b8a;
}

.support-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 12px 0;
  background: #fff;
}

.support-chip {
  flex: 0 0 auto;
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #606266;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.support-chip:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.support-form {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #fff;
}

.support-input {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  outline: none;
}

.support-input:focus {
  border-color: #5b6ee1;
}

.support-send {
  border: none;
  border-radius: 8px;
  padding: 0 14px;
  background: #5b6ee1;
  color: #fff;
  cursor: pointer;
}

.support-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.support-pop-enter-active,
.support-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.support-pop-enter-from,
.support-pop-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
