declare namespace ProxyHelper {
    type AnyFunction<U extends any[], V> = (...args: U) => V;
    type Unpacked<T> = T extends Promise<infer U> ? U : T;
    type PromisifiedFunction<T> = T extends AnyFunction<infer U, infer V> ? (...args: U) => Promise<Unpacked<V>> : never;
    type ProxyService<T> = {
        [K in keyof T]: T[K] extends AnyFunction<infer U, infer V> ? PromisifiedFunction<T[K]> : never;
    };
    function asProxyService<T>(data: T): ProxyService<T>;
    interface IProxyServiceOptions {
        properties?: Map<string, unknown>;
    }
    function createProxyService<T>(caller: IRpcClient, name: string, options?: IProxyServiceOptions): ProxyService<T>;
}
interface IRpcClient {
    call<T>(service: string, method: string, args?: any): Promise<T>;
}
interface IIpcConnection<TContext> {
    remoteContext: () => TContext;
    send(...args: any[]): void;
    on(listener: (...args: any[]) => void): void;
    disconnect(): void;
}
declare class RpcClient<TContext> implements IRpcClient {
    protected connection: IIpcConnection<TContext>;
    private requestId;
    private handlers;
    private callbackRegistry;
    private argTransformer;
    constructor(connection: IIpcConnection<TContext>);
    call(service: string, method: string, arg?: any[]): Promise<any>;
    private requestCallbackFromProxy;
    private requestPromise;
    private onCallbackReq;
    private onRawMessage;
}

interface IpcContext {
    id: string | number;
}
interface IpcRenderer {
    send: (channel: string, data?: any) => void;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
}
declare class Client extends RpcClient<IpcContext> {
    private ipcRenderer;
    private helloHandler?;
    constructor(ipcRenderer: IpcRenderer);
    private cleanupHelloHandler;
    disconnect(): void;
}

declare const asProxyService: typeof ProxyHelper.asProxyService;
declare const createProxyService: typeof ProxyHelper.createProxyService;

export { Client, type IpcContext, type IpcRenderer, asProxyService, createProxyService };
