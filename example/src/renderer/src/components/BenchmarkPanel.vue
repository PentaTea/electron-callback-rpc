<template>
  <div class="benchmark-panel">
    <div class="panel-header">
      <h3>⚡ Performance Benchmarks</h3>
      <p>Compare RPC vs Native IPC Performance</p>
    </div>
    
    <div class="benchmark-controls">
      <div class="benchmark-config">
        <label>Test Suite:</label>
        <select v-model="selectedSuite" :disabled="running">
          <option value="latency">Latency Tests - Round-trip time</option>
          <option value="throughput">Throughput Tests - Operations/sec</option>
          <option value="serialization">Serialization Tests - Data types</option>
          <option value="memory">Memory Tests - Large data</option>
          <option value="error">Error Handling Tests</option>
        </select>
      </div>
      <button @click="runBenchmarks" :disabled="running" class="run-button">
        {{ running ? 'Running...' : 'Run Comparison' }}
      </button>
    </div>
    
    <div v-if="running" class="loading">
      <div>
        <div class="spinner"></div>
        <span>{{ currentPhase }}</span>
      </div>
      <div class="progress-info">
        <div>Test: {{ currentTest }}</div>
        <div>Progress: {{ progress }}/{{ totalTests }}</div>
      </div>
    </div>
    
    <div v-if="results.length > 0" class="benchmark-results">
      <div class="results-header">
        <h4>Performance Comparison Results</h4>
        <p class="results-summary">
          {{ results.length }} tests completed • Total time: {{ totalDuration.toFixed(2) }}ms
        </p>
      </div>
      
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card rpc">
          <h5>🚀 RPC Package</h5>
          <div class="card-metrics">
            <div class="metric">
              <span class="label">Avg Latency</span>
              <span class="value">{{ getRpcAvgLatency() }}ms</span>
            </div>
            <div class="metric">
              <span class="label">Throughput</span>
              <span class="value">{{ getRpcThroughput() }} ops/sec</span>
            </div>
          </div>
        </div>
        
        <div class="summary-card native">
          <h5>⚡ Native IPC</h5>
          <div class="card-metrics">
            <div class="metric">
              <span class="label">Avg Latency</span>
              <span class="value">{{ getNativeAvgLatency() }}ms</span>
            </div>
            <div class="metric">
              <span class="label">Throughput</span>
              <span class="value">{{ getNativeThroughput() }} ops/sec</span>
            </div>
          </div>
        </div>
        
        <div class="summary-card comparison">
          <h5>📊 Performance Ratio</h5>
          <div class="card-metrics">
            <div class="metric">
              <span class="label">Latency Overhead</span>
              <span class="value" :class="getOverheadClass()">{{ getLatencyOverhead() }}</span>
            </div>
            <div class="metric">
              <span class="label">Throughput Ratio</span>
              <span class="value" :class="getThroughputRatioClass()">{{ getThroughputRatio() }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Detailed Results -->
      <div class="detailed-results">
        <h4>Detailed Test Results</h4>
        <p class="scroll-hint">💡 Scroll horizontally to see all columns</p>
        <div class="results-table">
          <div class="table-container">
            <div class="table-header">
              <div class="col-test">Test</div>
              <div class="col-method">Method</div>
              <div class="col-ops">Operations</div>
              <div class="col-duration">Duration (ms)</div>
              <div class="col-throughput">Throughput (ops/sec)</div>
              <div class="col-latency">Avg Latency (ms)</div>
              <div class="col-p95">P95 Latency (ms)</div>
              <div class="col-p99">P99 Latency (ms)</div>
              <div class="col-stddev">Std Dev (ms)</div>
            </div>
            
            <template v-for="result in results" :key="result.name">
              <div class="table-row" :class="result.name.includes('RPC') ? 'rpc-row' : 'native-row'">
                <div class="col-test">{{ getTestName(result.name) }}</div>
                <div class="col-method">
                  <span class="method-badge" :class="result.name.includes('RPC') ? 'rpc' : 'native'">
                    {{ result.name.includes('RPC') ? 'RPC' : 'Native' }}
                  </span>
                </div>
                <div class="col-ops">{{ result.operations.toLocaleString() }}</div>
                <div class="col-duration">{{ result.duration.toFixed(2) }}</div>
                <div class="col-throughput">{{ result.opsPerSecond.toFixed(0) }}</div>
                <div class="col-latency">{{ result.avgLatency.toFixed(3) }}</div>
                <div class="col-p95">{{ result.p95Latency?.toFixed(3) || 'N/A' }}</div>
                <div class="col-p99">{{ result.p99Latency?.toFixed(3) || 'N/A' }}</div>
                <div class="col-stddev">{{ result.stdDeviation?.toFixed(3) || 'N/A' }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>
      
      <!-- Performance Charts -->
      <div class="performance-charts">
        <div class="chart-section">
          <h4>Latency Comparison</h4>
          <div class="latency-chart">
            <div v-for="pair in getTestPairs()" :key="pair.test" class="chart-pair">
              <div class="chart-label">{{ pair.test }}</div>
              <div class="chart-bars">
                <div class="chart-bar rpc">
                  <div class="bar-fill" :style="{ width: getLatencyBarWidth(pair.rpc.avgLatency) + '%' }">
                    <span class="bar-text">RPC: {{ pair.rpc.avgLatency.toFixed(2) }}ms</span>
                  </div>
                </div>
                <div class="chart-bar native">
                  <div class="bar-fill" :style="{ width: getLatencyBarWidth(pair.native.avgLatency) + '%' }">
                    <span class="bar-text">Native: {{ pair.native.avgLatency.toFixed(2) }}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="chart-section">
          <h4>Throughput Comparison</h4>
          <div class="throughput-chart">
            <div v-for="pair in getTestPairs()" :key="pair.test" class="chart-pair">
              <div class="chart-label">{{ pair.test }}</div>
              <div class="chart-bars">
                <div class="chart-bar rpc">
                  <div class="bar-fill" :style="{ width: getThroughputBarWidth(pair.rpc.opsPerSecond) + '%' }">
                    <span class="bar-text">RPC: {{ pair.rpc.opsPerSecond.toFixed(0) }}</span>
                  </div>
                </div>
                <div class="chart-bar native">
                  <div class="bar-fill" :style="{ width: getThroughputBarWidth(pair.native.opsPerSecond) + '%' }">
                    <span class="bar-text">Native: {{ pair.native.opsPerSecond.toFixed(0) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { TestRunner } from '../utils/test-runner'
import { BenchmarkRunner } from '../utils/benchmark-runner'
import { IDetailedBenchmarkResult } from '@shared/interfaces'
import { createProxyService } from 'electron-callback-rpc'

interface Props {
  testRunner: TestRunner
}

const props = defineProps<Props>()

const running = ref(false)
const selectedSuite = ref('latency')
const results = ref<IDetailedBenchmarkResult[]>([])
const currentPhase = ref('')
const currentTest = ref('')
const progress = ref(0)
const totalTests = ref(0)

// 创建基准测试运行器
const benchmarkRunner = new BenchmarkRunner(
  createProxyService(props.testRunner.client, 'benchmark')
)

const totalDuration = computed(() => {
  return results.value.reduce((sum, result) => sum + result.duration, 0)
})

// 运行基准测试
async function runBenchmarks() {
  running.value = true
  results.value = []
  progress.value = 0
  
  const suite = BenchmarkRunner.SUITES[selectedSuite.value]
  totalTests.value = suite.configs.length * 2 // RPC + Native for each test
  
  try {
    currentPhase.value = 'Initializing benchmark suite...'
    
    // 运行测试
    for (const config of suite.configs) {
      // RPC 测试
      currentPhase.value = `Running RPC ${config.name}...`
      currentTest.value = `${config.name} (RPC) - ${config.description}`
      
      try {
        const rpcResult = await benchmarkRunner.runRpcTest(config)
        results.value.push(rpcResult)
      } catch (error) {
        console.error(`RPC test ${config.name} failed:`, error)
        // 添加失败结果
        results.value.push({
          name: `${config.name} (RPC)`,
          operations: 0,
          duration: 0,
          opsPerSecond: 0,
          avgLatency: 0,
          minLatency: 0,
          maxLatency: 0,
          p50Latency: 0,
          p95Latency: 0,
          p99Latency: 0,
          stdDeviation: 0
        })
      }
      progress.value++
      
      // 系统恢复时间
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Native IPC 测试
      currentPhase.value = `Running Native ${config.name}...`
      currentTest.value = `${config.name} (Native) - ${config.description}`
      
      try {
        const nativeResult = await benchmarkRunner.runNativeTest(config)
        results.value.push(nativeResult)
      } catch (error) {
        console.error(`Native test ${config.name} failed:`, error)
        // 添加失败结果
        results.value.push({
          name: `${config.name} (Native)`,
          operations: 0,
          duration: 0,
          opsPerSecond: 0,
          avgLatency: 0,
          minLatency: 0,
          maxLatency: 0,
          p50Latency: 0,
          p95Latency: 0,
          p99Latency: 0,
          stdDeviation: 0
        })
      }
      progress.value++
      
      // 测试间隔
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    currentPhase.value = 'Benchmark completed!'
  } catch (error) {
    console.error('Benchmark suite error:', error)
    currentPhase.value = 'Benchmark failed!'
  } finally {
    running.value = false
  }
}



// 计算汇总指标
function getRpcResults() {
  return results.value.filter(r => r.name.includes('RPC'))
}

function getNativeResults() {
  return results.value.filter(r => r.name.includes('Native'))
}

function getRpcAvgLatency() {
  const rpcResults = getRpcResults()
  if (rpcResults.length === 0) return '0.00'
  const avg = rpcResults.reduce((sum, r) => sum + r.avgLatency, 0) / rpcResults.length
  return avg.toFixed(2)
}

function getNativeAvgLatency() {
  const nativeResults = getNativeResults()
  if (nativeResults.length === 0) return '0.00'
  const avg = nativeResults.reduce((sum, r) => sum + r.avgLatency, 0) / nativeResults.length
  return avg.toFixed(2)
}

function getRpcThroughput() {
  const rpcResults = getRpcResults()
  if (rpcResults.length === 0) return '0'
  const avg = rpcResults.reduce((sum, r) => sum + r.opsPerSecond, 0) / rpcResults.length
  return avg.toFixed(0)
}

function getNativeThroughput() {
  const nativeResults = getNativeResults()
  if (nativeResults.length === 0) return '0'
  const avg = nativeResults.reduce((sum, r) => sum + r.opsPerSecond, 0) / nativeResults.length
  return avg.toFixed(0)
}

function getLatencyOverhead() {
  const rpcLatency = parseFloat(getRpcAvgLatency())
  const nativeLatency = parseFloat(getNativeAvgLatency())
  if (nativeLatency === 0) return 'N/A'
  const overhead = ((rpcLatency - nativeLatency) / nativeLatency * 100)
  return `+${overhead.toFixed(1)}%`
}

function getThroughputRatio() {
  const rpcThroughput = parseFloat(getRpcThroughput())
  const nativeThroughput = parseFloat(getNativeThroughput())
  if (nativeThroughput === 0) return 'N/A'
  const ratio = (rpcThroughput / nativeThroughput)
  return `${ratio.toFixed(2)}x`
}

function getOverheadClass() {
  const rpcLatency = parseFloat(getRpcAvgLatency())
  const nativeLatency = parseFloat(getNativeAvgLatency())
  if (nativeLatency === 0) return ''
  const overhead = ((rpcLatency - nativeLatency) / nativeLatency * 100)
  if (overhead < 10) return 'excellent'
  if (overhead < 25) return 'good'
  if (overhead < 50) return 'warning'
  return 'poor'
}

function getThroughputRatioClass() {
  const ratio = parseFloat(getThroughputRatio().replace('x', ''))
  if (ratio > 0.9) return 'excellent'
  if (ratio > 0.7) return 'good'
  if (ratio > 0.5) return 'warning'
  return 'poor'
}

// 表格和图表辅助函数
function getTestName(fullName: string) {
  return fullName.replace(' (RPC)', '').replace(' (Native)', '')
}

function getTestPairs() {
  const pairs: any[] = []
  const rpcResults = getRpcResults()
  
  rpcResults.forEach(rpcResult => {
    const testName = getTestName(rpcResult.name)
    const nativeResult = results.value.find(r => r.name === `${testName} (Native)`)
    
    if (nativeResult) {
      pairs.push({
        test: testName,
        rpc: rpcResult,
        native: nativeResult
      })
    }
  })
  
  return pairs
}

function getLatencyBarWidth(latency: number) {
  if (results.value.length === 0) return 0
  const maxLatency = Math.max(...results.value.map(r => r.avgLatency))
  return maxLatency > 0 ? (latency / maxLatency) * 100 : 0
}

function getThroughputBarWidth(throughput: number) {
  if (results.value.length === 0) return 0
  const maxThroughput = Math.max(...results.value.map(r => r.opsPerSecond))
  return maxThroughput > 0 ? (throughput / maxThroughput) * 100 : 0
}
</script>

<style scoped>
.benchmark-panel {
  padding: 20px;
}

.panel-header h3 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
}

.panel-header p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
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

.benchmark-config {
  display: flex;
  align-items: center;
  gap: 8px;
}

.benchmark-config label {
  font-size: 14px;
  color: #495057;
  white-space: nowrap;
}

.benchmark-config select {
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.run-button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.run-button:hover:not(:disabled) {
  background: #0056b3;
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

.benchmark-results {
  margin-bottom: 32px;
}

.results-header h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.results-summary {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.summary-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.summary-card.rpc {
  border-left: 4px solid #007bff;
}

.summary-card.native {
  border-left: 4px solid #28a745;
}

.summary-card.comparison {
  border-left: 4px solid #ffc107;
}

.summary-card h5 {
  margin: 0 0 16px 0;
  color: #2c3e50;
  font-size: 16px;
}

.card-metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric .label {
  font-size: 14px;
  color: #666;
}

.metric .value {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.value.excellent { color: #28a745; }
.value.good { color: #17a2b8; }
.value.warning { color: #ffc107; }
.value.poor { color: #dc3545; }

/* Detailed Results Table */
.detailed-results {
  margin-bottom: 32px;
}

.detailed-results h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.scroll-hint {
  margin: 0 0 16px 0;
  color: #6c757d;
  font-size: 13px;
  font-style: italic;
}

.results-table {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  min-width: 100%;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.results-table::-webkit-scrollbar {
  height: 12px;
}

.results-table::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
}

.results-table::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 6px;
  border: 2px solid #f1f1f1;
}

.results-table::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.table-container {
  min-width: 1200px; /* 确保表格有足够的最小宽度 */
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 80px 100px 120px 140px 120px 120px 120px 120px;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  font-weight: 600;
  font-size: 14px;
  color: #495057;
  border-bottom: 1px solid #e9ecef;
}

/* 表头数字列和方法列居中对齐 */
.table-header .col-method,
.table-header .col-ops,
.table-header .col-duration,
.table-header .col-throughput,
.table-header .col-latency,
.table-header .col-p95,
.table-header .col-p99,
.table-header .col-stddev {
  text-align: center;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 80px 100px 120px 140px 120px 120px 120px 120px;
  gap: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: #2c3e50;
  border-bottom: 1px solid #f1f3f4;
}

/* 数字列和方法列居中对齐 */
.table-row .col-method,
.table-row .col-ops,
.table-row .col-duration,
.table-row .col-throughput,
.table-row .col-latency,
.table-row .col-p95,
.table-row .col-p99,
.table-row .col-stddev {
  text-align: center;
}

/* 数字列使用等宽字体 */
.table-row .col-ops,
.table-row .col-duration,
.table-row .col-throughput,
.table-row .col-latency,
.table-row .col-p95,
.table-row .col-p99,
.table-row .col-stddev {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row.rpc-row {
  background: rgba(0, 123, 255, 0.05);
}

.table-row.native-row {
  background: rgba(40, 167, 69, 0.05);
}

.method-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.method-badge.rpc {
  background: #007bff;
  color: white;
}

.method-badge.native {
  background: #28a745;
  color: white;
}

/* Performance Charts */
.performance-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 32px;
}

.chart-section h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.chart-pair {
  margin-bottom: 16px;
}

.chart-label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
}

.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chart-bar {
  position: relative;
  height: 32px;
  background: #f8f9fa;
  border-radius: 4px;
  overflow: hidden;
}

.chart-bar.rpc .bar-fill {
  background: linear-gradient(90deg, #007bff, #0056b3);
}

.chart-bar.native .bar-fill {
  background: linear-gradient(90deg, #28a745, #1e7e34);
}

.bar-fill {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8px;
  transition: width 0.5s ease;
  min-width: 60px;
}

.bar-text {
  font-size: 12px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
}

/* Responsive */
@media (max-width: 1200px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .performance-charts {
    grid-template-columns: 1fr;
  }
}

/* 响应式设计 - 保持横向滚动而不是隐藏列 */
@media (max-width: 1200px) {
  .table-container {
    min-width: 1000px;
  }
  
  .table-header,
  .table-row {
    font-size: 12px;
    gap: 10px;
  }
  
  .scroll-hint {
    display: block;
    background: #e3f2fd;
    padding: 8px 12px;
    border-radius: 4px;
    border-left: 3px solid #2196f3;
  }
}

@media (max-width: 900px) {
  .benchmark-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .table-container {
    min-width: 900px;
  }
  
  .scroll-hint {
    font-size: 12px;
  }
}

@media (max-width: 600px) {
  .table-container {
    min-width: 800px;
  }
  
  .table-header,
  .table-row {
    font-size: 11px;
    gap: 8px;
    padding: 8px 12px;
  }
  
  .scroll-hint {
    font-size: 11px;
    margin-bottom: 12px;
  }
}
</style>