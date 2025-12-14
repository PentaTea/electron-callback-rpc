<template>
  <div class="benchmark-panel">
    <div class="panel-header">
      <h3>⚡ Benchmarks</h3>
      <p>Performance testing and latency measurements</p>
    </div>

    <div class="benchmark-controls">
      <button @click="runBenchmarks" :disabled="running" class="run-button">
        {{ running ? 'Running Benchmarks...' : 'Run Benchmarks' }}
      </button>
      <div class="benchmark-config">
        <label>Iterations per test:</label>
        <select v-model.number="iterations" :disabled="running">
          <option value="10">10 (Quick)</option>
          <option value="50">50 (Normal)</option>
          <option value="100">100 (Thorough)</option>
          <option value="500">500 (Extensive)</option>
        </select>
      </div>
    </div>

    <div v-if="running" class="loading">
      <div class="spinner"></div>
      <span>Running performance benchmarks...</span>
      <div class="progress-info">
        <div>Current test: {{ currentTest }}</div>
        <div>Progress: {{ currentProgress }}/{{ totalTests }}</div>
      </div>
    </div>

    <div v-if="results.length > 0" class="benchmark-results">
      <div class="results-header">
        <h4>Benchmark Results</h4>
        <div class="results-summary">
          Total tests: {{ results.length }} | 
          Total operations: {{ totalOperations }} | 
          Total time: {{ totalTime.toFixed(2) }}ms
        </div>
      </div>

      <div class="results-grid">
        <div 
          v-for="result in results" 
          :key="result.name"
          class="benchmark-result"
        >
          <div class="result-header">
            <h5>{{ result.name }}</h5>
            <div class="result-badge" :class="getPerformanceClass(result.opsPerSecond)">
              {{ result.opsPerSecond.toFixed(0) }} ops/sec
            </div>
          </div>
          
          <div class="result-metrics">
            <div class="metric">
              <span class="metric-label">Operations</span>
              <span class="metric-value">{{ result.operations }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Total Duration</span>
              <span class="metric-value">{{ result.duration.toFixed(2) }}ms</span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Latency</span>
              <span class="metric-value">{{ result.avgLatency.toFixed(2) }}ms</span>
            </div>
            <div class="metric">
              <span class="metric-label">Min Latency</span>
              <span class="metric-value">{{ result.minLatency.toFixed(2) }}ms</span>
            </div>
            <div class="metric">
              <span class="metric-label">Max Latency</span>
              <span class="metric-value">{{ result.maxLatency.toFixed(2) }}ms</span>
            </div>
          </div>

          <div class="latency-chart">
            <div class="chart-header">Latency Distribution</div>
            <div class="chart-bar">
              <div class="bar-segment min" :style="{ width: '20%' }">
                <span>Min: {{ result.minLatency.toFixed(1) }}ms</span>
              </div>
              <div class="bar-segment avg" :style="{ width: '60%' }">
                <span>Avg: {{ result.avgLatency.toFixed(1) }}ms</span>
              </div>
              <div class="bar-segment max" :style="{ width: '20%' }">
                <span>Max: {{ result.maxLatency.toFixed(1) }}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Comparison Chart -->
      <div class="performance-comparison">
        <h4>Performance Comparison</h4>
        <div class="comparison-chart">
          <div 
            v-for="result in sortedResults" 
            :key="result.name"
            class="comparison-bar"
          >
            <div class="bar-label">{{ result.name }}</div>
            <div class="bar-container">
              <div 
                class="bar-fill" 
                :class="getPerformanceClass(result.opsPerSecond)"
                :style="{ width: `${getBarWidth(result.opsPerSecond)}%` }"
              >
                <span class="bar-text">{{ result.opsPerSecond.toFixed(0) }} ops/sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Performance Test -->
      <div class="custom-test">
        <h4>Custom Performance Test</h4>
        <div class="custom-controls">
          <select v-model="customTestType" :disabled="customRunning">
            <option value="echo">Echo Test</option>
            <option value="add">Add Test</option>
            <option value="performance">Performance Method</option>
            <option value="memory">Memory Test</option>
          </select>
          <input 
            v-model.number="customIterations" 
            type="number" 
            min="1" 
            max="1000"
            placeholder="Iterations"
            :disabled="customRunning"
          />
          <button @click="runCustomTest" :disabled="customRunning">
            {{ customRunning ? 'Running...' : 'Run Custom Test' }}
          </button>
        </div>
        
        <div v-if="customResult" class="custom-result">
          <div class="result-header">
            <h5>{{ customResult.name }}</h5>
            <div class="result-badge" :class="getPerformanceClass(customResult.opsPerSecond)">
              {{ customResult.opsPerSecond.toFixed(0) }} ops/sec
            </div>
          </div>
          <div class="result-details">
            {{ customResult.operations }} operations in {{ customResult.duration.toFixed(2) }}ms
            (avg: {{ customResult.avgLatency.toFixed(2) }}ms per operation)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { IBenchmarkResult } from '@shared/interfaces'
import { TestRunner } from '../utils/test-runner'

interface Props {
  testRunner: TestRunner
}

const props = defineProps<Props>()

const running = ref(false)
const results = ref<IBenchmarkResult[]>([])
const iterations = ref(100)
const currentTest = ref('')
const currentProgress = ref(0)
const totalTests = ref(0)

// Custom test state
const customRunning = ref(false)
const customTestType = ref('echo')
const customIterations = ref(50)
const customResult = ref<IBenchmarkResult | null>(null)

const totalOperations = computed(() => results.value.reduce((sum, r) => sum + r.operations, 0))
const totalTime = computed(() => results.value.reduce((sum, r) => sum + r.duration, 0))

const sortedResults = computed(() => {
  return [...results.value].sort((a, b) => b.opsPerSecond - a.opsPerSecond)
})

const maxOpsPerSecond = computed(() => {
  if (results.value.length === 0) return 1
  return Math.max(...results.value.map(r => r.opsPerSecond))
})

function getPerformanceClass(opsPerSecond: number): string {
  const ratio = opsPerSecond / maxOpsPerSecond.value
  if (ratio > 0.8) return 'excellent'
  if (ratio > 0.6) return 'good'
  if (ratio > 0.4) return 'average'
  return 'poor'
}

function getBarWidth(opsPerSecond: number): number {
  return (opsPerSecond / maxOpsPerSecond.value) * 100
}

async function runBenchmarks() {
  running.value = true
  results.value = []
  currentProgress.value = 0
  totalTests.value = 3

  try {
    // 更新测试运行器的迭代次数
    const originalRunner = props.testRunner
    
    currentTest.value = 'Echo Performance'
    currentProgress.value = 1
    const echoResult = await runSingleBenchmark('Echo Performance', async () => {
      await originalRunner.service.echo('benchmark')
    }, iterations.value)
    results.value.push(echoResult)

    currentTest.value = 'Add Performance'
    currentProgress.value = 2
    const addResult = await runSingleBenchmark('Add Performance', async () => {
      await originalRunner.service.add(Math.random(), Math.random())
    }, iterations.value)
    results.value.push(addResult)

    currentTest.value = 'Performance Test Method'
    currentProgress.value = 3
    const perfResult = await runSingleBenchmark('Performance Test Method', async () => {
      await originalRunner.service.performanceTest(1000)
    }, Math.min(iterations.value, 20)) // 限制性能测试的迭代次数
    results.value.push(perfResult)

  } catch (error: any) {
    console.error('Benchmark error:', error)
  } finally {
    running.value = false
    currentTest.value = ''
  }
}

async function runCustomTest() {
  customRunning.value = true
  customResult.value = null

  try {
    let testName = ''
    let testFn: () => Promise<any>

    switch (customTestType.value) {
      case 'echo':
        testName = `Custom Echo Test (${customIterations.value} ops)`
        testFn = () => props.testRunner.service.echo('custom test')
        break
      case 'add':
        testName = `Custom Add Test (${customIterations.value} ops)`
        testFn = () => props.testRunner.service.add(Math.random(), Math.random())
        break
      case 'performance':
        testName = `Custom Performance Test (${customIterations.value} ops)`
        testFn = () => props.testRunner.service.performanceTest(500)
        break
      case 'memory':
        testName = `Custom Memory Test (${customIterations.value} ops)`
        testFn = () => props.testRunner.service.memoryTest(1024)
        break
      default:
        throw new Error('Unknown test type')
    }

    customResult.value = await runSingleBenchmark(testName, testFn, customIterations.value)
  } catch (error: any) {
    console.error('Custom test error:', error)
  } finally {
    customRunning.value = false
  }
}

async function runSingleBenchmark(name: string, operation: () => Promise<void>, iterations: number): Promise<IBenchmarkResult> {
  const latencies: number[] = []
  
  // 预热
  for (let i = 0; i < Math.min(5, iterations); i++) {
    await operation()
  }

  // 实际测试
  const startTime = performance.now()
  for (let i = 0; i < iterations; i++) {
    const opStart = performance.now()
    await operation()
    const opEnd = performance.now()
    latencies.push(opEnd - opStart)
  }
  const endTime = performance.now()

  const totalDuration = endTime - startTime
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
  const minLatency = Math.min(...latencies)
  const maxLatency = Math.max(...latencies)
  const opsPerSecond = (iterations / totalDuration) * 1000

  return {
    name,
    operations: iterations,
    duration: totalDuration,
    opsPerSecond,
    avgLatency,
    minLatency,
    maxLatency
  }
}
</script>

<style scoped>
.benchmark-panel {
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

.benchmark-controls {
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
  background: #ffc107;
  color: #212529;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.run-button:hover:not(:disabled) {
  background: #e0a800;
}

.run-button:disabled {
  background: #6c757d;
  color: white;
  cursor: not-allowed;
}

.benchmark-config {
  display: flex;
  align-items: center;
  gap: 8px;
}

.benchmark-config label {
  font-size: 14px;
  color: #495057;
}

.benchmark-config select {
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
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

.results-header {
  margin-bottom: 20px;
}

.results-header h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.results-summary {
  font-size: 14px;
  color: #6c757d;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.benchmark-result {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.result-header h5 {
  margin: 0;
  color: #2c3e50;
}

.result-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.result-badge.excellent {
  background: #d4edda;
  color: #155724;
}

.result-badge.good {
  background: #d1ecf1;
  color: #0c5460;
}

.result-badge.average {
  background: #fff3cd;
  color: #856404;
}

.result-badge.poor {
  background: #f8d7da;
  color: #721c24;
}

.result-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric {
  text-align: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.metric-label {
  display: block;
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
}

.metric-value {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.latency-chart {
  margin-top: 16px;
}

.chart-header {
  font-size: 14px;
  color: #495057;
  margin-bottom: 8px;
}

.chart-bar {
  display: flex;
  height: 24px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dee2e6;
}

.bar-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: white;
  font-weight: 500;
}

.bar-segment.min {
  background: #28a745;
}

.bar-segment.avg {
  background: #ffc107;
  color: #212529;
}

.bar-segment.max {
  background: #dc3545;
}

.performance-comparison {
  margin-bottom: 32px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.performance-comparison h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.comparison-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comparison-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  width: 150px;
  font-size: 14px;
  color: #495057;
  text-align: right;
}

.bar-container {
  flex: 1;
  height: 24px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8px;
  transition: width 0.5s ease;
}

.bar-fill.excellent {
  background: linear-gradient(90deg, #28a745, #20c997);
}

.bar-fill.good {
  background: linear-gradient(90deg, #17a2b8, #6f42c1);
}

.bar-fill.average {
  background: linear-gradient(90deg, #ffc107, #fd7e14);
}

.bar-fill.poor {
  background: linear-gradient(90deg, #dc3545, #e83e8c);
}

.bar-text {
  font-size: 12px;
  color: white;
  font-weight: 500;
}

.custom-test {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.custom-test h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.custom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.custom-controls select,
.custom-controls input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.custom-controls button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.custom-controls button:hover:not(:disabled) {
  background: #0056b3;
}

.custom-controls button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.custom-result {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 16px;
}

.result-details {
  margin-top: 8px;
  font-size: 14px;
  color: #6c757d;
}
</style>