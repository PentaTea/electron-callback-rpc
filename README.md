# electron-callback-rpc

[中文](README_zh.md)

- A lightweight RPC library built for **Electron (Main ↔ Renderer)**, supporting `Cross-Process Callbacks` and `Complex Type Transmission`.

> **⚠️ Pre-Release Notice**
>
> Current version **\< 1.0.0**. The project is in the early stages of development.
> Portions of this code were generated with AI assistance. While all code has undergone **manual review** and validation via **unit tests**, unknown edge cases or instabilities may still exist.
> Prior to the v1.0.0 release, the API is subject to **Breaking Changes** at any time. Please use with caution in production environments and pin specific versions.

Core features focus on:

1.  **Promise-based Service Calls**: The Renderer calls Main process methods as native asynchronous functions, providing a seamless local-call experience.
2.  **Cross-process Callback Support**: Functions and objects with methods can be passed as arguments or return values across processes, enabling true bidirectional interaction.
3.  **Rich Type Preservation**: Supports native types like `Map`, `Set`, `Date`, `Error`, `BigInt`, and `Buffer`, avoiding data distortion caused by the "Forced JSONification" typical in IPC communication.

> **Requirement**: `electron >= 13.0.0`

-----

## 📖 Background & Motivation

This project is a fork of `@ggworks/electron-rpc`. While the original library established an excellent IPC method invocation model, complex real-world business scenarios often require greater flexibility:

  * **Callbacks as First-Class Citizens**: We need to transmit not just data, but *capabilities*. This includes passing callback functions to the main process to report progress or handle asynchronous results.
  * **High-Fidelity Types**: Electron IPC natively supports the Structured Clone algorithm. We fully leverage this to avoid unnecessary serialization overhead and type loss.
  * **Controllable Lifecycle**: For cross-process references, we emphasize an explicit resource release (`Dispose`) mechanism, complemented by an internal automatic garbage collection strategy to minimize the risk of memory leaks.

### Core Differences from `@ggworks/electron-rpc`

  - **Focused**: Exclusively focuses on the **Request/Response + Callback** model.
  - **Streamlined**: Removed the event subscription model (no `on/once/off` semantics; explicit business-level callbacks are recommended instead).
  - **Enhanced**: Strengthened the ability to pass cross-process objects/functions and improved support for non-standard JSON types.

-----

## 🧩 API Overview

### Main Process

```ts
const server = new Server() // Create RPC Server
const service = createRpcService(instance) // Wrap object / instance
server.registerService('namespace', service) // Register service
```

### Renderer Process

```ts
const client = new Client(ipcRenderer) // Create Client
const proxy = createProxyService(client, 'namespace') // Create typed proxy

// Invoke
proxy.methodName(args)
```

-----

## 📦 Installation

```bash
npm i electron-callback-rpc
```

-----

## 🚀 Quick Start

### 1\. Define Type Interface (Shared)

It is recommended to define interfaces in a shared file to enable full TypeScript type inference.

```ts
export interface IDemoService {
  echo(text: string): Promise<string>
  run(taskName: string, onProgress: (percent: number) => void): Promise<string>
}
```

### 2\. Main Process: Implement and Register

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
// Wrap the instance as an RPC service and register it
server.registerService('demo', createRpcService(new DemoService()))
```

### 3\. Renderer Process: Create Proxy and Call

```ts
import { Client, createProxyService } from 'electron-callback-rpc'

// Initialize client (requires ipcRenderer)
const client = new Client(window.ipcRenderer)
const demo = createProxyService<IDemoService>(client, 'demo')

// Scenario 1: Standard async call
const echoed = await demo.echo('hello')
console.log(echoed)

// Scenario 2: Call with callback
const result = await demo.run('build', (percent) => {
  console.log('Build progress:', percent)
})
console.log(result)
```

### ⚠️ TypeScript Configuration Note

This library uses `exports` to distinguish between the Main process (CJS) and the Renderer process (ESM). If you encounter type inference errors in the Renderer process (e.g., VSCode pointing to the wrong `dist/main` path), ensure your Renderer's `tsconfig.json` is configured with a modern module resolution strategy:

```jsonc
// tsconfig.json (Renderer Process)
{
  "compilerOptions": {
    // Adapt for modern bundlers like Vite/Webpack (requires TS 5.0+)
    "moduleResolution": "bundler",
    // Explicitly specify browser environment to force hitting the "browser" condition in exports
    "customConditions": ["browser"] 
  }
}
```

-----

## Benchmarks

We conducted comprehensive performance benchmarking of `electron-callback-rpc` against native Electron IPC, covering throughput, latency, serialization, error handling, and memory usage.

This document cites a subset of the data. You can run the `electron` project within the `example` directory to generate full results.

### Test Environment

  - **Platform**: arm64 Darwin 25.1.0 / Apple M4
  - **Node.js**: v24.11.0
  - **Electron**: v39.2.7

### Results

\<table\>
\<tr\>
\<td align="center"\>
\<img src="benchmark-throughput-comparison.png" alt="Throughput Comparison" width="400"/\>
<br>
\<strong\>Throughput Comparison\</strong\>
\</td\>
\<td align="center"\>
\<img src="benchmark-latency-comparison.png" alt="Latency Comparison" width="400"/\>
<br>
\<strong\>Latency Comparison\</strong\>
\</td\>
\<td align="center"\>
\<img src="benchmark-serialization-performance.png" alt="Serialization Performance" width="400"/\>
<br>
\<strong\>Serialization Performance\</strong\>
\</td\>
\<td align="center"\>
\<img src="benchmark-error-handling.png" alt="Error Handling Performance" width="400"/\>
<br>
\<strong\>Error Handling Performance\</strong\>
\</td\>
\<td align="center" colspan="2"\>
\<img src="benchmark-memory-usage.png" alt="Memory Usage" width="400"/\>
<br>
\<strong\>Memory Usage\</strong\>
\</td\>
\</tr\>
\</table\>

#### 🚀 Throughput (Operations/sec)

| Test Scenario | RPC Package | Native IPC | Performance Ratio |
|---------|-------------|------------|----------|
| **Batch Add** (15,000 ops) | 5,500 ops/sec | 8,081 ops/sec | 0.68x |
| **Batch Process** (6,000 ops) | 15,476 ops/sec | 15,940 ops/sec | 0.97x |

  - **Average Latency**: RPC 0.12ms vs Native 0.09ms (+33.3% overhead)
  - **Overall Throughput**: RPC maintains **87-97%** of native performance in high-frequency call scenarios.

#### 📊 Serialization Performance

| Data Type | RPC Package | Native IPC | Performance Ratio |
|---------|-------------|------------|----------|
| **Simple Object** (5,000 ops) | 22,222 ops/sec | 19,747 ops/sec | 1.13x |
| **Complex Object** (2,500 ops) | 15,509 ops/sec | 17,643 ops/sec | 0.88x |

  - **Average Latency**: RPC 0.10ms vs Native 0.09ms (+11.1% overhead)
  - **Serialization Advantage**: For simple object handling, RPC is **13% faster** than native IPC.

#### ⚡ Latency (Round-trip time)

| Operation Type | RPC Package | Native IPC | Latency Overhead |
|---------|-------------|------------|----------|
| **No-op** (5,000 ops) | 0.041ms | 0.046ms | 0.0% |
| **Small Data Echo** (5,000 ops) | 0.042ms | 0.042ms | 0.0% |

  - **Ultra-low Latency**: In lightweight operations, RPC latency is virtually identical to native IPC.
  - **Throughput**: 21,471 ops/sec vs 21,060 ops/sec (1.02x).

#### 🛡️ Error Handling Performance

| Scenario | RPC Package | Native IPC | Performance Ratio |
|------|-------------|------------|----------|
| **Success Path** (5,000 ops) | 22,036 ops/sec | 23,753 ops/sec | 0.93x |
| **Error Path** (5,000 ops) | 14,472 ops/sec | 11,593 ops/sec | 1.25x |

  - **Error Handling Advantage**: RPC is **25% faster** than native IPC in error scenarios due to optimized exception propagation.
  - **Average Latency**: Virtually identical for both (0.06ms).

#### 💾 Memory Usage

| Test Scenario | RPC Package | Native IPC | Performance Ratio |
|---------|-------------|------------|----------|
| **Large Array** (30 ops) | 36 ops/sec | 38 ops/sec | 0.95x |
| **1MB Buffer** (60 ops) | 632 ops/sec | 628 ops/sec | 1.01x |

  - **Large Data Processing**: Performance loss is controlled within 5% when handling large data structures.
  - **Memory Efficiency**: Slightly outperforms native IPC in 1MB buffer operations.

### Key Conclusions

1.  **Extremely Low Latency**: In no-op and small data echo scenarios, the library's latency is on par with native IPC (\~0.04ms), making the absolute overhead negligible.
2.  **Superior Error Handling**: Thanks to optimized exception propagation mechanisms, error path processing is **25%** faster than native.
3.  **Serialization Performance**: Simple object transmission is **13%** faster than native; complex objects show only \~12% performance loss.
4.  **Throughput**: In high-frequency call scenarios, it maintains **87%-97%** of native IPC throughput.

**Summary**: While providing powerful type safety and callback capabilities, `electron-callback-rpc` introduces no significant performance bottlenecks and even outperforms native implementation in specific scenarios (e.g., error handling, simple objects).

-----

## ⚠️ Best Practices

  * **Process Model**: This library is designed for the real multi-process Electron environment.
  * **Event Subscription**: We do not provide `EventEmitter` style APIs. If you need to push events, please explicitly design `subscribe(callback)` methods in your business interface.
  * **Resource Management**: Although the library includes an internal garbage collection mechanism, for long-lifecycle callbacks or objects, it is recommended to explicitly provide `dispose()` or `unsubscribe()` methods in your interface to ensure absolute safety.

## License

MIT