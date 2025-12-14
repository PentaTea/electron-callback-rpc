import { IBenchmarkService, IDetailedBenchmarkResult } from '@shared/interfaces'

export interface BenchmarkConfig {
  name: string
  type: 'latency' | 'throughput' | 'serialization' | 'memory' | 'error'
  operations: number
  warmupRounds: number
  testRounds: number
  description: string
}

export interface BenchmarkSuite {
  name: string
  description: string
  configs: BenchmarkConfig[]
}

export class BenchmarkRunner {
  public rpcService: IBenchmarkService
  
  constructor(rpcService: IBenchmarkService) {
    this.rpcService = rpcService
  }

  // 预定义的测试套件
  static readonly SUITES: Record<string, BenchmarkSuite> = {
    latency: {
      name: 'Latency Tests',
      description: 'Measure round-trip latency for different operations',
      configs: [
        {
          name: 'NoOp',
          type: 'latency',
          operations: 1000,
          warmupRounds: 100,
          testRounds: 5,
          description: 'Pure IPC overhead with no operation'
        },
        {
          name: 'Echo Small',
          type: 'latency', 
          operations: 1000,
          warmupRounds: 100,
          testRounds: 5,
          description: 'Echo small string (10 chars)'
        },
        {
          name: 'Add Numbers',
          type: 'latency',
          operations: 1000,
          warmupRounds: 100,
          testRounds: 5,
          description: 'Simple arithmetic operation'
        },
        {
          name: 'Fibonacci',
          type: 'latency',
          operations: 100,
          warmupRounds: 20,
          testRounds: 5,
          description: 'CPU-intensive calculation (fib 20)'
        }
      ]
    },
    
    throughput: {
      name: 'Throughput Tests',
      description: 'Measure operations per second',
      configs: [
        {
          name: 'Batch Add',
          type: 'throughput',
          operations: 5000,
          warmupRounds: 500,
          testRounds: 3,
          description: 'Batch processing 100 additions'
        },
        {
          name: 'Batch Process',
          type: 'throughput',
          operations: 2000,
          warmupRounds: 200,
          testRounds: 3,
          description: 'Batch string processing'
        }
      ]
    },
    
    serialization: {
      name: 'Serialization Tests',
      description: 'Test different data types and sizes',
      configs: [
        {
          name: 'Simple Object',
          type: 'serialization',
          operations: 1000,
          warmupRounds: 100,
          testRounds: 5,
          description: 'Simple {name, age} object'
        },
        {
          name: 'Complex Object',
          type: 'serialization',
          operations: 500,
          warmupRounds: 50,
          testRounds: 5,
          description: 'Nested objects with Date and Map'
        },
        {
          name: 'Large String',
          type: 'serialization',
          operations: 100,
          warmupRounds: 20,
          testRounds: 5,
          description: 'Large string (10KB)'
        },
        {
          name: 'Buffer 1KB',
          type: 'serialization',
          operations: 500,
          warmupRounds: 50,
          testRounds: 5,
          description: 'Binary buffer 1KB'
        },
        {
          name: 'Buffer 100KB',
          type: 'serialization',
          operations: 50,
          warmupRounds: 10,
          testRounds: 3,
          description: 'Binary buffer 100KB'
        }
      ]
    },
    
    memory: {
      name: 'Memory Tests',
      description: 'Test memory usage and large data handling',
      configs: [
        {
          name: 'Large Array',
          type: 'memory',
          operations: 10,
          warmupRounds: 2,
          testRounds: 3,
          description: 'Process array with 1M elements'
        },
        {
          name: 'Create Buffer 1MB',
          type: 'memory',
          operations: 20,
          warmupRounds: 5,
          testRounds: 3,
          description: 'Create and transfer 1MB buffer'
        }
      ]
    },
    
    error: {
      name: 'Error Handling Tests',
      description: 'Test error handling performance',
      configs: [
        {
          name: 'Success Path',
          type: 'error',
          operations: 1000,
          warmupRounds: 100,
          testRounds: 5,
          description: 'Normal execution path'
        },
        {
          name: 'Error Path',
          type: 'error',
          operations: 1000,
          warmupRounds: 100,
          testRounds: 5,
          description: 'Exception throwing and handling'
        }
      ]
    }
  }

  // 运行RPC测试
  async runRpcTest(config: BenchmarkConfig): Promise<IDetailedBenchmarkResult> {
    // 预热
    await this.warmup(config, 'rpc')
    
    const latencies: number[] = []
    const memoryBefore = await this.rpcService.getMemoryUsage()
    let memoryPeak = memoryBefore
    
    const startTime = performance.now()
    
    for (let round = 0; round < config.testRounds; round++) {
      for (let i = 0; i < config.operations; i++) {
        const opStart = performance.now()
        
        await this.executeRpcOperation(config, i)
        
        const opEnd = performance.now()
        latencies.push(opEnd - opStart)
        
        // 定期检查内存使用
        if (i % 100 === 0) {
          const currentMemory = await this.rpcService.getMemoryUsage()
          if (currentMemory.heapUsed > memoryPeak.heapUsed) {
            memoryPeak = currentMemory
          }
        }
      }
    }
    
    const endTime = performance.now()
    const memoryAfter = await this.rpcService.getMemoryUsage()
    
    return this.calculateDetailedResult(
      `${config.name} (RPC)`,
      config.operations * config.testRounds,
      endTime - startTime,
      latencies,
      { before: memoryBefore, after: memoryAfter, peak: memoryPeak }
    )
  }

  // 运行Native IPC测试
  async runNativeTest(config: BenchmarkConfig): Promise<IDetailedBenchmarkResult> {
    // 预热
    await this.warmup(config, 'native')
    
    const latencies: number[] = []
    const memoryBefore = await window.api.benchmark.getMemoryUsage()
    let memoryPeak = memoryBefore
    
    const startTime = performance.now()
    
    for (let round = 0; round < config.testRounds; round++) {
      for (let i = 0; i < config.operations; i++) {
        const opStart = performance.now()
        
        await this.executeNativeOperation(config, i)
        
        const opEnd = performance.now()
        latencies.push(opEnd - opStart)
        
        // 定期检查内存使用
        if (i % 100 === 0) {
          const currentMemory = await window.api.benchmark.getMemoryUsage()
          if (currentMemory.heapUsed > memoryPeak.heapUsed) {
            memoryPeak = currentMemory
          }
        }
      }
    }
    
    const endTime = performance.now()
    const memoryAfter = await window.api.benchmark.getMemoryUsage()
    
    return this.calculateDetailedResult(
      `${config.name} (Native)`,
      config.operations * config.testRounds,
      endTime - startTime,
      latencies,
      { before: memoryBefore, after: memoryAfter, peak: memoryPeak }
    )
  }

  private async warmup(config: BenchmarkConfig, type: 'rpc' | 'native') {
    for (let i = 0; i < config.warmupRounds; i++) {
      if (type === 'rpc') {
        await this.executeRpcOperation(config, i)
      } else {
        await this.executeNativeOperation(config, i)
      }
    }
  }

  private async executeRpcOperation(config: BenchmarkConfig, iteration: number) {
    switch (config.name) {
      case 'NoOp':
        await this.rpcService.noop()
        break
      case 'Echo Small':
        await this.rpcService.echo('test12345')
        break
      case 'Add Numbers':
        await this.rpcService.add(iteration, iteration + 1)
        break
      case 'Fibonacci':
        await this.rpcService.fibonacci(20)
        break
      case 'Batch Add':
        const addOps = Array.from({ length: 100 }, (_, i) => ({ a: i, b: i + 1 }))
        await this.rpcService.batchAdd(addOps)
        break
      case 'Batch Process':
        const items = Array.from({ length: 50 }, (_, i) => `item${i}`)
        await this.rpcService.batchProcess(items)
        break
      case 'Simple Object':
        await this.rpcService.processSimpleObject({ name: 'test', age: 25 })
        break
      case 'Complex Object':
        await this.rpcService.processComplexObject({
          array: [1, 2, 3, 4, 5],
          nested: { deep: { value: 'test' } },
          date: new Date(),
          map: new Map([['key1', 1], ['key2', 2]])
        })
        break
      case 'Large String':
        await this.rpcService.echoLarge('x'.repeat(10))
        break
      case 'Buffer 1KB':
        await this.rpcService.processBuffer(new Uint8Array(1024))
        break
      case 'Buffer 100KB':
        await this.rpcService.processBuffer(new Uint8Array(102400))
        break
      case 'Large Array':
        await this.rpcService.processLargeArray(1000000)
        break
      case 'Create Buffer 1MB':
        await this.rpcService.createBuffer(1048576)
        break
      case 'Success Path':
        await this.rpcService.maybeThrow(false, 'test')
        break
      case 'Error Path':
        try {
          await this.rpcService.maybeThrow(true, 'test error')
        } catch {
          // Expected error
        }
        break
    }
  }

  private async executeNativeOperation(config: BenchmarkConfig, iteration: number) {
    switch (config.name) {
      case 'NoOp':
        await window.api.benchmark.noop()
        break
      case 'Echo Small':
        await window.api.benchmark.echo('test12345')
        break
      case 'Add Numbers':
        await window.api.benchmark.add(iteration, iteration + 1)
        break
      case 'Fibonacci':
        await window.api.benchmark.fibonacci(20)
        break
      case 'Batch Add':
        const addOps = Array.from({ length: 100 }, (_, i) => ({ a: i, b: i + 1 }))
        await window.api.benchmark.batchAdd(addOps)
        break
      case 'Batch Process':
        const items = Array.from({ length: 50 }, (_, i) => `item${i}`)
        await window.api.benchmark.batchProcess(items)
        break
      case 'Simple Object':
        await window.api.benchmark.processSimpleObject({ name: 'test', age: 25 })
        break
      case 'Complex Object':
        await window.api.benchmark.processComplexObject({
          array: [1, 2, 3, 4, 5],
          nested: { deep: { value: 'test' } },
          date: new Date(),
          map: new Map([['key1', 1], ['key2', 2]])
        })
        break
      case 'Large String':
        await window.api.benchmark.echoLarge('x'.repeat(10))
        break
      case 'Buffer 1KB':
        await window.api.benchmark.processBuffer(new Uint8Array(1024))
        break
      case 'Buffer 100KB':
        await window.api.benchmark.processBuffer(new Uint8Array(102400))
        break
      case 'Large Array':
        await window.api.benchmark.processLargeArray(1000000)
        break
      case 'Create Buffer 1MB':
        await window.api.benchmark.createBuffer(1048576)
        break
      case 'Success Path':
        await window.api.benchmark.maybeThrow(false, 'test')
        break
      case 'Error Path':
        try {
          await window.api.benchmark.maybeThrow(true, 'test error')
        } catch {
          // Expected error
        }
        break
    }
  }

  private calculateDetailedResult(
    name: string,
    operations: number,
    duration: number,
    latencies: number[],
    memoryUsage: { before: NodeJS.MemoryUsage; after: NodeJS.MemoryUsage; peak: NodeJS.MemoryUsage }
  ): IDetailedBenchmarkResult {
    const sortedLatencies = [...latencies].sort((a, b) => a - b)
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
    
    // 计算百分位数
    const p50Index = Math.floor(latencies.length * 0.5)
    const p95Index = Math.floor(latencies.length * 0.95)
    const p99Index = Math.floor(latencies.length * 0.99)
    
    // 计算标准差
    const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) / latencies.length
    const stdDeviation = Math.sqrt(variance)
    
    return {
      name,
      operations,
      duration,
      opsPerSecond: (operations / duration) * 1000,
      avgLatency,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      p50Latency: sortedLatencies[p50Index],
      p95Latency: sortedLatencies[p95Index],
      p99Latency: sortedLatencies[p99Index],
      stdDeviation,
      memoryUsage
    }
  }
}