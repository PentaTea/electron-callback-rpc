import { IDemoService } from '@shared/interfaces'

export class DemoService implements IDemoService {
  async echo(text: string): Promise<string> {
    // 模拟一些延迟
    await new Promise(resolve => setTimeout(resolve, 50))
    return `Echo: ${text}`
  }

  async add(a: number, b: number): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 10))
    return a + b
  }

  async processWithCallback(
    data: string,
    onProgress: (percent: number, message: string) => void
  ): Promise<string> {
    const steps = 10
    for (let i = 0; i <= steps; i++) {
      const percent = (i / steps) * 100
      await onProgress(percent, `Processing step ${i}/${steps}`)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return `Processed: ${data}`
  }

  async processComplexData(data: {
    map: Map<string, number>
    set: Set<string>
    date: Date
    buffer: Uint8Array
    regex: RegExp
    error?: Error
  }): Promise<any> {
    // 验证复杂类型的序列化和反序列化
    const result = {
      mapSize: data.map.size,
      mapEntries: Array.from(data.map.entries()),
      setSize: data.set.size,
      setValues: Array.from(data.set),
      dateYear: data.date.getFullYear(),
      bufferLength: data.buffer.length,
      regexSource: data.regex.source,
      regexFlags: data.regex.flags,
      errorMessage: data.error?.message
    }
    
    return result
  }

  async longRunningTask(
    duration: number,
    onUpdate: (progress: number, data: any) => void
  ): Promise<string> {
    const startTime = Date.now()
    const endTime = startTime + duration
    
    while (Date.now() < endTime) {
      const elapsed = Date.now() - startTime
      const progress = (elapsed / duration) * 100
      
      await onUpdate(progress, {
        elapsed,
        remaining: duration - elapsed,
        timestamp: new Date().toISOString()
      })
      
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    return `Task completed in ${duration}ms`
  }

  async throwError(message: string): Promise<never> {
    throw new Error(message)
  }

  async performanceTest(iterations: number): Promise<number> {
    const startTime = performance.now()
    
    // 执行一些计算密集型操作
    let sum = 0
    for (let i = 0; i < iterations; i++) {
      sum += Math.sqrt(i) * Math.sin(i)
    }
    
    const endTime = performance.now()
    return endTime - startTime
  }

  async memoryTest(size: number): Promise<Uint8Array> {
    // 创建指定大小的缓冲区
    const buffer = new Uint8Array(size)
    
    // 填充一些数据
    for (let i = 0; i < Math.min(size, 1000); i++) {
      buffer[i] = i % 256
    }
    
    return buffer
  }
}