<template>
  <div class="callback-test-panel">
    <div class="panel-header">
      <h3>🔄 Callback Tests</h3>
      <p>Testing callback functionality and real-time communication</p>
    </div>

    <div class="test-controls">
      <button @click="runTests" :disabled="running" class="run-button">
        {{ running ? 'Running Callback Tests...' : 'Run Callback Tests' }}
      </button>
    </div>

    <div v-if="running" class="loading">
      <div class="spinner"></div>
      <span>Running callback tests...</span>
    </div>

    <div v-if="results.length > 0" class="test-results">
      <div 
        v-for="result in results" 
        :key="result.name"
        :class="['test-result', result.passed ? 'passed' : 'failed']"
      >
        <div class="test-header">
          <span class="test-icon">{{ result.passed ? '✅' : '❌' }}</span>
          <span class="test-name">{{ result.name }}</span>
          <span class="test-duration">{{ result.duration.toFixed(2) }}ms</span>
        </div>
        <div v-if="!result.passed && result.error" class="test-error">
          {{ result.error }}
        </div>
      </div>
    </div>

    <!-- Live Callback Demo -->
    <div class="live-demo">
      <h4>Live Callback Demo</h4>
      <div class="demo-controls">
        <input v-model="demoData" placeholder="Enter data to process" />
        <button @click="runLiveDemo" :disabled="demoRunning">
          {{ demoRunning ? 'Processing...' : 'Start Live Demo' }}
        </button>
      </div>
      
      <div v-if="demoProgress.length > 0" class="progress-display">
        <div class="progress-header">
          <span>Progress: {{ lastProgress.toFixed(1) }}%</span>
          <span>{{ lastMessage }}</span>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${lastProgress}%` }"
          ></div>
        </div>
        <div class="progress-log">
          <div class="log-header">Progress Log (Last 10 updates):</div>
          <div 
            v-for="(update, index) in demoProgress.slice(-10)" 
            :key="index" 
            class="log-item"
          >
            <span class="log-time">{{ formatTime(update.timestamp) }}</span>
            <span class="log-percent">{{ update.percent.toFixed(1) }}%</span>
            <span class="log-message">{{ update.message }}</span>
          </div>
        </div>
      </div>
      
      <div v-if="demoResult" class="demo-result">
        <strong>Result:</strong> {{ demoResult }}
      </div>
    </div>

    <!-- Long Running Task Demo -->
    <div class="long-task-demo">
      <h4>Long Running Task Demo</h4>
      <div class="demo-controls">
        <label>Duration (ms):</label>
        <input v-model.number="taskDuration" type="number" min="500" max="10000" />
        <button @click="runLongTask" :disabled="taskRunning">
          {{ taskRunning ? 'Running...' : 'Start Long Task' }}
        </button>
      </div>
      
      <div v-if="taskUpdates.length > 0" class="task-display">
        <div class="task-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${lastTaskProgress}%` }"
            ></div>
          </div>
          <div class="task-info">
            <span>Progress: {{ lastTaskProgress.toFixed(1) }}%</span>
            <span v-if="lastTaskData">
              Elapsed: {{ lastTaskData.elapsed }}ms | 
              Remaining: {{ lastTaskData.remaining }}ms
            </span>
          </div>
        </div>
        
        <div class="task-log">
          <div class="log-header">Task Updates:</div>
          <div 
            v-for="(update, index) in taskUpdates.slice(-5)" 
            :key="index" 
            class="log-item"
          >
            <span class="log-time">{{ update.data.timestamp }}</span>
            <span class="log-percent">{{ update.progress.toFixed(1) }}%</span>
            <span class="log-message">
              Elapsed: {{ update.data.elapsed }}ms, 
              Remaining: {{ update.data.remaining }}ms
            </span>
          </div>
        </div>
      </div>
      
      <div v-if="taskResult" class="demo-result">
        <strong>Task Result:</strong> {{ taskResult }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ITestResult } from '@shared/interfaces'
import { TestRunner } from '../utils/test-runner'

interface Props {
  testRunner: TestRunner
}

const props = defineProps<Props>()

const running = ref(false)
const results = ref<ITestResult[]>([])

// Live demo state
const demoRunning = ref(false)
const demoData = ref('Sample callback data')
const demoProgress = ref<Array<{percent: number, message: string, timestamp: number}>>([])
const demoResult = ref('')

// Long task demo state
const taskRunning = ref(false)
const taskDuration = ref(2000)
const taskUpdates = ref<Array<{progress: number, data: any}>>([])
const taskResult = ref('')

const lastProgress = computed(() => {
  const last = demoProgress.value[demoProgress.value.length - 1]
  return last ? last.percent : 0
})

const lastMessage = computed(() => {
  const last = demoProgress.value[demoProgress.value.length - 1]
  return last ? last.message : ''
})

const lastTaskProgress = computed(() => {
  const last = taskUpdates.value[taskUpdates.value.length - 1]
  return last ? last.progress : 0
})

const lastTaskData = computed(() => {
  const last = taskUpdates.value[taskUpdates.value.length - 1]
  return last ? last.data : null
})

async function runTests() {
  running.value = true
  results.value = []

  try {
    const callbackTests = await props.testRunner.runCallbackTests()
    results.value.push(...callbackTests)
  } catch (error: any) {
    results.value.push({
      name: 'Callback Test Suite Error',
      passed: false,
      duration: 0,
      error: error.message
    })
  } finally {
    running.value = false
  }
}

async function runLiveDemo() {
  demoRunning.value = true
  demoProgress.value = []
  demoResult.value = ''

  try {
    const result = await props.testRunner.service.processWithCallback(
      demoData.value,
      (percent, message) => {
        demoProgress.value.push({
          percent,
          message,
          timestamp: Date.now()
        })
      }
    )
    demoResult.value = result
  } catch (error: any) {
    demoResult.value = `Error: ${error.message}`
  } finally {
    demoRunning.value = false
  }
}

async function runLongTask() {
  taskRunning.value = true
  taskUpdates.value = []
  taskResult.value = ''

  try {
    const result = await props.testRunner.service.longRunningTask(
      taskDuration.value,
      (progress, data) => {
        taskUpdates.value.push({ progress, data })
      }
    )
    taskResult.value = result
  } catch (error: any) {
    taskResult.value = `Error: ${error.message}`
  } finally {
    taskRunning.value = false
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}
</script>

<style scoped>
.callback-test-panel {
  padding: 20px;
}

.panel-header h3 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.panel-header p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
}

.test-controls {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.run-button {
  padding: 10px 20px;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.run-button:hover:not(:disabled) {
  background: #138496;
}

.run-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  color: #856404;
  margin-bottom: 20px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #856404;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.test-results {
  margin-bottom: 32px;
}

.test-result {
  margin-bottom: 12px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.test-result.passed {
  border-left: 4px solid #28a745;
  background: #f8fff9;
}

.test-result.failed {
  border-left: 4px solid #dc3545;
  background: #fff8f8;
}

.test-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.test-icon {
  font-size: 16px;
}

.test-name {
  flex: 1;
  font-weight: 500;
  color: #2c3e50;
}

.test-duration {
  font-size: 12px;
  color: #6c757d;
  font-family: monospace;
}

.test-error {
  padding: 12px 16px;
  background: #f8d7da;
  color: #721c24;
  font-size: 14px;
  border-top: 1px solid #f5c6cb;
}

.live-demo, .long-task-demo {
  margin-bottom: 32px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.live-demo h4, .long-task-demo h4 {
  margin: 0 0 16px 0;
  color: #495057;
}

.demo-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.demo-controls input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.demo-controls button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.demo-controls button:hover:not(:disabled) {
  background: #0056b3;
}

.demo-controls button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.progress-display, .task-display {
  margin-top: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: #495057;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #17a2b8, #20c997);
  transition: width 0.3s ease;
}

.progress-log, .task-log {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.log-header {
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
  font-size: 14px;
}

.log-item {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #6c757d;
}

.log-time {
  font-family: monospace;
  color: #007bff;
}

.log-percent {
  font-weight: 500;
  color: #28a745;
}

.log-message {
  flex: 1;
}

.task-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #495057;
  margin-bottom: 16px;
}

.demo-result {
  margin-top: 16px;
  padding: 12px;
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
  font-size: 14px;
}
</style>