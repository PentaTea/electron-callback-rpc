import { IIpcConnection, RpcClient } from "../shared/rpc";

export interface IpcContext {
  id: string | number;
}

const createContext = (id: string): IpcContext => {
  return { id };
};

export interface IpcRenderer {
  send: (channel: string, data?: any) => void;
  on: (
    channel: string,
    listener: (event: any, ...args: any[]) => void,
  ) => void;
  removeListener: (
    channel: string,
    listener: (event: any, ...args: any[]) => void,
  ) => void;
}

class IpcConnection implements IIpcConnection<IpcContext> {
  private remoteCtx: IpcContext;
  private currentHandler?: (event: any, ...args: any[]) => void;

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
    // 防御性清理：如果之前绑定过，先清理
    this.dispose();

    // 创建处理函数，剥离 event 对象
    this.currentHandler = (event: any, ...args: any[]) => {
      listener(...args);
    };

    // 绑定到 ipcRenderer
    this.ipcRenderer.on("rpc:message", this.currentHandler);
  }

  /**
   * 本地资源清理
   * 使用 removeListener 清理监听器
   */
  dispose(): void {
    if (this.currentHandler) {
      this.ipcRenderer.removeListener("rpc:message", this.currentHandler);
      this.currentHandler = undefined;
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
  private helloHandler?: (event: any, ...args: any[]) => void;

  constructor(private ipcRenderer: IpcRenderer) {
    super(new IpcConnection(ipcRenderer, "rpc.electron.main"));

    // 发送握手请求
    ipcRenderer.send("rpc:hello");

    // 创建 hello 处理函数
    this.helloHandler = () => {
      console.log(`Client get rpc:hello`);
      // 收到一次后立即清理
      this.cleanupHelloHandler();
    };

    // 绑定监听
    ipcRenderer.on("rpc:hello", this.helloHandler);
  }

  private cleanupHelloHandler(): void {
    if (this.helloHandler) {
      this.ipcRenderer.removeListener("rpc:hello", this.helloHandler);
      this.helloHandler = undefined;
    }
  }

  public disconnect() {
    // 清理 hello 监听器
    this.cleanupHelloHandler();
    // 断开连接
    this.connection.disconnect();
  }
}
