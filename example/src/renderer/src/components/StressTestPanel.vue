<template>
  <div class="stress-test-panel">
    <div class="panel-header">
      <h3>💪 Stress Test</h3>
      <p>High-load testing with concurrent operations</p>
    </div>
    
    <div class="test-config">
      <div class="config-row">
        <label>Concurrent Workers:</label>
        <input 
          v-model.number="concurrent" 
          type="number" 
          min="1" 
          max="100"
          :disabled="running"
        />
      </div>
      <div class="config-row">
        <label>Operations per Worker:</label>
        <input 
          v-model.number="operationsPerWorker" 
          type="number" 
          min="1" 
          max="1000"
          :disabled="running"
        />
      </div>
      <button 
        @click="runStressTest" 
        :disabled="running"
        class="run-button"
      >
        {{ running ? 'Running...' : 'Run Stress Test' }}
      </button>
    </div>
    
    <div v-if="result" class="stress-results">
      <div class="result-grid">
        <div class="result-card">
          <div class="result-label">Total Operations</div>
          <div class="result-value">{{ result.totalOperations }}</div>
        </div>
        <div class="result-card">
          <div class="result-label">Success Rate</div>
          <div class="result-value">
            {{ ((result.successCount / result.totalOperations) * 100).toFixed(1) }}%
          </div>
        </div>
        <div class="result-card">
          <div class="result-label">Throughput</div>
          <div class="result-value">{{ result.throughput.toFixed(2) }} ops/sec</div>
        </div>
        <div class="result-card">
          <div class="result-label">Avg Latency</div>
          <div class="result-value">{{ result.avgLatency.toFixed(2) }}ms</div>
        </div>
        <div class="result-card">
          <div class="result-label">Max Latency</div>
          <div class="result-value">{{ result.maxLatency.toFixed(2) }}ms</div>
        </div>
        <div class="result-card">
          <div class="result-label">Errors</div>
          <div class="result-value error">{{ result.errorCount }}</div>
        </div>
      </div>

      <!-- Performance Analysis -->
      <div class="performance-analysis">
        <h4>Performance Analysis</h4>
        <div class="analysis-grid">
          <div class="analysis-item">
            <div class="analysis-label">Concurrency Efficiency</div>
            <div class="analysis-value">
              {{ getConcurrencyEfficiency() }}%
            </div>
            <div class="analysis-description">
              How well the system handles concurrent load
            </div>
          </div>
          <div class="analysis-item">
            <div class="analysis-label">Error Rate</div>
            <div class="analysis-value" :class="getErrorRateClass()">
              {{ getErrorRate() }}%
            </div>
            <div class="analysis-description">
              Percentage of failed operations
            </div>
          </div>
          <div class="analysis-item">
            <div class="analysis-label">Latency Variance</div>
            <div class="analysis-value">
              {{ getLatencyVariance() }}ms
            </div>
            <div class="analysis-description">
              Difference between max and avg latency
            </div>
          </div>
        </div>
      </div>

      <!-- Throughput Chart -->
      <div class="throughput-chart">
        <h4>Throughput Visualization</h4>
        <div class="chart-container">
          <div class="chart-bar">
            <div class="bar-label">Current Test</div>
            <div class="bar-fill" :style="{ width: getThroughputBarWidth() + '%' }">
              <span class="bar-text">{{ result.throughput.toFixed(0) }} ops/sec</span>
            </div>
          </div>
          <div class="chart-reference">
            <div class="ref-line" style="left: 25%">
              <span>Low (250 ops/sec)</span>
            </div>
            <div class="ref-line" style="left: 50%">
              <span>Medium (500 ops/sec)</span>
            </div>
            <div class="ref-line" style="left: 75%">
              <span>High (750 ops/sec)</span>
            </div>
            <div class="ref-line" style="left: 100%">
              <span>Excellent (1000+ ops/sec)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="running" class="loading">
      <div class="spinner"></div>
      <span>Running stress test with {{ concurrent }} workers...</span>
      <div class="progress-info">
        <div>Estimated time: {{ estimatedTime }}s</div>
        <div>Total operations: {{ concurrent * operationsPerWorker }}</div>
      </div>
    </div>

    <!-- Preset Configurations -->
    <div class="preset-configs">
      <h4>Preset Configurations</h4>
      <div class="preset-buttons">
        <button @click="setPreset('light')" :disabled="running" class="preset-button light">
          Light Load
          <small>5 workers × 20 ops</small>
        </button>
        <button @click="setPreset('medium')" :disabled="running" class="preset-button medium">
          Medium Load
          <small>10 workers × 50 ops</small>
        </button>
        <button @click="setPreset('heavy')" :disabled="running" class="preset-button heavy">
          Heavy Load
          <small>25 workers × 100 ops</small>
        </button>
        <button @click="setPreset('extreme')" :disabled="running" class="preset-button extreme">
          Extreme Load
          <small>50 workers × 200 ops</small>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { IStressTestResult } from '@shared/interfaces'
import { TestRunner } from '../utils/test-runner'

interface Props {
  testRunner: TestRunner
}

const props = defineProps<Props>()
const result = ref<IStressTestResult | null>(null)
const running = ref(false)
const concurrent = ref(10)
const operationsPerWorker = ref(50)

const estimatedTime = computed(() => {
  // 估算时间：假设每个操作平均需要 50ms
  return ((operationsPerWorker.value * 50) / 1000).toFixed(1)
})

async function runStressTest() {
  running.value = true
  result.value = null

  try {
    result.value = await props.testRunner.runStressTest(concurrent.value, operationsPerWorker.value)
  } catch (error: any) {
    console.error('Stress test error:', error)
  } finally {
    running.value = false
  }
}

function setPreset(type: string) {
  switch (type) {
    case 'light':
      concurrent.value = 5
      operationsPerWorker.value = 20
      break
    case 'medium':
      concurrent.value = 10
      operationsPerWorker.value = 50
      break
    case 'heavy':
      concurrent.value = 25
      operationsPerWorker.value = 100
      break
    case 'extreme':
      concurrent.value = 50
      operationsPerWorker.value = 200
      break
  }
}

function getConcurrencyEfficiency(): string {
  if (!result.value) return '0'
  // 理论最大吞吐量 vs 实际吞吐量
  const theoreticalMax = 1000 // 假设单线程最大 1000 ops/sec
  const efficiency = (result.value.throughput / (theoreticalMax * result.value.concurrent)) * 100
  return Math.min(efficiency, 100).toFixed(1)
}

function getErrorRate(): string {
  if (!result.value) return '0'
  return ((result.value.errorCount / result.value.totalOperations) * 100).toFixed(2)
}

function getErrorRateClass(): string {
  const rate = parseFloat(getErrorRate())
  if (rate === 0) return 'excellent'
  if (rate < 1) return 'good'
  if (rate < 5) return 'warning'
  return 'error'
}

function getLatencyVariance(): string {
  if (!result.value) return '0'
  return (result.value.maxLatency - result.value.avgLatency).toFixed(2)
}

function getThroughputBarWidth(): number {
  if (!result.value) return 0
  // 以 1000 ops/sec 为满分
  return Math.min((result.value.throughput / 1000) * 100, 100)
}
</script>

<style scoped>
.stress-test-panel {
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

.test-config {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-row label {
  font-size: 14px;
  color: #495057;
  white-space: nowrap;
}

.config-row input {
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  width: 80px;
}

.run-button {
  padding: 10px 20px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.run-button:hover:not(:disabled) {
  background: #c82333;
}

.run-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  color: #856404;
  margin-bottom: 20px;
}

.loading > div:first-child {
  display: flex;
  align-items: center;
  gap: 12px;
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

.progress-info {
  text-align: center;
  font-size: 14px;
}

.stress-results {
  margin-bottom: 32px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.result-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.result-label {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.result-value {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.result-value.error {
  color: #dc3545;
}

.performance-analysis {
  margin-bottom: 32px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.performance-analysis h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.analysis-item {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 16px;
  text-align: center;
}

.analysis-label {
  font-size: 14px;
  color: #495057;
  margin-bottom: 8px;
  font-weight: 500;
}

.analysis-value {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.analysis-value.excellent {
  color: #28a745;
}

.analysis-value.good {
  color: #17a2b8;
}

.analysis-value.warning {
  color: #ffc107;
}

.analysis-value.error {
  color: #dc3545;
}

.analysis-description {
  font-size: 12px;
  color: #6c757d;
}

.throughput-chart {
  margin-bottom: 32px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.throughput-chart h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.chart-container {
  position: relative;
}

.chart-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.bar-label {
  width: 100px;
  font-size: 14px;
  color: #495057;
}

.bar-fill {
  height: 32px;
  background: linear-gradient(90deg, #dc3545, #fd7e14);
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  min-width: 120px;
  transition: width 0.5s ease;
}

.bar-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.chart-reference {
  position: relative;
  height: 40px;
  background: #e9ecef;
  border-radius: 4px;
  margin-left: 112px;
}

.ref-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #6c757d;
}

.ref-line span {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #6c757d;
  white-space: nowrap;
  margin-top: 4px;
}

.preset-configs {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.preset-configs h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.preset-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.preset-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.preset-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.preset-button small {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.8;
}

.preset-button.light {
  background: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.preset-button.medium {
  background: #d1ecf1;
  color: #0c5460;
  border-color: #bee5eb;
}

.preset-button.heavy {
  background: #fff3cd;
  color: #856404;
  border-color: #ffeaa7;
}

.preset-button.extreme {
  background: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
}
</style>