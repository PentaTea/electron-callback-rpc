<template>
  <div class="demo-panel">
    <div class="panel-header">
      <h3>🎮 RPC Live Demo</h3>
      <p>Interactive demonstration of RPC capabilities</p>
    </div>

    <!-- 1. 基础操作 -->
    <div class="demo-section">
      <h4>Basic Operations</h4>
      <div class="demo-row">
        <input v-model="echoText" placeholder="Enter text to echo" />
        <button @click="testEcho" :disabled="loading">Echo</button>
        <span class="result">{{ echoResult }}</span>
      </div>

      <div class="demo-row">
        <input v-model.number="addA" type="number" placeholder="Number A" />
        <span>+</span>
        <input v-model.number="addB" type="number" placeholder="Number B" />
        <button @click="testAdd" :disabled="loading">=</button>
        <span class="result">{{ addResult }}</span>
      </div>
    </div>

    <!-- 2. 回调测试 -->
    <div class="demo-section">
      <h4>Callback Streaming</h4>
      <div class="demo-row">
        <input v-model="callbackData" placeholder="Data to process" />
        <button @click="testCallback" :disabled="loading">Start Stream</button>
      </div>
      <div v-if="callbackProgress.length > 0" class="progress-display">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${lastProgress}%` }"></div>
        </div>
        <div class="progress-text">{{ lastProgressMessage }}</div>
        <div class="progress-log">
          <div v-for="(update, index) in callbackProgress.slice(-5)" :key="index" class="progress-item">
            {{ update.percent.toFixed(1) }}% - {{ update.message }}
          </div>
        </div>
      </div>
      <div v-if="callbackResult" class="result">Result: {{ callbackResult }}</div>
    </div>

    <!-- 3. 复杂类型 -->
    <div class="demo-section">
      <h4>Complex Data Serialization</h4>
      <button @click="testComplexTypes" :disabled="loading">Test Maps, Sets, Buffers</button>
      <div v-if="complexResult" class="complex-result">
        <pre>{{ JSON.stringify(complexResult, null, 2) }}</pre>
      </div>
    </div>

    <!-- 4. 错误处理 -->
    <div class="demo-section">
      <h4>Error Propagation</h4>
      <div class="demo-row">
        <input v-model="errorMessage" placeholder="Error message" />
        <button @click="testError" :disabled="loading">Throw Remote Error</button>
      </div>
      <div v-if="errorResult" class="error-result">
        Caught: {{ errorResult }}
      </div>
    </div>

    <!-- 5. 生命周期安全测试 (重点修改区域) -->
    <div class="demo-section">
      <h4>🛡️ Lifecycle & Resource Safety</h4>
      <p class="section-desc">
        Demonstrates the library's <strong>Auto-Cleanup</strong> capability. When the client context is destroyed (e.g.,
        page reload),
        stale callbacks are automatically garbage collected to prevent memory leaks and "zombie" events.
      </p>

      <div class="test-instruction">
        <p><strong>Safety Check Protocol:</strong></p>
        <ol>
          <li>
            <strong>Register Listener:</strong> Bind a callback to the service. <span
              class="badge success">Active</span>
          </li>
          <li>
            <strong>⚡ Hard Reload:</strong> Force a page reload to simulate client disconnection/destruction.
          </li>
          <li>
            <strong>Verify State:</strong> Confirm the environment is clean and no duplicate/stale listeners persist.
          </li>
        </ol>
        <div class="expected-result">
          <div>Goal: <span class="badge success">✅ Clean State</span> (No stale callbacks)</div>
          <div>Risk: <span class="badge error">❌ Memory Leak</span> (Zombie callbacks detected)</div>
        </div>
      </div>

      <div class="demo-row button-group">
        <button @click="runCheck('Pre-Reload')" :disabled="loading">
          1. Register & Check
        </button>

        <button @click="triggerReload" class="btn-warning">
          2. ⚡ Trigger Reload
        </button>

        <button @click="runCheck('Post-Reload')" :disabled="loading">
          3. Verify Cleanup
        </button>

        <button @click="clearLogs" class="btn-text">Reset Logs</button>
      </div>

      <div class="console-box" ref="logContainer">
        <div v-if="testLogs.length === 0" class="console-empty">System logs will appear here...</div>
        <div v-for="(log, index) in testLogs" :key="index" class="console-line">
          <span class="time">[{{ log.time }}]</span>
          <span class="msg" :class="log.type">{{ log.msg }}</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>Executing...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { IDemoService } from '@shared/interfaces'

interface Props {
  service: IDemoService
}

const props = defineProps<Props>()
const loading = ref(false)

// ==========================================
// 1-4. 业务逻辑 (保持精简)
// ==========================================

const echoText = ref('Hello RPC')
const echoResult = ref('')
const addA = ref(10)
const addB = ref(20)
const addResult = ref<number | string>('')
const callbackData = ref('Streaming Data')
const callbackProgress = ref<Array<{ percent: number, message: string }>>([])
const callbackResult = ref('')
const complexResult = ref<any>(null)
const errorMessage = ref('Critical Failure')
const errorResult = ref('')

const lastProgress = computed(() => {
  const last = callbackProgress.value[callbackProgress.value.length - 1]
  return last ? last.percent : 0
})

const lastProgressMessage = computed(() => {
  const last = callbackProgress.value[callbackProgress.value.length - 1]
  return last ? last.message : ''
})

async function testEcho() {
  loading.value = true
  try {
    echoResult.value = await props.service.echo(echoText.value)
  } catch (error: any) {
    echoResult.value = `Error: ${error.message}`
  } finally {
    loading.value = false
  }
}

async function testAdd() {
  loading.value = true
  try {
    addResult.value = await props.service.add(addA.value, addB.value)
  } catch (error: any) {
    addResult.value = `Error: ${error.message}`
  } finally {
    loading.value = false
  }
}

async function testCallback() {
  loading.value = true
  callbackProgress.value = []
  callbackResult.value = ''
  try {
    const result = await props.service.processWithCallback(
      callbackData.value,
      (percent, message) => {
        callbackProgress.value.push({ percent, message })
      }
    )
    callbackResult.value = result
  } catch (error: any) {
    callbackResult.value = `Error: ${error.message}`
  } finally {
    loading.value = false
  }
}

async function testComplexTypes() {
  loading.value = true
  try {
    const testData = {
      map: new Map([['key1', 1], ['key2', 2], ['key3', 3]]),
      set: new Set(['value1', 'value2', 'value3']),
      date: new Date(),
      buffer: new Uint8Array([1, 2, 3, 4, 5]),
      regex: /test\d+/gi,
      error: new Error('Test error for serialization')
    }

    complexResult.value = await props.service.processComplexData(testData)
  } catch (error: any) {
    complexResult.value = { error: error.message }
  } finally {
    loading.value = false
  }
}

async function testError() {
  loading.value = true
  errorResult.value = ''
  try {
    await props.service.throwError(errorMessage.value)
    errorResult.value = 'Failed: Error was not thrown'
  } catch (error: any) {
    errorResult.value = error.message
  } finally {
    loading.value = false
  }
}

// ==========================================
// 5. 生命周期/资源清理测试 (逻辑优化)
// ==========================================

const logContainer = ref<HTMLElement | null>(null)
const STORAGE_KEY = 'RPC_DEMO_LIFECYCLE_LOGS'

// 5.1 日志系统 (支持 Session 持久化)
function loadLogs() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    return []
  }
}

const testLogs = ref<Array<{ time: string, msg: string, type: string }>>(loadLogs())

function addLog(msg: string, type: 'info' | 'success' | 'error' | 'system' = 'info') {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  const entry = { time, msg, type }

  testLogs.value.push(entry)

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(testLogs.value))
  } catch (e) {
    console.error('Log persist failed', e)
  }

  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

function clearLogs() {
  sessionStorage.removeItem(STORAGE_KEY)
  testLogs.value = []
}

// 5.2 核心检测逻辑
async function runCheck(phase: string) {
  addLog(`--- PHASE: ${phase} ---`, 'system')

  let callCount = 0

  try {
    // 注册回调：这里模拟一个监听器
    // 如果 RPC 库没有处理好清理，刷新前的监听器可能在某些环境下（如 SharedWorker/Iframe）依然被后端持有
    // 或者在单页应用路由切换时，旧组件的监听器没被移除
    await props.service.basicCallback((content) => {
      callCount++
      addLog(`Event Received: "${content}" (Total: ${callCount})`, 'info')
    })

    // 等待事件触发
    await new Promise(resolve => setTimeout(resolve, 300))

    // 验证逻辑
    if (callCount === 1) {
      addLog(`✅ SUCCESS: Event handled correctly (1 instance)`, 'success')
    } else if (callCount === 0) {
      addLog(`⚠️ WARNING: No event received`, 'error')
    } else {
      // 如果 > 1，说明可能有旧的监听器还在运行（僵尸回调）
      addLog(`❌ FAILURE: Duplicate events detected (${callCount}) - Potential Leak`, 'error')
    }

  } catch (e: any) {
    addLog(`Error: ${e.message}`, 'error')
  }
}

// 5.3 触发重载
function triggerReload() {
  addLog('⚡ System Reload Initiated...', 'system')
  addLog('Simulating client disconnection & cleanup...', 'info')

  setTimeout(() => {
    window.location.reload()
  }, 800)
}

onMounted(() => {
  if (testLogs.value.length > 0) {
    addLog('System recovered from reload.', 'system')
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    })
  }
})
</script>

<style scoped>
.demo-panel {
  padding: 24px;
  max-width: 850px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.panel-header h3 {
  margin: 0 0 8px 0;
  color: #1a1a1a;
  font-size: 24px;
}

.panel-header p {
  margin: 0 0 32px 0;
  color: #666;
  font-size: 15px;
}

/* Sections */
.demo-section {
  margin-bottom: 32px;
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e1e4e8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.demo-section h4 {
  margin: 0 0 12px 0;
  color: #24292e;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-desc {
  font-size: 14px;
  color: #586069;
  line-height: 1.5;
  margin: 0 0 20px 0;
  max-width: 90%;
}

/* Controls */
.demo-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

button {
  padding: 8px 16px;
  background: #0366d6;
  color: white;
  border: 1px solid rgba(27, 31, 35, 0.15);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: #005cc5;
}

button:disabled {
  background: #959da5;
  cursor: not-allowed;
  opacity: 0.7;
}

input {
  padding: 8px 12px;
  border: 1px solid #d1d5da;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.3);
}

/* Results */
.result {
  font-weight: 600;
  color: #22863a;
  margin-left: 8px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

/* Progress */
.progress-bar {
  width: 100%;
  height: 6px;
  background: #e1e4e8;
  border-radius: 3px;
  overflow: hidden;
  margin: 12px 0 8px 0;
}

.progress-fill {
  height: 100%;
  background: #28a745;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 13px;
  color: #586069;
}

.progress-log {
  margin-top: 8px;
  max-height: 100px;
  overflow-y: auto;
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  color: #586069;
}

/* Complex & Error */

.complex-result {
  margin-top: 16px;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  overflow: hidden;
}

.complex-result pre {
  margin: 0;
  background: #f6f8fa;
  padding: 12px;
  font-size: 12px;
  overflow-x: auto;
  font-family: 'SFMono-Regular', Consolas, monospace;
  color: #24292e;
}

.error-result {
  margin-top: 12px;
  padding: 12px;
  background: #ffeef0;
  color: #b31d28;
  border: 1px solid #f97583;
  border-radius: 6px;
  font-size: 14px;
}

/* --- Lifecycle Test Styles --- */
.test-instruction {
  background-color: #f1f8ff;
  border: 1px solid #c8e1ff;
  padding: 16px;
  margin-bottom: 20px;
  border-radius: 6px;
  font-size: 14px;
  color: #24292e;
}

.test-instruction p {
  margin-top: 0;
}

.test-instruction ol {
  padding-left: 20px;
  margin-bottom: 12px;
}

.test-instruction li {
  margin-bottom: 6px;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  vertical-align: middle;
}

.badge.success {
  background: #dcffe4;
  color: #1a7f37;
  border: 1px solid #2da44e;
}

.badge.error {
  background: #ffebe9;
  color: #cf222e;
  border: 1px solid #cf222e;
}

.expected-result {
  border-top: 1px solid #c8e1ff;
  padding-top: 10px;
  display: flex;
  gap: 20px;
  font-size: 13px;
}

/* Special Buttons */
.btn-warning {
  background: #d29922 !important;
  color: #fff !important;
  border-color: rgba(27, 31, 35, 0.15) !important;
}

.btn-warning:hover:not(:disabled) {
  background: #b08800 !important;
}

.btn-text {
  background: transparent !important;
  color: #586069 !important;
  border: none !important;
  text-decoration: underline;
}

.btn-text:hover {
  color: #24292e !important;
}

/* Console */
.console-box {
  background: #24292e;
  color: #e1e4e8;
  border-radius: 6px;
  height: 200px;
  overflow-y: auto;
  padding: 12px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  border: 1px solid #1b1f23;
}

.console-empty {
  color: #6a737d;
  text-align: center;
  margin-top: 30px;
  font-style: italic;
}

.console-line {
  margin-bottom: 4px;
  border-bottom: 1px solid #2f363d;
  padding-bottom: 2px;
  display: flex;
}

.time {
  color: #79b8ff;
  min-width: 75px;
  flex-shrink: 0;
}

.msg.system {
  color: #b392f0;
  font-weight: bold;
  border-top: 1px dashed #444;
  margin-top: 8px;
  padding-top: 4px;
  display: block;
  width: 100%;
}

.msg.info {
  color: #e1e4e8;
}

.msg.success {
  color: #85e89d;
}

.msg.error {
  color: #f97583;
  font-weight: bold;
}

/* Global Loading */
.loading {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #fff;
  border: 1px solid #e1e4e8;
  border-radius: 30px;
  color: #586069;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  font-size: 14px;
  font-weight: 500;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e1e4e8;
  border-top-color: #0366d6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>