<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Client, createProxyService } from '@mukea/electron-callback-rpc'
import { IDemoService } from '@shared/interfaces'
import { TestRunner } from './utils/test-runner'
import DemoPanel from './components/DemoPanel.vue'
import TestPanel from './components/TestPanel.vue'
import CallbackTestPanel from './components/CallbackTestPanel.vue'
import BenchmarkPanel from './components/BenchmarkPanel.vue'
import StressTestPanel from './components/StressTestPanel.vue'

const activeTab = ref('demo')
const client = ref<Client | null>(null)
const service = ref<IDemoService | null>(null)
const testRunner = ref<TestRunner | null>(null)
const connectionStatus = ref('connecting')

onMounted(async () => {
  try {
    // 创建RPC客户端
    client.value = new Client(window.api.ipcRenderer)

    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 创建服务代理
    service.value = createProxyService<IDemoService>(client.value, 'demo')

    // 创建测试运行器
    if (service.value && client.value) {
      testRunner.value = new TestRunner(service.value, client.value)
    }

    connectionStatus.value = 'connected'
  } catch (error) {
    console.error('Failed to initialize RPC:', error)
    connectionStatus.value = 'error'
  }
})

const tabs = [
  { id: 'demo', label: 'Live Demo', icon: '🎮' },
  { id: 'basic', label: 'Basic Tests', icon: '✅' },
  { id: 'callback', label: 'Callback Tests', icon: '🔄' },
  { id: 'benchmark', label: 'Benchmarks', icon: '⚡' },
  { id: 'stress', label: 'Stress Test', icon: '💪' }
]
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="header-content">
        <h1>🚀 Electron Callback RPC Test Suite</h1>
        <div class="connection-status" :class="connectionStatus">
          <span class="status-dot"></span>
          {{ connectionStatus === 'connected' ? 'Connected' :
            connectionStatus === 'connecting' ? 'Connecting...' : 'Connection Error' }}
        </div>
      </div>
    </header>

    <nav class="tab-nav">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]">
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </nav>

    <main class="app-main">
      <div v-if="connectionStatus !== 'connected'" class="loading-state">
        <div class="spinner"></div>
        <p>{{ connectionStatus === 'connecting' ? 'Initializing RPC connection...' : 'Failed to connect to RPC service'
          }}</p>
      </div>

      <div v-else class="content">
        <DemoPanel v-if="activeTab === 'demo' && service" :service="service" />

        <TestPanel v-if="activeTab === 'basic' && testRunner" :testRunner="testRunner" />

        <CallbackTestPanel v-if="activeTab === 'callback' && testRunner" :testRunner="testRunner" />

        <BenchmarkPanel v-if="activeTab === 'benchmark' && testRunner" :testRunner="testRunner" />

        <StressTestPanel v-if="activeTab === 'stress' && testRunner" :testRunner="testRunner" />
      </div>
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
  /* 重置main.css中的样式 */
  display: block !important;
  align-items: unset !important;
  justify-content: unset !important;
}

#app {
  /* 重置main.css中的样式 */
  display: block !important;
  align-items: unset !important;
  justify-content: unset !important;
  flex-direction: unset !important;
}

.app {
  height: 100vh;
  display: grid;
  grid-template-rows: auto auto 1fr;
  grid-template-areas:
    "header"
    "tabs"
    "main";
}

.app-header {
  grid-area: header;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.app-header h1 {
  color: #2c3e50;
  font-size: 24px;
  font-weight: 600;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.connection-status.connected {
  background: #d4edda;
  color: #155724;
}

.connection-status.connecting {
  background: #fff3cd;
  color: #856404;
}

.connection-status.error {
  background: #f8d7da;
  color: #721c24;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.tab-nav {
  grid-area: tabs;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 8px 16px;
  overflow-x: auto;
  min-height: 60px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
  border-radius: 8px 8px 0 0;
}

.tab-button:hover {
  color: #2c3e50;
  background: rgba(0, 0, 0, 0.05);
}

.tab-button.active {
  color: #007bff;
  border-bottom-color: #007bff;
  background: rgba(0, 123, 255, 0.1);
}

.tab-icon {
  font-size: 16px;
}

.app-main {
  grid-area: main;
  padding: 20px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 900px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 强制所有子组件使用容器查询而不是视窗查询 */
.content {
  container-type: inline-size;
}

/* 重置所有面板的布局 */
.content>* {
  width: 100%;
  box-sizing: border-box;
}

/* 统一的网格系统 */
.content :deep(.grid-2) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.content :deep(.grid-3) {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.content :deep(.grid-4) {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.content :deep(.grid-auto) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* 响应式网格 */
@container (max-width: 700px) {

  .content :deep(.grid-4),
  .content :deep(.grid-3),
  .content :deep(.grid-2) {
    grid-template-columns: 1fr;
  }

  .content :deep(.grid-auto) {
    grid-template-columns: 1fr;
  }
}

@container (max-width: 500px) {
  .content :deep(.grid-auto) {
    grid-template-columns: 1fr;
  }
}

/* Panel 通用样式 */
.content :deep(.panel-section) {
  padding: 20px;
}

.content :deep(.panel-header) h3 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
}

.content :deep(.panel-header) p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

/* 卡片样式 */
.content :deep(.card) {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
}

.content :deep(.card-header) {
  margin-bottom: 12px;
  font-weight: 600;
  color: #2c3e50;
}

/* 按钮样式 */
.content :deep(.btn) {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.content :deep(.btn:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

.content :deep(.btn-primary) {
  background: #007bff;
  color: white;
}

.content :deep(.btn-primary:hover:not(:disabled)) {
  background: #0056b3;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .app-header {
    padding: 12px;
  }

  .header-content {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .app-header h1 {
    font-size: 20px;
  }

  .tab-nav {
    justify-content: flex-start;
  }

  .app-main {
    padding: 12px;
  }

  .content {
    max-width: none;
  }

  .tab-button {
    padding: 10px 12px;
    font-size: 13px;
  }
}
</style>