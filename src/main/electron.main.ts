// src\main\electron.main.ts
import { IIpcConnection, RpcServer } from '../shared/rpc'
import { ipcMain, IpcMainEvent, WebContents } from 'electron'

export interface IpcContext {
  id: string | number
}

const createContext = (id: number): IpcContext => {
  return { id }
}

class IpcConnection implements IIpcConnection<IpcContext> {
  private remoteCtx: IpcContext
  private listener?: (...args: any[]) => void
  // 保存绑定的函数引用，确保 off 能正确移除
  onRpcMessage: (event: IpcMainEvent, ...args: any[]) => void
  // 保存断开连接的 handler 引用
  private disconnectHandler?: (event: IpcMainEvent, ...args: any[]) => void
  private destroyedHandler?: () => void

  constructor(private sender: WebContents) {
    this.remoteCtx = createContext(sender.id)

    this.onRpcMessage = (event: IpcMainEvent, ...args: any[]) => {
      if (this.listener) {
        // 严格校验发送者 ID，避免跨 WebContents 干扰（虽然 ipcMain 是全局的）
        if (event.sender.id === this.remoteCtx.id) {
          this.listener(...args)
        }
      }
    }
  }

  remoteContext(): IpcContext {
    return this.remoteCtx
  }

  send(...args: any[]): void {
    // 发送前检查页面是否还存活
    if (!this.sender.isDestroyed()) {
      this.sender.send('rpc:message', ...args)
    }
  }

  on(listener: (...args: any[]) => void): void {
    this.listener = listener
    // 绑定全局监听
    ipcMain.on('rpc:message', this.onRpcMessage)
  }

  /**
   * [新增] 主动销毁资源
   * 必须显式调用 ipcMain.off，否则 Electron 主进程会一直持有引用导致泄漏，
   * 且旧的监听器会继续响应新的消息。
   */
  public dispose(): void {
    // 移除消息监听
    if (this.onRpcMessage) {
      ipcMain.off('rpc:message', this.onRpcMessage)
    }
    
    // 移除断开连接的监听 (如果已绑定)
    if (this.disconnectHandler) {
      ipcMain.off('rpc:disconnect', this.disconnectHandler)
      this.disconnectHandler = undefined
    }

    // 移除窗口销毁监听
    if (this.destroyedHandler && !this.sender.isDestroyed()) {
      this.sender.off('destroyed', this.destroyedHandler)
      this.destroyedHandler = undefined
    }

    this.listener = undefined
  }

  disconnect(): void {
    // 尝试通知 Renderer 端
    try {
      if (!this.sender.isDestroyed()) {
        this.sender.send('rpc:disconnect')
      }
    } catch (error) {
      // 忽略发送错误（如窗口已关闭）
    }
    // 清理本地资源
    this.dispose()
  }

  onDisconnect(cb: () => void): void {
    // 1. 监听来自 Renderer 的主动断开
    this.disconnectHandler = (event: IpcMainEvent) => {
      // console.log(`rpc:disconnect received`)
      if (event.sender.id === this.remoteCtx.id) {
        cleanup()
      }
    }

    // 2. 监听 WebContents 销毁（如直接关闭窗口/刷新页面）
    this.destroyedHandler = () => {
      cleanup()
    }

    const cleanup = () => {
      this.dispose() // 确保移除所有监听器
      cb()
    }

    ipcMain.on('rpc:disconnect', this.disconnectHandler)
    this.sender.on('destroyed', this.destroyedHandler)
  }
}

export class Server extends RpcServer<IpcContext> {
  // [新增] 维护 WebContents ID -> 连接实例的映射，用于去重
  private connectionsMap = new Map<number, IpcConnection>()

  constructor(id = 'rpc.electron.main') {
    super({ id })
    
    ipcMain.on('rpc:hello', (event: IpcMainEvent) => {
      const senderId = event.sender.id

      // [核心修复]：检查是否已经存在来自该 sender 的连接 (热更新或页面刷新场景)
      if (this.connectionsMap.has(senderId)) {
        // console.log(`[RpcServer] Reload detected for sender ${senderId}. Cleaning up old connection.`)
        const oldConnection = this.connectionsMap.get(senderId)!
        
        // 1. 强制清理旧连接的 ipcMain 监听器 (停止响应旧事件)
        oldConnection.dispose()
        
        // 2. 通知 RpcServer 父类移除该连接引用
        super.onDisconnect(oldConnection)
        
        this.connectionsMap.delete(senderId)
      }

      // 建立新连接
      const connection = new IpcConnection(event.sender)
      this.connectionsMap.set(senderId, connection)
      
      super.addConnection(connection)
      
      // 检查是否存活再发送回执
      if (!event.sender.isDestroyed()) {
        event.sender.send('rpc:hello')
      }

      connection.onDisconnect(() => {
        // 只有当 Map 中存储的还是当前连接对象时才删除
        // (防止极端竞态条件下删除了新建立的连接)
        if (this.connectionsMap.get(senderId) === connection) {
          this.connectionsMap.delete(senderId)
        }
        super.onDisconnect(connection)
      })
    })
  }
}