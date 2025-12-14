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