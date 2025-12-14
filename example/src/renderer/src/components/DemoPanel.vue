<template>
  <div class="demo-panel">
    <div class="panel-header">
      <h3>🎮 Live Demo</h3>
      <p>Interactive demonstration of RPC functionality</p>
    </div>

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

    <div class="demo-section">
      <h4>Callback Operations</h4>
      <div class="demo-row">
        <input v-model="callbackData" placeholder="Data to process" />
        <button @click="testCallback" :disabled="loading">Process with Callback</button>
      </div>
      <div v-if="callbackProgress.length > 0" class="progress-display">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${lastProgress}%` }"
          ></div>
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

    <div class="demo-section">
      <h4>Complex Types</h4>
      <button @click="testComplexTypes" :disabled="loading">Test Complex Data Types</button>
      <div v-if="complexResult" class="complex-result">
        <pre>{{ JSON.stringify(complexResult, null, 2) }}</pre>
      </div>
    </div>

    <div class="demo-section">
      <h4>Error Handling</h4>
      <div class="demo-row">
        <input v-model="errorMessage" placeholder="Error message" />
        <button @click="testError" :disabled="loading">Throw Error</button>
      </div>
      <div v-if="errorResult" class="error-result">
        Error caught: {{ errorResult }}
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>Processing...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { IDemoService } from '@shared/interfaces'

interface Props {
  service: IDemoService
}

const props = defineProps<Props>()

const loading = ref(false)

// Echo test
const echoText = ref('Hello World')
const echoResult = ref('')

// Add test
const addA = ref(5)
const addB = ref(3)
const addResult = ref<number | string>('')

// Callback test
const callbackData = ref('test data')
const callbackProgress = ref<Array<{percent: number, message: string}>>([])
const callbackResult = ref('')

// Complex types test
const complexResult = ref<any>(null)

// Error test
const errorMessage = ref('Test error')
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
    errorResult.value = 'No error thrown (unexpected)'
  } catch (error: any) {
    errorResult.value = error.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.demo-panel {
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

.demo-section {
  margin-bottom: 32px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.demo-section h4 {
  margin: 0 0 16px 0;
  color: #495057;
  font-size: 16px;
}

.demo-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.demo-row input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.demo-row button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.demo-row button:hover:not(:disabled) {
  background: #0056b3;
}

.demo-row button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.result {
  font-weight: 500;
  color: #28a745;
}

.progress-display {
  margin-top: 16px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745, #20c997);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #495057;
  margin-bottom: 8px;
}

.progress-log {
  max-height: 120px;
  overflow-y: auto;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
}

.progress-item {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
}

.complex-result {
  margin-top: 16px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
}

.complex-result pre {
  margin: 0;
  font-size: 12px;
  color: #495057;
  white-space: pre-wrap;
}

.error-result {
  margin-top: 12px;
  padding: 12px;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  font-size: 14px;
}

.loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  color: #856404;
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
</style>