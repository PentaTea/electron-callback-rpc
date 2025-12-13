# electron-callback-rpc

一个专为 **Electron（main ↔ renderer）** 做的轻量 RPC 库，核心只做两件事：

1) **服务调用**：renderer 端用 Promise 风格调用 main 端服务方法，写起来像本地调用。  
2) **跨进程回调**：函数（或带方法的对象）可以作为参数/返回值跨进程传递，并在对端被调用。

同时，它会尽量保留常见“非 JSON 类型”的语义（比如 `Map`、`Set`、`Date`、`RegExp`、`Error`、`BigInt`、`ArrayBuffer`/`Uint8Array`/`Buffer`、`NaN`/`Infinity` 等），避免 IPC 传输过程中被迫“全变字符串/全变普通对象”。

> 运行环境要求：`electron >= 13.0.0`

---

## 为什么会有这个库（fork 的原因）

这是从 `@ggworks/electron-rpc` fork 出来的。

原版已经把“基于 IPC 的 service/method 调用模型”搭得很好。但在我的项目里，更常见、更重要的是：

- **回调要当一等公民**：不仅传数据，还要能把函数/对象传过去，让对端在需要的时候回调，拿到返回值/错误。
- **类型别被 JSON 化**：Electron IPC 本身就支持结构化克隆，强行 JSON 化会丢类型、也会丢性能。
- **长时间运行更稳**：跨进程引用如果一直挂着，容易累积成泄漏风险；所以更强调引用生命周期的可控性（最佳实践是 API 里提供显式 `dispose()`，同时库内部也会尽力做自动释放）。

---

## 提供的 API

### main 进程
```ts
const server = new Server() // 创建 RPC 服务端，负责接收 renderer 的连接并分发调用。
let service = createRpcService(instance) // 把一个普通对象/类实例包装成 RPC 服务。
rpc.registerService(name, service) // 注册服务

```

### renderer 进程
```ts
// 创建 RPC 客户端, 需要传入 ipcRenderer 的实现。
const client = new Client(ipcRendererLike) 

// 创建一个带类型的服务代理，你可以直接调用
let service = createProxyService(client, serviceName)
service.call('123')
service.callback(res => console.log(res))

```

---

## 和 `@ggworks/electron-rpc` 的区别

- 只聚焦 **服务调用 + 回调**。
- **不提供事件订阅模型**（没有 `on/once/off` 这一套语义）。
- 更强调 **跨进程传函数/对象** 和 **常见类型的语义保留**。

---

## 安装

```bash
npm i electron-callback-rpc
```

---

## 使用方式

### 1. 定义接口

```ts
export interface IDemoService {
  echo(text: string): Promise<string>
  run(taskName: string, onProgress: (percent: number) => void): Promise<string>
}
```

### 2. main 进程：实现并注册服务

```ts
import { Server, createRpcService } from 'electron-callback-rpc/main'

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
server.registerService('demo', createRpcService(new DemoService()))
```

### 3) renderer 进程：创建 client 并调用

```ts
import { Client, createProxyService } from 'electron-callback-rpc/renderer'

const client = new Client(window.ipcRenderer)
const demo = createProxyService<IDemoService>(client, 'demo')

// 1) 普通调用
const echoed = await demo.echo('hello')
console.log(echoed)

// 2) 回调调用
const result = await demo.run('build', (percent) => {
  console.log('progress:', percent)
})
console.log(result)
```

---

## 一些说明

* 这个库是 **Electron 专用**，默认运行在真实 main/renderer 进程中。
* 本库不提供 `on/once/off` 事件订阅语义。如果你需要“推送式事件”，建议把它建模成显式 API（比如 `subscribe()` 返回 `unsubscribe()`），或者在业务层用 callback/流式模型来表达。
* 回调/远端对象的生命周期：如果你希望强约束资源释放，建议在你的服务接口中提供显式的 `dispose()` / `close()`，把释放做成业务协议的一部分。
