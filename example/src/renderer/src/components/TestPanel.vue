<template>
  <div class="test-panel">
    <div class="panel-header">
      <h3>✅ Basic Tests</h3>
      <p>Automated unit tests for core functionality</p>
    </div>

    <div class="test-controls">
      <button @click="runTests" :disabled="running" class="run-button">
        {{ running ? 'Running Tests...' : 'Run All Tests' }}
      </button>
      <div class="test-stats" v-if="results.length > 0">
        <span class="stat passed">{{ passedCount }} Passed</span>
        <span class="stat failed">{{ failedCount }} Failed</span>
        <span class="stat total">{{ results.length }} Total</span>
      </div>
    </div>

    <div v-if="running" class="loading">
      <div class="spinner"></div>
      <span>Running tests...</span>
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
        <div v-if="result.details" class="test-details">
          <pre>{{ JSON.stringify(result.details, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <div v-if="results.length > 0" class="test-summary">
      <h4>Test Summary</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Total Tests</div>
          <div class="summary-value">{{ results.length }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Passed</div>
          <div class="summary-value success">{{ passedCount }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Failed</div>
          <div class="summary-value error">{{ failedCount }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Success Rate</div>
          <div class="summary-value">{{ successRate }}%</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Total Duration</div>
          <div class="summary-value">{{ totalDuration.toFixed(2) }}ms</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Average Duration</div>
          <div class="summary-value">{{ averageDuration.toFixed(2) }}ms</div>
        </div>
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

const passedCount = computed(() => results.value.filter(r => r.passed).length)
const failedCount = computed(() => results.value.filter(r => !r.passed).length)
const successRate = computed(() => {
  if (results.value.length === 0) return 0
  return ((passedCount.value / results.value.length) * 100).toFixed(1)
})
const totalDuration = computed(() => results.value.reduce((sum, r) => sum + r.duration, 0))
const averageDuration = computed(() => {
  if (results.value.length === 0) return 0
  return totalDuration.value / results.value.length
})

async function runTests() {
  running.value = true
  results.value = []

  try {
    // 运行基础测试
    const basicTests = await props.testRunner.runBasicTests()
    results.value.push(...basicTests)

    // 运行复杂类型测试
    const complexTests = await props.testRunner.runComplexTypeTests()
    results.value.push(...complexTests)

  } catch (error: any) {
    results.value.push({
      name: 'Test Suite Error',
      passed: false,
      duration: 0,
      error: error.message
    })
  } finally {
    running.value = false
  }
}
</script>

<style scoped>
.test-panel {
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
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.run-button {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.run-button:hover:not(:disabled) {
  background: #218838;
}

.run-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.test-stats {
  display: flex;
  gap: 16px;
}

.stat {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.stat.passed {
  background: #d4edda;
  color: #155724;
}

.stat.failed {
  background: #f8d7da;
  color: #721c24;
}

.stat.total {
  background: #d1ecf1;
  color: #0c5460;
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

.test-details {
  padding: 12px 16px;
  background: #f1f3f4;
  border-top: 1px solid #e9ecef;
}

.test-details pre {
  margin: 0;
  font-size: 12px;
  color: #495057;
  white-space: pre-wrap;
}

.test-summary {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.test-summary h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.summary-item {
  text-align: center;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.summary-label {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.summary-value.success {
  color: #28a745;
}

.summary-value.error {
  color: #dc3545;
}
</style>