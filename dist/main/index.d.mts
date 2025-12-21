/// <reference lib="es2021.weakref" />
declare type EventCB = (...data: any) => void;
declare const RPC_PROXY_SYMBOL: unique symbol;
declare const enum RpcMessageType {
    Promise = 100,
    ObjectDeref = 110,
    PromiseSuccess = 201,
    PromiseError = 202,
    CallbackReq = 300,
    CallbackRes = 301,
    CallbackErr = 302
}
interface IMarshalledObject {
    __rpc_obj_id__: number;
    __rpc_methods__: string[];
    __rpc_is_func__: boolean;
    __rpc_data__: any;
    __rpc_ref_id__: number;
}
interface IMarshalledMap {
    __rpc_type__: 'Map';
    value: [any, any][];
    __rpc_ref_id__: number;
}
interface IMarshalledSet {
    __rpc_type__: 'Set';
    value: any[];
    __rpc_ref_id__: number;
}
interface IMarshalledDate {
    __rpc_type__: 'Date';
    value: string;
    __rpc_ref_id__: number;
}
interface IMarshalledBuffer {
    __rpc_type__: 'Buffer';
    value: Uint8Array;
    __rpc_ref_id__: number;
}
interface IMarshalledArrayBuffer {
    __rpc_type__: 'ArrayBuffer';
    value: ArrayBuffer;
    __rpc_ref_id__: number;
}
interface IMarshalledBigInt {
    __rpc_type__: 'BigInt';
    value: string;
}
interface IMarshalledError {
    __rpc_type__: 'Error';
    name: string;
    message: string;
    stack?: string;
}
interface IMarshalledRegExp {
    __rpc_type__: 'RegExp';
    source: string;
    flags: string;
    __rpc_ref_id__: number;
}
interface IMarshalledCircular {
    __rpc_type__: 'Circular';
    __rpc_ref_id__: number;
}
declare type AnyFunction = (...args: any[]) => any;
declare type Unpacked<T> = T extends Promise<infer U> ? U : T;
declare type Promisified<T> = T extends AnyFunction ? (...args: Parameters<T>) => Promise<Unpacked<ReturnType<T>>> : T extends object ? {
    [K in keyof T]: Promisified<T[K]>;
} : T;
declare function isPromise(obj: any): boolean;
declare class CallbackRegistry {
    private nextId;
    private objects;
    private ids;
    register(obj: any): number;
    get(id: number): any;
    has(id: number): boolean;
    release(id: number): void;
    releaseBatch(ids: number[]): void;
}
declare class RemoteProxyRegistry {
    private onDeref;
    private finalizationRegistry;
    private pendingIds;
    private batchTimeout;
    constructor(onDeref: (ids: number[]) => void);
    private scheduleSend;
    register(proxy: any, id: number): void;
}
declare class ArgumentTransformer {
    private registry;
    private remoteRegistry;
    private requestCallback;
    private static protoMethodCache;
    constructor(registry: CallbackRegistry, remoteRegistry: RemoteProxyRegistry, requestCallback: (id: number, method: string | undefined, args: any[]) => Promise<any>);
    serialize(data: any, visited?: Map<any, number>, depth?: number): any;
    private getMethodsFromPrototype;
    deserialize(data: any, refMap?: Map<number, any>): any;
}
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
interface IRpcService<TContext> {
    call<T>(ctx: TContext, method: string, args?: any): Promise<T>;
}
interface IRpcServer<TContext> {
    registerService(name: string, service: IRpcService<TContext>): void;
}
interface IIpcConnection<TContext> {
    remoteContext: () => TContext;
    send(...args: any[]): void;
    on(listener: (...args: any[]) => void): void;
    disconnect(): void;
}
declare function createRpcService<TContext>(service: unknown): IRpcService<TContext>;
declare class RpcServer<TContext> implements IRpcServer<TContext> {
    private ctx;
    private services;
    private connections;
    private activeRequests;
    private connectionTransformers;
    private connectionCallbackRegistries;
    private pendingCallbackRequests;
    constructor(ctx: TContext);
    protected addConnection(connection: IIpcConnection<TContext>): void;
    protected onDisconnect(connection: IIpcConnection<TContext>): void;
    registerService(name: string, service: IRpcService<TContext>): void;
    private getTransformer;
    private onRawMessage;
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
declare class Server extends RpcServer<IpcContext> {
    private connectionsMap;
    constructor(id?: string);
}

export { type AnyFunction, ArgumentTransformer, CallbackRegistry, type EventCB, type IIpcConnection, type IMarshalledArrayBuffer, type IMarshalledBigInt, type IMarshalledBuffer, type IMarshalledCircular, type IMarshalledDate, type IMarshalledError, type IMarshalledMap, type IMarshalledObject, type IMarshalledRegExp, type IMarshalledSet, type IRpcClient, type IRpcServer, type IRpcService, type IpcContext, type Promisified, ProxyHelper, RPC_PROXY_SYMBOL, RemoteProxyRegistry, RpcClient, RpcMessageType, RpcServer, Server, type Unpacked, createRpcService, isPromise };
