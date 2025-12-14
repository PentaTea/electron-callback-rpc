import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => void
      }
      native: {
        echo: (text: string) => Promise<string>
        add: (a: number, b: number) => Promise<number>
        performanceTest: (iterations: number) => Promise<number>
        memoryTest: (size: number) => Promise<Uint8Array>
        batchAdd: (operations: Array<{a: number, b: number}>) => Promise<number[]>
        noop: () => Promise<string>
      }
      benchmark: {
        // 纯开销测试
        noop: () => Promise<void>
        echo: (text: string) => Promise<string>
        echoLarge: (text: string) => Promise<string>
        
        // 计算测试
        add: (a: number, b: number) => Promise<number>
        multiply: (a: number, b: number) => Promise<number>
        fibonacci: (n: number) => Promise<number>
        
        // 序列化测试
        processSimpleObject: (data: { name: string; age: number }) => Promise<{ name: string; age: number }>
        processComplexObject: (data: any) => Promise<any>
        processBuffer: (buffer: Uint8Array) => Promise<number>
        
        // 批量操作
        batchAdd: (operations: Array<{ a: number; b: number }>) => Promise<number[]>
        batchProcess: (items: string[]) => Promise<string[]>
        
        // 错误处理
        throwError: (message: string) => Promise<never>
        maybeThrow: (shouldThrow: boolean, message: string) => Promise<string>
        
        // 内存测试
        createBuffer: (size: number) => Promise<Uint8Array>
        processLargeArray: (size: number) => Promise<number>
        
        // 并发测试
        concurrentTask: (taskId: number, duration: number) => Promise<{ taskId: number; result: number }>
        
        // 性能分析
        getMemoryUsage: () => Promise<NodeJS.MemoryUsage>
        getCpuUsage: () => Promise<NodeJS.CpuUsage>
      }
    }
  }
}
