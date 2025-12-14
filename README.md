# electron-callback-rpc

> **⚠️ Pre-Release Notice**
> 
> 当前版本号 **< 1.0.0**，项目处于早期开发阶段。
> 本项目部分代码由 AI 辅助生成。虽然所有代码均已通过 **人工审查** 及 **单元测试 ** 验证，但仍可能存在未知的边缘情况或不稳定性。
> 在 v1.0.0 发布之前，API 可能会随时进行 **破坏性修改 (Breaking Changes)**，在生产环境中谨慎使用并锁定具体版本。

一个专为 **Electron (Main ↔ Renderer)** 构建的轻量级 RPC 通信库。

核心特性聚焦于：
1.  **Promise 服务调用**：Renderer 端以原生异步函数的方式调用 Main 端方法，体验如本地调用般流畅。
2.  **跨进程回调支持**：函数（Function）与带方法的对象可作为参数或返回值跨进程传递，实现真正的双向交互。
3.  **富类型语义保留**：支持 `Map`、`Set`、`Date`、`Error`、`BigInt`、`Buffer` 等原生类型，拒绝 IPC 通信中的“强制 JSON 化”导致的数据失真。

> **环境要求**：`electron >= 13.0.0`

---

## 📖 背景与动机

本项目 Fork 自 `@ggworks/electron-rpc`。原版库建立了优秀的 IPC 方法调用模型，但在实际复杂的业务场景中，我们需要更强的灵活性：

* **回调即一等公民**：不仅传输数据，更要传输能力。支持将回调函数传给主进程，以便报告进度或处理异步结果。
* **类型高保真**：Electron IPC 原生支持结构化克隆算法（Structured Clone），我们充分利用这一特性，避免不必要的序列化损耗和类型丢失。
* **生命周期可控**：针对跨进程引用，强调显式的资源释放（Dispose）机制，配合内部自动垃圾回收策略，最大程度降低内存泄漏风险。

### 与 `@ggworks/electron-rpc` 的核心差异

- **专注**：仅聚焦于 **Request/Response + Callback** 模型。
- **精简**：移除事件订阅模型（不提供 `on/once/off` 语义，建议使用业务级回调替代）。
- **增强**：强化跨进程对象/函数的传递能力与非标准 JSON 类型的支持。

-----

## 🧩 API 概览

### 主进程

```ts
const server = new Server() // 创建 RPC 服务端
const service = createRpcService(instance) // 包装对象 / 实例
server.registerService('namespace', service) // 注册服务
```

### 渲染进程

```ts
const client = new Client(ipcRenderer) // 创建客户端
const proxy = createProxyService(client, 'namespace') // 创建类型化代理

// 调用
proxy.methodName(args)
```

---

## 📦 安装

```bash
npm i electron-callback-rpc
```

-----

## 🚀 快速上手

### 1\. 定义类型接口 (Shared)

建议在共享文件中定义接口，以获得完整的 TypeScript 类型提示。

```ts
export interface IDemoService {
  echo(text: string): Promise<string>
  run(taskName: string, onProgress: (percent: number) => void): Promise<string>
}
```

### 2\. 主进程：实现并注册

```ts
import { Server, createRpcService } from 'electron-callback-rpc'

class DemoService implements IDemoService {
  async echo(text: string) {
    return text
  }

  async run(taskName: string, onProgress: (percent: number) => void) {
    onProgress(0)
    onProgress(50)
    onProgress(100)
    return `done:${taskName}`
  }
}

const server = new Server()
// 将实例包装为 RPC 服务并注册
server.registerService('demo', createRpcService(new DemoService()))
```

### 3\. 渲染进程：创建代理并调用

```ts
import { Client, createProxyService } from 'electron-callback-rpc'

// 初始化客户端 (需传入 ipcRenderer)
const client = new Client(window.ipcRenderer)
const demo = createProxyService<IDemoService>(client, 'demo')

// 场景 1: 普通异步调用
const echoed = await demo.echo('hello')
console.log(echoed)

// 场景 2: 带回调的调用
const result = await demo.run('build', (percent) => {
  console.log('Build progress:', percent)
})
console.log(result)
```

### ⚠️ TypeScript 配置注意事项

本库使用 exports 区分主进程（CJS）和渲染进程（ESM）。 如果你在渲染进程中遇到类型推导错误（例如 VSCode 指向了错误的 dist/main 路径），请确保你的 Renderer 端 tsconfig.json 配置了现代化的模块解析策略：

```json
// tsconfig.json (渲染进程)
{
  "compilerOptions": {
    // 适配 Vite/Webpack 等现代构建工具 (需 TS 5.0+)
    "moduleResolution": "bundler",
    // 显式指定浏览器环境，强制命中 exports 中的 "browser" 条件
    "customConditions": ["browser"] 
  }
}
```

-----

## 基准测试

我们对 `electron-callback-rpc` 与原生 Electron IPC 进行了全面的性能对比测试，涵盖吞吐量、延迟、序列化、错误处理和内存使用等多个维度。

本文档中只引用前两条测试数据，你可以运行 `example` 中的 `electron` 项目得到完整数据

### 测试环境

- **Platform**: arm64 Darwin 25.1.0 / Apple M4
- **Node.js**: v24.11.0
- **Electron**: v39.2.7

### 结果

<table>
  <tr>
    <td align="center">
      <img src="benchmark-throughput-comparison.png" alt="吞吐量对比" width="400"/>
      <br/>
      <strong>吞吐量对比</strong>
    </td>
    <td align="center">
      <img src="benchmark-latency-comparison.png" alt="延迟对比" width="400"/>
      <br/>
      <strong>延迟对比</strong>
    </td>
    <td align="center">
      <img src="benchmark-serialization-performance.png" alt="序列化性能" width="400"/>
      <br/>
      <strong>序列化性能</strong>
    </td>
    <td align="center">
      <img src="benchmark-error-handling.png" alt="错误处理性能" width="400"/>
      <br/>
      <strong>错误处理性能</strong>
    </td>
    <td align="center" colspan="2">
      <img src="benchmark-memory-usage.png" alt="内存使用测试" width="400"/>
      <br/>
      <strong>内存使用测试</strong>
    </td>
  </tr>
</table>

#### 🚀 吞吐量测试 (Operations/sec)

| 测试场景 | RPC Package | Native IPC | 性能比率 |
|---------|-------------|------------|----------|
| **批量添加** (15,000 ops) | 5,500 ops/sec | 8,081 ops/sec | 0.68x |
| **批量处理** (6,000 ops) | 15,476 ops/sec | 15,940 ops/sec | 0.97x |

- **平均延迟**: RPC 0.12ms vs Native 0.09ms (+33.3% 开销)
- **整体吞吐量**: RPC 在高频调用场景下保持了 87-97% 的原生性能

#### 📊 序列化性能测试

| 数据类型 | RPC Package | Native IPC | 性能比率 |
|---------|-------------|------------|----------|
| **简单对象** (5,000 ops) | 22,222 ops/sec | 19,747 ops/sec | 1.13x |
| **复杂对象** (2,500 ops) | 15,509 ops/sec | 17,643 ops/sec | 0.88x |

- **平均延迟**: RPC 0.10ms vs Native 0.09ms (+11.1% 开销)
- **序列化优势**: 在简单对象处理上，RPC 比原生 IPC 快 13%

#### ⚡ 延迟测试 (Round-trip time)

| 操作类型 | RPC Package | Native IPC | 延迟开销 |
|---------|-------------|------------|----------|
| **空操作** (5,000 ops) | 0.041ms | 0.046ms | 0.0% |
| **小数据回显** (5,000 ops) | 0.042ms | 0.042ms | 0.0% |

- **超低延迟**: 在轻量级操作中，RPC 与原生 IPC 延迟几乎相同
- **吞吐量**: 21,471 ops/sec vs 21,060 ops/sec (1.02x)

#### 🛡️ 错误处理性能

| 场景 | RPC Package | Native IPC | 性能比率 |
|------|-------------|------------|----------|
| **成功路径** (5,000 ops) | 22,036 ops/sec | 23,753 ops/sec | 0.93x |
| **错误路径** (5,000 ops) | 14,472 ops/sec | 11,593 ops/sec | 1.25x |

- **错误处理优势**: RPC 在错误处理场景下比原生 IPC 快 25%
- **平均延迟**: 两者基本相同 (0.06ms)

#### 💾 内存使用测试

| 测试场景 | RPC Package | Native IPC | 性能比率 |
|---------|-------------|------------|----------|
| **大数组处理** (30 ops) | 36 ops/sec | 38 ops/sec | 0.95x |
| **1MB 缓冲区** (60 ops) | 632 ops/sec | 628 ops/sec | 1.01x |

- **大数据处理**: 在处理大型数据结构时，性能损失控制在 5% 以内
- **内存效率**: 1MB 缓冲区操作中甚至略优于原生 IPC

### 核心结论

1.  **极低延迟**：在空操作和小数据回显场景下，本库的延迟与原生 IPC 几乎持平（\~0.04ms），绝对开销可忽略不计。
2.  **错误处理更优**：得益于优化的异常传播机制，错误路径处理性能比原生快 **25%**。
3.  **序列化表现**：简单对象传输比原生快 **13%**；复杂对象仅有约 12% 的性能损耗。
4.  **吞吐量**：在高频调用场景下，仍能保持原生 IPC **87%-97%** 的吞吐量。

**总结**：`electron-callback-rpc` 在提供强大的类型安全和回调能力的同时，不仅未引入显著的性能瓶颈，反而在部分场景（如错误处理、简单对象）下优于原生实现。

-----

## ⚠️ 最佳实践与注意事项

  * **进程模型**：本库专为 Electron 真实多进程环境设计。
  * **事件订阅**：不提供 `EventEmitter` 风格的 API。若需推送事件，请在业务接口中显式设计 `subscribe(callback)` 方法。
  * **资源管理**：虽然库内部包含垃圾回收机制，但对于长生命周期的回调或对象，建议在接口中显式提供 `dispose()` 或 `unsubscribe()` 方法以确保万无一失。

## License

MIT
