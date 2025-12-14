<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Client, createProxyService } from 'electron-callback-rpc'
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
    if (service.value) {
      testRunner.value = new TestRunner(service.value)
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
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </nav>

    <main class="app-main">
      <div v-if="connectionStatus !== 'connected'" class="loading-state">
        <div class="spinner"></div>
        <p>{{ connectionStatus === 'connecting' ? 'Initializing RPC connection...' : 'Failed to connect to RPC service' }}</p>
      </div>

      <div v-else class="content">
        <DemoPanel 
          v-if="activeTab === 'demo' && service" 
          :service="service" 
        />
        
        <TestPanel 
          v-if="activeTab === 'basic' && testRunner"
          :testRunner="testRunner"
        />
        
        <CallbackTestPanel 
          v-if="activeTab === 'callback' && testRunner"
          :testRunner="testRunner"
        />
        
        <BenchmarkPanel 
          v-if="activeTab === 'benchmark' && testRunner"
          :testRunner="testRunner"
        />
        
        <StressTestPanel 
          v-if="activeTab === 'stress' && testRunner"
          :testRunner="testRunner"
        />
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

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 16px 24px;
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
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0 24px;
  display: flex;
  gap: 4px;
  overflow-x: auto;
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
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 24px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  margin: 24px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Scrollbar styling */
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

/* Responsive design */
@media (max-width: 768px) {
  .app-header {
    padding: 12px 16px;
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
    padding: 0 16px;
  }
  
  .app-main {
    padding: 0 16px;
  }
  
  .tab-button {
    padding: 10px 12px;
    font-size: 13px;
  }
}
</style>