import { ipcMain } from 'electron'
import { BenchmarkService } from './benchmark-service'

/**
 * 基准测试的原生IPC处理器
 * 提供与RPC相同的接口，但使用原生IPC实现
 */
export class BenchmarkHandler {
  private service: BenchmarkService

  constructor() {
    this.service = new BenchmarkService()
    this.registerHandlers()
  }

  private registerHandlers() {
    // 纯开销测试
    ipcMain.handle('benchmark:noop', async () => {
      return await this.service.noop()
    })

    ipcMain.handle('benchmark:echo', async (_, text: string) => {
      return await this.service.echo(text)
    })

    ipcMain.handle('benchmark:echoLarge', async (_, text: string) => {
      return await this.service.echoLarge(text)
    })

    // 计算测试
    ipcMain.handle('benchmark:add', async (_, a: number, b: number) => {
      return await this.service.add(a, b)
    })

    ipcMain.handle('benchmark:multiply', async (_, a: number, b: number) => {
      return await this.service.multiply(a, b)
    })

    ipcMain.handle('benchmark:fibonacci', async (_, n: number) => {
      return await this.service.fibonacci(n)
    })

    // 序列化测试
    ipcMain.handle('benchmark:processSimpleObject', async (_, data: { name: string; age: number }) => {
      return await this.service.processSimpleObject(data)
    })

    ipcMain.handle('benchmark:processComplexObject', async (_, data: any) => {
      return await this.service.processComplexObject(data)
    })

    ipcMain.handle('benchmark:processBuffer', async (_, buffer: Uint8Array) => {
      return await this.service.processBuffer(buffer)
    })

    // 批量操作
    ipcMain.handle('benchmark:batchAdd', async (_, operations: Array<{ a: number; b: number }>) => {
      return await this.service.batchAdd(operations)
    })

    ipcMain.handle('benchmark:batchProcess', async (_, items: string[]) => {
      return await this.service.batchProcess(items)
    })

    // 错误处理
    ipcMain.handle('benchmark:throwError', async (_, message: string) => {
      return await this.service.throwError(message)
    })

    ipcMain.handle('benchmark:maybeThrow', async (_, shouldThrow: boolean, message: string) => {
      return await this.service.maybeThrow(shouldThrow, message)
    })

    // 内存测试
    ipcMain.handle('benchmark:createBuffer', async (_, size: number) => {
      return await this.service.createBuffer(size)
    })

    ipcMain.handle('benchmark:processLargeArray', async (_, size: number) => {
      return await this.service.processLargeArray(size)
    })

    // 并发测试
    ipcMain.handle('benchmark:concurrentTask', async (_, taskId: number, duration: number) => {
      return await this.service.concurrentTask(taskId, duration)
    })

    // 性能分析
    ipcMain.handle('benchmark:getMemoryUsage', async () => {
      return await this.service.getMemoryUsage()
    })

    ipcMain.handle('benchmark:getCpuUsage', async () => {
      return await this.service.getCpuUsage()
    })
  }

  public cleanup() {
    // 清理所有处理器
    const handlers = [
      'benchmark:noop',
      'benchmark:echo',
      'benchmark:echoLarge',
      'benchmark:add',
      'benchmark:multiply',
      'benchmark:fibonacci',
      'benchmark:processSimpleObject',
      'benchmark:processComplexObject',
      'benchmark:processBuffer',
      'benchmark:batchAdd',
      'benchmark:batchProcess',
      'benchmark:throwError',
      'benchmark:maybeThrow',
      'benchmark:createBuffer',
      'benchmark:processLargeArray',
      'benchmark:concurrentTask',
      'benchmark:getMemoryUsage',
      'benchmark:getCpuUsage'
    ]

    handlers.forEach(handler => {
      ipcMain.removeAllListeners(handler)
    })
  }
}