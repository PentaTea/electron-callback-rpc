import { ipcMain } from 'electron'
import { DemoService } from './demo-service'

/**
 * 原生IPC处理器 - 用于与现有RPC功能对比
 * 保持与现有demo-service相同的延迟特性
 */
export class NativeHandler {
  private service: DemoService

  constructor() {
    this.service = new DemoService()
    this.registerHandlers()
  }

  private registerHandlers() {
    // 基础操作
    ipcMain.handle('native:echo', async (_, text: string) => {
      return await this.service.echo(text)
    })
    
    ipcMain.handle('native:add', async (_, a: number, b: number) => {
      return await this.service.add(a, b)
    })
    
    ipcMain.handle('native:performanceTest', async (_, iterations: number) => {
      return await this.service.performanceTest(iterations)
    })
    
    ipcMain.handle('native:memoryTest', async (_, size: number) => {
      return await this.service.memoryTest(size)
    })
    
    // 批量操作 - 用于吞吐量测试
    ipcMain.handle('native:batchAdd', async (_, operations: Array<{a: number, b: number}>) => {
      const results: number[] = []
      for (const op of operations) {
        results.push(await this.service.add(op.a, op.b))
      }
      return results
    })
    
    // 空操作 - 测试纯IPC开销
    ipcMain.handle('native:noop', async () => {
      return 'ok'
    })
  }

  public cleanup() {
    const handlers = [
      'native:echo',
      'native:add', 
      'native:performanceTest',
      'native:memoryTest',
      'native:batchAdd',
      'native:noop'
    ]

    handlers.forEach(handler => {
      ipcMain.removeAllListeners(handler)
    })
  }
}