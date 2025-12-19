// src\renderer\electron.renderer.ts
import { IIpcConnection, RpcClient } from "../shared/rpc";

export interface IpcContext {
  id: string | number;
}

const createContext = (id: string): IpcContext => {
  return { id };
};

// 扩展接口，必须包含 removeListener 以便清理
export interface IpcRenderer {
  send: (channel: string, data?: any) => void;
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  removeListener: (channel: string, listener: (...args: any[]) => void) => void;
}

class IpcConnection implements IIpcConnection<IpcContext> {
  private remoteCtx: IpcContext;
  // 保存监听器引用，用于 removeListener
  private messageHandler?: (event: any, ...args: any[]) => void;

  constructor(private ipcRenderer: IpcRenderer, remoteId: string) {
    this.remoteCtx = createContext(remoteId);
  }

  remoteContext(): IpcContext {
    return this.remoteCtx;
  }

  send(...args: any[]): void {
    this.ipcRenderer.send("rpc:message", ...args);
  }

  on(listener: (...args: any[]) => void): void {
    // 防御性清理：如果之前绑定过，先移除
    this.dispose();

    // 创建新的 handler 包装器
    this.messageHandler = (event: any, ...args: any[]) => {
      // 这里的 event 是 Electron 的 event 对象，RPC 层不需要
      listener(...args);
    };

    // 绑定到 ipcRenderer
    this.ipcRenderer.on("rpc:message", this.messageHandler);
  }

  /**
   * [新增] 本地资源清理
   * 移除 ipcRenderer 上的监听器，防止 HMR 导致的重复监听
   */
  dispose(): void {
    if (this.messageHandler) {
      this.ipcRenderer.removeListener("rpc:message", this.messageHandler);
      this.messageHandler = undefined;
    }
  }

  disconnect(): void {
    // 1. 通知 Main 端断开
    try {
      this.ipcRenderer.send("rpc:disconnect");
    } catch (e) {
      // 忽略发送错误
    }

    // 2. 清理本地监听器
    this.dispose();
  }
}

export class Client extends RpcClient<IpcContext> {
  constructor(private ipcRenderer: IpcRenderer) {
    super(new IpcConnection(ipcRenderer, "rpc.electron.main"));

    // 发送握手请求
    ipcRenderer.send("rpc:hello");

    // 处理握手回执 (使用具名函数以便移除)
    const helloHandler = () => {
      console.log(`Client get rpc:hello`);
      // 收到一次后立即移除，保持干净
      ipcRenderer.removeListener("rpc:hello", helloHandler);
    };

    ipcRenderer.on("rpc:hello", helloHandler);
  }

  public disconnect() {
    this.connection.disconnect();
  }
}
