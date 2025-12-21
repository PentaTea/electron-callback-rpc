import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom APIs for renderer
const api = {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) =>
      ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (event: any, ...args: any[]) => void) =>
      ipcRenderer.on(channel, listener),
    removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) =>
      ipcRenderer.removeListener(channel, listener),
  },
  // 原生 IPC 方法 - 用于与RPC功能对比
  native: {
    echo: (text: string) => ipcRenderer.invoke("native:echo", text),
    add: (a: number, b: number) => ipcRenderer.invoke("native:add", a, b),
    performanceTest: (iterations: number) =>
      ipcRenderer.invoke("native:performanceTest", iterations),
    memoryTest: (size: number) => ipcRenderer.invoke("native:memoryTest", size),
    batchAdd: (operations: Array<{ a: number; b: number }>) =>
      ipcRenderer.invoke("native:batchAdd", operations),
    noop: () => ipcRenderer.invoke("native:noop"),
  },

  // 基准测试专用 - 纯性能对比
  benchmark: {
    // 纯开销测试
    noop: () => ipcRenderer.invoke("benchmark:noop"),
    echo: (text: string) => ipcRenderer.invoke("benchmark:echo", text),
    echoLarge: (text: string) =>
      ipcRenderer.invoke("benchmark:echoLarge", text),

    // 计算测试
    add: (a: number, b: number) => ipcRenderer.invoke("benchmark:add", a, b),
    multiply: (a: number, b: number) =>
      ipcRenderer.invoke("benchmark:multiply", a, b),
    fibonacci: (n: number) => ipcRenderer.invoke("benchmark:fibonacci", n),

    // 序列化测试
    processSimpleObject: (data: { name: string; age: number }) =>
      ipcRenderer.invoke("benchmark:processSimpleObject", data),
    processComplexObject: (data: any) =>
      ipcRenderer.invoke("benchmark:processComplexObject", data),
    processBuffer: (buffer: Uint8Array) =>
      ipcRenderer.invoke("benchmark:processBuffer", buffer),

    // 批量操作
    batchAdd: (operations: Array<{ a: number; b: number }>) =>
      ipcRenderer.invoke("benchmark:batchAdd", operations),
    batchProcess: (items: string[]) =>
      ipcRenderer.invoke("benchmark:batchProcess", items),

    // 错误处理
    throwError: (message: string) =>
      ipcRenderer.invoke("benchmark:throwError", message),
    maybeThrow: (shouldThrow: boolean, message: string) =>
      ipcRenderer.invoke("benchmark:maybeThrow", shouldThrow, message),

    // 内存测试
    createBuffer: (size: number) =>
      ipcRenderer.invoke("benchmark:createBuffer", size),
    processLargeArray: (size: number) =>
      ipcRenderer.invoke("benchmark:processLargeArray", size),

    // 并发测试
    concurrentTask: (taskId: number, duration: number) =>
      ipcRenderer.invoke("benchmark:concurrentTask", taskId, duration),

    // 性能分析
    getMemoryUsage: () => ipcRenderer.invoke("benchmark:getMemoryUsage"),
    getCpuUsage: () => ipcRenderer.invoke("benchmark:getCpuUsage"),
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
