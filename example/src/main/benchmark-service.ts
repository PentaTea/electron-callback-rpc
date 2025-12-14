import { IBenchmarkService } from '@shared/interfaces'

/**
 * 专门用于基准测试的服务
 * 移除所有人为延迟，专注于测试IPC本身的性能
 */
export class BenchmarkService implements IBenchmarkService {
  // === 纯开销测试 ===
  
  async noop(): Promise<void> {
    // 空操作，测试纯IPC开销
  }

  async echo(text: string): Promise<string> {
    // 无延迟的echo，测试字符串传输
    return text
  }

  async echoLarge(text: string): Promise<string> {
    // 返回大字符串，测试大数据传输
    return text.repeat(1000) // 放大1000倍
  }

  // === 计算密集型测试 ===
  
  async add(a: number, b: number): Promise<number> {
    // 纯计算，无延迟
    return a + b
  }

  async multiply(a: number, b: number): Promise<number> {
    return a * b
  }

  async fibonacci(n: number): Promise<number> {
    // 计算斐波那契数列，测试CPU密集型操作
    if (n <= 1) return n
    let a = 0, b = 1
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b]
    }
    return b
  }

  // === 数据序列化测试 ===
  
  async processSimpleObject(data: { name: string; age: number }): Promise<{ name: string; age: number }> {
    // 简单对象序列化测试
    return { ...data, age: data.age + 1 }
  }

  async processComplexObject(data: {
    array: number[]
    nested: { deep: { value: string } }
    date: Date
    map?: Map<string, number>
  }): Promise<any> {
    // 复杂对象序列化测试
    return {
      arrayLength: data.array.length,
      nestedValue: data.nested.deep.value,
      dateYear: data.date.getFullYear(),
      mapSize: data.map?.size || 0
    }
  }

  async processBuffer(buffer: Uint8Array): Promise<number> {
    // 二进制数据传输测试
    return buffer.length
  }

  // === 批量操作测试 ===
  
  async batchAdd(operations: Array<{ a: number; b: number }>): Promise<number[]> {
    // 批量计算，一次IPC调用
    return operations.map(op => op.a + op.b)
  }

  async batchProcess(items: string[]): Promise<string[]> {
    // 批量字符串处理
    return items.map(item => item.toUpperCase())
  }

  // === 错误处理测试 ===
  
  async throwError(message: string): Promise<never> {
    throw new Error(message)
  }

  async maybeThrow(shouldThrow: boolean, message: string): Promise<string> {
    if (shouldThrow) {
      throw new Error(message)
    }
    return 'success'
  }

  // === 内存测试 ===
  
  async createBuffer(size: number): Promise<Uint8Array> {
    // 创建指定大小的缓冲区
    const buffer = new Uint8Array(size)
    // 填充一些模式数据
    for (let i = 0; i < Math.min(size, 1000); i++) {
      buffer[i] = i % 256
    }
    return buffer
  }

  async processLargeArray(size: number): Promise<number> {
    // 处理大数组
    const arr = Array.from({ length: size }, (_, i) => i)
    return arr.reduce((sum, val) => sum + val, 0)
  }

  // === 并发测试辅助 ===
  
  async concurrentTask(taskId: number, duration: number): Promise<{ taskId: number; result: number }> {
    // 模拟并发任务，但不使用setTimeout
    let result = 0
    const iterations = duration * 10000 // 用计算代替延迟
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i)
    }
    return { taskId, result }
  }

  // === 性能分析辅助 ===
  
  async getMemoryUsage(): Promise<NodeJS.MemoryUsage> {
    return process.memoryUsage()
  }

  async getCpuUsage(): Promise<NodeJS.CpuUsage> {
    return process.cpuUsage()
  }
}