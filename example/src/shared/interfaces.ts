// 共享的接口定义
export interface IDemoService {
  // 基础功能测试
  echo(text: string): Promise<string>
  add(a: number, b: number): Promise<number>
  
  // 回调功能测试
  processWithCallback(
    data: string, 
    onProgress: (percent: number, message: string) => void
  ): Promise<string>
  
  // 复杂类型测试
  processComplexData(data: {
    map: Map<string, number>
    set: Set<string>
    date: Date
    buffer: Uint8Array
    regex: RegExp
    error?: Error
  }): Promise<any>
  
  // 长时间运行任务
  longRunningTask(
    duration: number,
    onUpdate: (progress: number, data: any) => void
  ): Promise<string>
  
  // 错误处理测试
  throwError(message: string): Promise<never>
  
  // 性能测试相关
  performanceTest(iterations: number): Promise<number>
  memoryTest(size: number): Promise<Uint8Array>
}

export interface ITestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  details?: any
}

export interface IBenchmarkResult {
  name: string
  operations: number
  duration: number
  opsPerSecond: number
  avgLatency: number
  minLatency: number
  maxLatency: number
}

export interface IStressTestResult {
  concurrent: number
  totalOperations: number
  successCount: number
  errorCount: number
  avgLatency: number
  maxLatency: number
  throughput: number
}

// 基准测试专用接口
export interface IBenchmarkService {
  // 纯开销测试
  noop(): Promise<void>
  echo(text: string): Promise<string>
  echoLarge(text: string): Promise<string>
  
  // 计算测试
  add(a: number, b: number): Promise<number>
  multiply(a: number, b: number): Promise<number>
  fibonacci(n: number): Promise<number>
  
  // 序列化测试
  processSimpleObject(data: { name: string; age: number }): Promise<{ name: string; age: number }>
  processComplexObject(data: {
    array: number[]
    nested: { deep: { value: string } }
    date: Date
    map?: Map<string, number>
  }): Promise<any>
  processBuffer(buffer: Uint8Array): Promise<number>
  
  // 批量操作
  batchAdd(operations: Array<{ a: number; b: number }>): Promise<number[]>
  batchProcess(items: string[]): Promise<string[]>
  
  // 错误处理
  throwError(message: string): Promise<never>
  maybeThrow(shouldThrow: boolean, message: string): Promise<string>
  
  // 内存测试
  createBuffer(size: number): Promise<Uint8Array>
  processLargeArray(size: number): Promise<number>
  
  // 并发测试
  concurrentTask(taskId: number, duration: number): Promise<{ taskId: number; result: number }>
  
  // 性能分析
  getMemoryUsage(): Promise<NodeJS.MemoryUsage>
  getCpuUsage(): Promise<NodeJS.CpuUsage>
}

// 详细的基准测试结果
export interface IDetailedBenchmarkResult extends IBenchmarkResult {
  p50Latency: number
  p95Latency: number
  p99Latency: number
  stdDeviation: number
  memoryUsage?: {
    before: NodeJS.MemoryUsage
    after: NodeJS.MemoryUsage
    peak: NodeJS.MemoryUsage
  }
}