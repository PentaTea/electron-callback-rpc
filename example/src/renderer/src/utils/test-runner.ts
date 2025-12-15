import { IDemoService, ITestResult, IBenchmarkResult, IStressTestResult } from '@shared/interfaces'
import { Client } from '@mukea/electron-callback-rpc'

export class TestRunner {
  public service: IDemoService
  public client: Client
  
  constructor(service: IDemoService, client: Client) {
    this.service = service
    this.client = client
  }

  async runBasicTests(): Promise<ITestResult[]> {
    const results: ITestResult[] = []

    // Echo 测试
    results.push(await this.runTest('Echo Test', async () => {
      const result = await this.service.echo('Hello World')
      if (result !== 'Echo: Hello World') {
        throw new Error(`Expected 'Echo: Hello World', got '${result}'`)
      }
    }))

    // Add 测试
    results.push(await this.runTest('Add Test', async () => {
      const result = await this.service.add(5, 3)
      if (result !== 8) {
        throw new Error(`Expected 8, got ${result}`)
      }
    }))

    // 错误处理测试
    results.push(await this.runTest('Error Handling Test', async () => {
      try {
        await this.service.throwError('Test error')
        throw new Error('Expected error to be thrown')
      } catch (error: any) {
        if (error.message !== 'Test error') {
          throw new Error(`Expected 'Test error', got '${error.message}'`)
        }
      }
    }))

    return results
  }

  async runCallbackTests(): Promise<ITestResult[]> {
    const results: ITestResult[] = []

    // 回调测试
    results.push(await this.runTest('Callback Test', async () => {
      const progressUpdates: Array<{percent: number, message: string}> = []
      
      const result = await this.service.processWithCallback('test data', (percent, message) => {
        progressUpdates.push({ percent, message })
      })

      if (result !== 'Processed: test data') {
        throw new Error(`Expected 'Processed: test data', got '${result}'`)
      }

      if (progressUpdates.length === 0) {
        throw new Error('No progress updates received')
      }

      // 验证进度更新
      const lastUpdate = progressUpdates[progressUpdates.length - 1]
      if (lastUpdate.percent !== 100) {
        throw new Error(`Expected final progress to be 100%, got ${lastUpdate.percent}%`)
      }
    }))

    // 长时间运行任务测试
    results.push(await this.runTest('Long Running Task Test', async () => {
      const updates: any[] = []
      
      const result = await this.service.longRunningTask(500, (progress, data) => {
        updates.push({ progress, data })
      })

      if (!result.includes('Task completed')) {
        throw new Error(`Expected task completion message, got '${result}'`)
      }

      if (updates.length === 0) {
        throw new Error('No updates received')
      }
    }))

    return results
  }

  async runComplexTypeTests(): Promise<ITestResult[]> {
    const results: ITestResult[] = []

    results.push(await this.runTest('Complex Types Test', async () => {
      const testData = {
        map: new Map([['key1', 1], ['key2', 2]]),
        set: new Set(['value1', 'value2']),
        date: new Date('2023-01-01'),
        buffer: new Uint8Array([1, 2, 3, 4, 5]),
        regex: /test\d+/gi,
        error: new Error('Test error')
      }

      const result = await this.service.processComplexData(testData)

      // 验证结果
      if (result.mapSize !== 2) {
        throw new Error(`Expected map size 2, got ${result.mapSize}`)
      }

      if (result.setSize !== 2) {
        throw new Error(`Expected set size 2, got ${result.setSize}`)
      }

      if (result.dateYear !== 2023) {
        throw new Error(`Expected date year 2023, got ${result.dateYear}`)
      }

      if (result.bufferLength !== 5) {
        throw new Error(`Expected buffer length 5, got ${result.bufferLength}`)
      }

      if (result.regexSource !== 'test\\d+') {
        throw new Error(`Expected regex source 'test\\d+', got '${result.regexSource}'`)
      }

      if (result.errorMessage !== 'Test error') {
        throw new Error(`Expected error message 'Test error', got '${result.errorMessage}'`)
      }
    }))

    return results
  }

  async runBenchmarks(): Promise<IBenchmarkResult[]> {
    const results: IBenchmarkResult[] = []

    // Echo 性能测试
    results.push(await this.runBenchmark('Echo Performance', async () => {
      await this.service.echo('benchmark')
    }, 100))

    // Add 性能测试
    results.push(await this.runBenchmark('Add Performance', async () => {
      await this.service.add(Math.random(), Math.random())
    }, 100))

    // 性能测试方法
    results.push(await this.runBenchmark('Performance Test Method', async () => {
      await this.service.performanceTest(1000)
    }, 10))

    return results
  }

  async runStressTest(concurrent: number, operationsPerWorker: number): Promise<IStressTestResult> {
    const startTime = performance.now()
    const workers: Promise<any>[] = []
    const results: Array<{success: boolean, latency: number}> = []

    for (let i = 0; i < concurrent; i++) {
      workers.push(this.runWorker(operationsPerWorker, results))
    }

    await Promise.all(workers)

    const endTime = performance.now()
    const totalDuration = endTime - startTime
    const totalOperations = concurrent * operationsPerWorker
    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length
    const latencies = results.filter(r => r.success).map(r => r.latency)
    
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0
    const throughput = (successCount / totalDuration) * 1000 // ops per second

    return {
      concurrent,
      totalOperations,
      successCount,
      errorCount,
      avgLatency,
      maxLatency,
      throughput
    }
  }

  public async runWorker(operations: number, results: Array<{success: boolean, latency: number}>): Promise<void> {
    for (let i = 0; i < operations; i++) {
      const startTime = performance.now()
      try {
        await this.service.echo(`worker-${i}`)
        const latency = performance.now() - startTime
        results.push({ success: true, latency })
      } catch (error) {
        const latency = performance.now() - startTime
        results.push({ success: false, latency })
      }
    }
  }

  public async runTest(name: string, testFn: () => Promise<void>): Promise<ITestResult> {
    const startTime = performance.now()
    try {
      await testFn()
      const duration = performance.now() - startTime
      return {
        name,
        passed: true,
        duration
      }
    } catch (error: any) {
      const duration = performance.now() - startTime
      return {
        name,
        passed: false,
        duration,
        error: error.message
      }
    }
  }

  public async runBenchmark(name: string, operation: () => Promise<void>, iterations: number): Promise<IBenchmarkResult> {
    const latencies: number[] = []
    
    // 预热
    for (let i = 0; i < 5; i++) {
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
}