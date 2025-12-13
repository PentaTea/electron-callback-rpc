/* eslint-disable @typescript-eslint/no-explicit-any */
///<reference lib="es2021.weakref" />

export type EventCB = (...data: any) => void

export const RPC_PROXY_SYMBOL = Symbol.for('__rpc_proxy_meta__')

export const enum RpcMessageType {
  Promise = 100,
  EventListen = 102,
  EventUnlisten = 103,

  ObjectDeref = 110,

  PromiseSuccess = 201,
  PromiseError = 202,
  PromiseErrorObject = 203,
  EventFire = 204,

  CallbackReq = 300,
  CallbackRes = 301,
  CallbackErr = 302,
}

// --- Interfaces for Marshalling ---

export interface IMarshalledObject {
  __rpc_obj_id__: number
  __rpc_methods__: string[]
  __rpc_is_func__: boolean
  __rpc_data__: any
  __rpc_ref_id__: number
}

export interface IMarshalledMap {
  __rpc_type__: 'Map'
  value: [any, any][]
  __rpc_ref_id__: number
}

export interface IMarshalledSet {
  __rpc_type__: 'Set'
  value: any[]
  __rpc_ref_id__: number
}

export interface IMarshalledDate {
  __rpc_type__: 'Date'
  value: string
  __rpc_ref_id__: number
}

export interface IMarshalledBuffer {
  __rpc_type__: 'Buffer'
  value: Uint8Array
  __rpc_ref_id__: number
}

export interface IMarshalledArrayBuffer {
  __rpc_type__: 'ArrayBuffer'
  value: ArrayBuffer
  __rpc_ref_id__: number
}

export interface IMarshalledBigInt {
  __rpc_type__: 'BigInt'
  value: string
}

export interface IMarshalledError {
  __rpc_type__: 'Error'
  name: string
  message: string
  stack?: string
}

export interface IMarshalledRegExp {
  __rpc_type__: 'RegExp'
  source: string
  flags: string
  __rpc_ref_id__: number
}

export interface IMarshalledCircular {
  __rpc_type__: 'Circular'
  __rpc_ref_id__: number
}

// --- Type Helpers ---
export type AnyFunction = (...args: any[]) => any;
export type Unpacked<T> = T extends Promise<infer U> ? U : T;
export type Promisified<T> = T extends AnyFunction
  ? (...args: Parameters<T>) => Promise<Unpacked<ReturnType<T>>>
  : T extends object
  ? { [K in keyof T]: Promisified<T[K]> }
  : T;

export function isPromise(obj: any) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'
}

// --- Registry Classes ---

export class CallbackRegistry {
  private nextId = 0
  private objects = new Map<number, any>()
  private ids = new WeakMap<object, number>()

  public register(obj: any): number {
    if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) return 0;

    let id = this.ids.get(obj)
    if (id === undefined) {
      id = ++this.nextId
      this.objects.set(id, obj)
      this.ids.set(obj, id)
    }
    return id
  }

  public get(id: number) {
    return this.objects.get(id)
  }

  public has(id: number) {
    return this.objects.has(id)
  }

  public release(id: number) {
    const obj = this.objects.get(id)
    if (obj) {
      this.ids.delete(obj)
      this.objects.delete(id)
    }
  }

  public releaseBatch(ids: number[]) {
    for (const id of ids) {
      this.release(id)
    }
  }
}

export class RemoteProxyRegistry {
  private finalizationRegistry: FinalizationRegistry<number>;
  private pendingIds: number[] = [];
  private batchTimeout: any = null;

  constructor(private onDeref: (ids: number[]) => void) {
    this.finalizationRegistry = new FinalizationRegistry((id: number) => {
      this.pendingIds.push(id);
      this.scheduleSend();
    });
  }

  private scheduleSend() {
    if (this.batchTimeout) return;
    this.batchTimeout = setTimeout(() => {
      if (this.pendingIds.length > 0) {
        const batch = [...this.pendingIds];
        this.pendingIds = [];
        this.onDeref(batch);
      }
      this.batchTimeout = null;
    }, 50);
  }

  public register(proxy: any, id: number) {
    if (proxy && (typeof proxy === 'object' || typeof proxy === 'function')) {
      this.finalizationRegistry.register(proxy, id);
    }
  }
}

// --- Transformer (Fixed) ---

export class ArgumentTransformer {
  private static protoMethodCache = new WeakMap<object, string[]>();

  constructor(
    private registry: CallbackRegistry,
    private remoteRegistry: RemoteProxyRegistry,
    private requestCallback: (id: number, method: string | undefined, args: any[]) => Promise<any>
  ) { }

  public serialize(data: any, visited = new Map<any, number>(), depth = 0): any {
    if (depth > 200) return { __rpc_type__: 'Error', message: 'Serialization Depth Exceeded' };

    // 1. Null/Undefined Check
    if (data === null || data === undefined) return data;

    // 2. Proxy Symbol Check
    if (data[RPC_PROXY_SYMBOL]) return data[RPC_PROXY_SYMBOL];

    // 3. Primitive Types (Avoid adding to visited)
    const type = typeof data;
    if (type !== 'object' && type !== 'function') {
      if (typeof data === 'number') {
        if (Number.isNaN(data)) return { __rpc_type__: 'NaN' };
        if (!Number.isFinite(data)) return { __rpc_type__: 'Infinity', value: data > 0 ? 1 : -1 };
      }
      if (typeof data === 'bigint') return { __rpc_type__: 'BigInt', value: data.toString() };
      return data;
    }

    // 4. Circular Reference Check
    if (visited.has(data)) {
      return { __rpc_type__: 'Circular', __rpc_ref_id__: visited.get(data) } as IMarshalledCircular;
    }

    // 5. Register Reference ID
    const refId = visited.size + 1;
    visited.set(data, refId);

    // --- Special Object Types ---

    const rawType = Object.prototype.toString.call(data);

    // Buffer / Uint8Array
    const isBufferLike =
      data instanceof Uint8Array ||
      rawType === '[object Uint8Array]' ||
      (typeof Buffer !== 'undefined' && Buffer.isBuffer(data));

    if (isBufferLike) {
      return {
        __rpc_type__: 'Buffer',
        value: data,
        __rpc_ref_id__: refId
      } as IMarshalledBuffer;
    }

    // ArrayBuffer
    if (data instanceof ArrayBuffer || rawType === '[object ArrayBuffer]') {
      return {
        __rpc_type__: 'ArrayBuffer',
        value: data,
        __rpc_ref_id__: refId
      } as IMarshalledArrayBuffer;
    }

    // Date
    if (data instanceof Date || rawType === '[object Date]') {
      return {
        __rpc_type__: 'Date',
        value: data.toISOString(),
        __rpc_ref_id__: refId
      } as IMarshalledDate;
    }

    // Error
    if (data instanceof Error) {
      return {
        __rpc_type__: 'Error',
        name: data.name,
        message: data.message,
        stack: data.stack
      } as IMarshalledError;
    }

    // RegExp
    if (data instanceof RegExp || rawType === '[object RegExp]') {
      return {
        __rpc_type__: 'RegExp',
        source: data.source,
        flags: data.flags,
        __rpc_ref_id__: refId
      } as IMarshalledRegExp;
    }

    // Collections
    if (Array.isArray(data)) {
      return data.map(item => this.serialize(item, visited, depth + 1));
    }

    if (data instanceof Map) {
      return {
        __rpc_type__: 'Map',
        value: Array.from(data.entries()).map(([k, v]) => [
          this.serialize(k, visited, depth + 1),
          this.serialize(v, visited, depth + 1)
        ]),
        __rpc_ref_id__: refId
      } as IMarshalledMap;
    }

    if (data instanceof Set) {
      return {
        __rpc_type__: 'Set',
        value: Array.from(data).map(v => this.serialize(v, visited, depth + 1)),
        __rpc_ref_id__: refId
      } as IMarshalledSet;
    }

    // --- Object / Proxy Analysis (修复了双重序列化逻辑) ---

    const isTypedArray = ArrayBuffer.isView(data) && !isBufferLike && !(data instanceof DataView);
    const isFunc = typeof data === 'function';

    // 路径 A: 纯 Plain Object (非函数，非 TypedArray)
    // 优先处理以避免不必要的 prototype 分析
    if (!isFunc && !isTypedArray) {
      const proto = Object.getPrototypeOf(data);
      // 如果是普通对象字面量或 Object 实例
      if (!proto || proto === Object.prototype || data.constructor === Object) {
        const result: any = { __rpc_ref_id__: refId };
        try {
          for (const key of Object.keys(data)) {
            // 跳过原型链干扰
            if (key === '__proto__' || key === 'constructor') continue;
            const val = (data as any)[key];
            result[key] = this.serialize(val, visited, depth + 1);
          }
        } catch (e) { }
        return result;
      }
    }

    // 路径 B: TypedArray (Fallback)
    if (isTypedArray) {
      return {
        __rpc_type__: 'TypedArray',
        // @ts-ignore
        value: data,
        __rpc_ref_id__: refId
      };
    }

    // 路径 C: 需要代理的对象 (函数，或带有方法的类实例)
    let methods: string[] = [];
    const dataSnapshot: any = {};

    // 提取方法
    if (!isFunc) {
      if (data.constructor !== Object) {
        methods = [...this.getMethodsFromPrototype(data)];
      }
      try {
        for (const key of Object.keys(data)) {
          if (key === 'constructor') continue;
          const val = (data as any)[key];
          if (typeof val === 'function') {
            if (!methods.includes(key)) methods.push(key);
          } else {
            // 只有在确定要走 Proxy 逻辑时，才填充 dataSnapshot
            dataSnapshot[key] = this.serialize(val, visited, depth + 1);
          }
        }
      } catch (e) { }
    }

    // 判断是否符合代理条件
    if (isFunc || methods.length > 0) {
      const id = this.registry.register(data);
      return {
        __rpc_obj_id__: id,
        __rpc_methods__: methods,
        __rpc_is_func__: isFunc,
        __rpc_data__: dataSnapshot,
        __rpc_ref_id__: refId
      } as IMarshalledObject;
    }

    // 路径 D: 兜底 (理论上很少走到这里，除非是奇异对象)
    const result: any = { __rpc_ref_id__: refId };
    try {
      for (const key of Object.keys(data)) {
        if (key === '__proto__' || key === 'constructor') continue;
        const val = (data as any)[key];
        if (typeof val !== 'function') {
          result[key] = this.serialize(val, visited, depth + 1);
        }
      }
    } catch (e) { }

    return result;
  }

  private getMethodsFromPrototype(obj: any): string[] {
    if (!obj) return [];
    const proto = Object.getPrototypeOf(obj);
    if (!proto || proto === Object.prototype) return [];

    if (ArgumentTransformer.protoMethodCache.has(proto)) {
      return ArgumentTransformer.protoMethodCache.get(proto)!;
    }

    const methodSet = new Set<string>();
    let currentObj = obj;
    let protoDepth = 0;

    while (currentObj && currentObj !== Object.prototype && protoDepth < 10) {
      const keys = Reflect.ownKeys(currentObj);
      keys.forEach(key => {
        if (typeof key === 'string' && key !== 'constructor') {
          try {
            const desc = Object.getOwnPropertyDescriptor(currentObj, key);
            if (desc && typeof desc.value === 'function') {
              methodSet.add(key);
            }
          } catch (e) { }
        }
      });
      currentObj = Object.getPrototypeOf(currentObj);
      protoDepth++;
    }

    const result = Array.from(methodSet);
    ArgumentTransformer.protoMethodCache.set(proto, result);
    return result;
  }

  public deserialize(data: any, refMap = new Map<number, any>()): any {
    if (data === null || typeof data !== 'object') return data;

    // 1. Reference Check
    if (data.__rpc_ref_id__ !== undefined) {
      if (refMap.has(data.__rpc_ref_id__)) {
        return refMap.get(data.__rpc_ref_id__);
      }
    }

    // 2. Special Types Handling
    if (data.__rpc_type__) {
      switch (data.__rpc_type__) {
        case 'Circular':
          return refMap.get(data.__rpc_ref_id__) || null;
        case 'BigInt':
          return BigInt(data.value);
        case 'Date': {
          const d = new Date(data.value);
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, d);
          return d;
        }
        case 'Buffer': {
          let b = data.value;
          if (b === undefined || b === null) return new Uint8Array(0);
          if (typeof Buffer !== 'undefined' && !Buffer.isBuffer(b)) {
            try { b = Buffer.from(b); } catch (e) { }
          }
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, b);
          return b;
        }
        case 'ArrayBuffer': {
          const ab = data.value;
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, ab);
          return ab;
        }
        case 'TypedArray': {
          const val = data.value;
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, val);
          return val;
        }
        case 'RegExp': {
          const r = new RegExp(data.source, data.flags);
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, r);
          return r;
        }
        case 'NaN': return NaN;
        case 'Infinity': return data.value === 1 ? Infinity : -Infinity;
        case 'Error': {
          const e = new Error(data.message);
          e.name = data.name;
          e.stack = data.stack;
          return e;
        }
        case 'Map': {
          const map = new Map();
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, map);
          (data as IMarshalledMap).value.forEach(([k, v]) => {
            map.set(this.deserialize(k, refMap), this.deserialize(v, refMap));
          });
          return map;
        }
        case 'Set': {
          const set = new Set();
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, set);
          (data as IMarshalledSet).value.forEach((v: any) => {
            set.add(this.deserialize(v, refMap));
          });
          return set;
        }
      }
    }

    if (Array.isArray(data)) {
      // Note: Arrays don't currently have ref_id unless wrapped, 
      // but if the serialization changes to wrap arrays, logic would go here.
      // Current array serialization is structure-based.
      return data.map(item => this.deserialize(item, refMap));
    }

    // 3. Proxy Object Logic
    if (data.__rpc_obj_id__ !== undefined) {
      const id = data.__rpc_obj_id__
      const methods = (data.__rpc_methods__ || []) as string[]
      const isFunc = data.__rpc_is_func__
      const rawData = data.__rpc_data__ || {}

      const hydratedData: any = isFunc ? () => { } : {}
      if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, hydratedData);

      for (const k in rawData) {
        hydratedData[k] = this.deserialize(rawData[k], refMap)
      }

      const proxy = new Proxy(hydratedData, {
        get: (target, prop) => {
          if (prop === RPC_PROXY_SYMBOL) return data;
          if (typeof prop === 'string') {
            if (['then', 'catch', 'finally', 'toJSON', 'toString', 'valueOf', 'inspect', 'constructor', 'prototype', '__proto__'].includes(prop)) {
              return Reflect.get(target, prop);
            }
            if (methods.includes(prop)) {
              return (...args: any[]) => this.requestCallback(id, prop, args)
            }
          }
          return Reflect.get(target, prop)
        },
        apply: async (target, thisArg, argArray) => {
          if (isFunc) return this.requestCallback(id, undefined, argArray)
          return Reflect.apply(target, thisArg, argArray)
        }
      })
      this.remoteRegistry.register(proxy, id);
      return proxy;
    }

    // 4. Plain Object Logic
    const result: any = {}
    if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, result);

    for (const key of Object.keys(data)) {
      if (key !== '__rpc_ref_id__') {
        if (key === '__proto__' || key === 'constructor') continue;
        result[key] = this.deserialize(data[key], refMap)
      }
    }
    return result
  }
}

// --- Proxy Helper ---

export namespace ProxyHelper {
  export type AnyFunction<U extends any[], V> = (...args: U) => V
  export type Unpacked<T> = T extends Promise<infer U> ? U : T
  export type PromisifiedFunction<T> = T extends AnyFunction<infer U, infer V>
    ? (...args: U) => Promise<Unpacked<V>>
    : never

  type WithoutEvent<T> = Omit<T, 'on' | 'off' | 'once'>
  type WithonlyEvent<T> = Omit<T, keyof WithoutEvent<T>>

  export type Promisified<T> = {
    [K in keyof T]: T[K] extends AnyFunction<infer U, infer V> ? PromisifiedFunction<T[K]> : never
  }

  export type ProxyService<T> = Promisified<WithoutEvent<T>> & WithonlyEvent<T>

  export function asProxyService<T>(data: T) {
    return data as unknown as ProxyService<T>
  }

  export interface IProxyServiceOptions {
    properties?: Map<string, unknown>
  }

  export function createProxyService<T>(
    caller: IRpcClient,
    name: string,
    options?: IProxyServiceOptions
  ): ProxyService<T> {
    return new Proxy(
      {},
      {
        get(target, propKey) {
          if (typeof propKey === 'string') {
            if (options?.properties?.has(propKey)) {
              return options.properties.get(propKey)
            }
            if (propKey === 'then') return undefined
            if (propKey === 'on') {
              return (event: string, cb: () => void) => caller.listen(name, event, cb)
            }
            if (propKey === 'once') {
              return (event: string, cb: () => void) => caller.listen(name, event, cb, true)
            }
            if (propKey === 'off') {
              return (event: string, cb: () => void) => caller.unlisten(name, event, cb)
            }
            return (...args: any[]) => caller.call(name, propKey, args)
          }
        },
      }
    ) as ProxyService<T>
  }
}

// --- Interfaces (Client/Server) ---

export interface IEventEmiiter {
  on(event: string, cb: EventCB): any
  once(event: string, cb: EventCB): any
  off(event: string, cb: EventCB): any
  emit(event: string, ...data: any): any
  listenerCount(event: string): number
}

export interface IRpcClient {
  call<T>(service: string, method: string, args?: any): Promise<T>
  listen(service: string, event: string, cb: EventCB, once?: boolean): void
  unlisten(service: string, event: string, cb: EventCB): void
}

export interface IRpcService<TContext> {
  call<T>(ctx: TContext, method: string, args?: any): Promise<T>
  listen(ctx: TContext, event: string, cb: EventCB): void
  unlisten(ctx: TContext, event: string, cb: EventCB): void
}

export interface IRpcServer<TContext> {
  call<T>(ctx: TContext, service: string, method: string, args?: any): Promise<T>
  listen(ctx: TContext, service: string, event: string, cb: EventCB): void
  unlisten(ctx: TContext, service: string, event: string, cb: EventCB): void
  registerService(name: string, service: IRpcService<TContext>): void
}

export interface IIpcConnection<TContext> {
  remoteContext: () => TContext
  // 必须直接传递 args，不要 JSON.stringify，否则破坏 Electron 的序列化优化
  send(...args: any[]): void
  on(listener: (...args: any[]) => void): void
  disconnect(): void
}

interface IPromiseSuccessResult {
  data: any
  rpc?: {
    dynamicId: number
  }
}

// --- Dynamic Service Helper ---

class RpcServiceHelper<TContext> implements IRpcService<TContext> {
  constructor(private service: unknown) { }

  call<T>(_: TContext, method: string, args?: any): Promise<T> {
    const handler = this.service as { [key: string]: unknown }
    if (method === 'constructor' || method === 'hasOwnProperty' || method.startsWith('__')) {
      throw new Error(`Access denied for method: ${method}`);
    }
    const target = handler[method]
    if (typeof target === 'function') {
      return target.apply(handler, args)
    } else {
      throw new Error(`method not found: ${method}`)
    }
  }

  listen(_: TContext, event: string, cb: EventCB): void {
    this.call(_, 'on', [event, cb])
  }

  unlisten(_: TContext, event: string, cb: EventCB): void {
    this.call(_, 'off', [event, cb])
  }
}

export function createRpcService<TContext>(service: unknown): IRpcService<TContext> {
  return new RpcServiceHelper(service)
}

// --- RpcServer ---

export class RpcServer<TContext> implements IRpcServer<TContext> {
  private services = new Map<string, IRpcService<TContext>>()
  private connections = new Set<IIpcConnection<TContext>>()
  private activeRequests = new Map<IIpcConnection<TContext>, Set<number>>()
  private connectionTransformers = new Map<IIpcConnection<TContext>, ArgumentTransformer>()
  private connectionCallbackRegistries = new Map<IIpcConnection<TContext>, CallbackRegistry>()
  private pendingCallbackRequests = new Map<number, { resolve: Function, reject: Function }>()

  constructor(private ctx: TContext) { }

  protected addConnection(connection: IIpcConnection<TContext>) {
    this.connections.add(connection)
    this.activeRequests.set(connection, new Set())
    this.connectionCallbackRegistries.set(connection, new CallbackRegistry())

    const registry = this.connectionCallbackRegistries.get(connection)!
    const remoteRegistry = new RemoteProxyRegistry((ids) => {
      connection.send(RpcMessageType.ObjectDeref, 0, ids)
    })

    let callbackIdCounter = 0;

    const transformer = new ArgumentTransformer(
      registry,
      remoteRegistry,
      (cbId, cbMethod, cbArgs) => {
        const callId = ++callbackIdCounter;
        return new Promise((resolve, reject) => {
          this.pendingCallbackRequests.set(callId, { resolve, reject })
          const marshalledArgs = transformer.serialize(cbArgs)
          connection.send(RpcMessageType.CallbackReq, callId, cbId, cbMethod, marshalledArgs)
        })
      }
    )
    this.connectionTransformers.set(connection, transformer)

    connection.on((...arg: any[]) => {
      const [rpcType, id, ...args] = arg
      this.onRawMessage(connection, rpcType, id, args)
    })
  }

  protected onDisconnect(connection: IIpcConnection<TContext>) {
    this.connections.delete(connection)
    this.activeRequests.delete(connection)
    this.connectionTransformers.delete(connection)
    this.connectionCallbackRegistries.delete(connection)
  }

  public registerService(name: string, service: IRpcService<TContext>) {
    this.services.set(name, service)
  }

  private getTransformer(connection: IIpcConnection<TContext>) {
    return this.connectionTransformers.get(connection)!
  }

  private onRawMessage(connection: IIpcConnection<TContext>, rpcType: number, id: number, arg: any[]): void {
    const type = rpcType as RpcMessageType
    const transformer = this.getTransformer(connection)

    switch (type) {
      case RpcMessageType.Promise: {
        const [service, method, args] = arg
        this.activeRequests.get(connection)?.add(id)

        let promise: Promise<any>
        try {
          const hydratedArgs = transformer.deserialize(args)
          const handler = this.services.get(service)
          if (!handler) throw new Error(`service not found: ${service}`)

          let res = handler.call(connection.remoteContext(), method, hydratedArgs)
          if (!isPromise(res)) res = Promise.resolve(res)
          promise = res
        } catch (err) {
          promise = Promise.reject(err)
        }

        promise.then(
          (data) => {
            if (this.activeRequests.get(connection)?.has(id)) {
              try {
                const serializedData = transformer.serialize(data)
                connection.send(RpcMessageType.PromiseSuccess, id, { data: serializedData })
              } catch (e: any) {
                // 序列化失败时，尝试序列化错误本身
                const errPayload = transformer.serialize(new Error(`Serialization failed: ${e.message}`));
                connection.send(RpcMessageType.PromiseError, id, { data: errPayload })
              }
              this.activeRequests.get(connection)?.delete(id)
            }
          },
          (err) => {
            try {
              // 确保错误也被 ArgumentTransformer 序列化，保留堆栈信息
              const serializedError = transformer.serialize(err);
              connection.send(RpcMessageType.PromiseError, id, { data: serializedError });
            } catch (e: any) {
              connection.send(RpcMessageType.PromiseError, id, {
                data: { __rpc_type__: 'Error', message: 'Failed to serialize error: ' + String(err) }
              });
            }
            this.activeRequests.get(connection)?.delete(id)
          }
        )
        break
      }

      case RpcMessageType.ObjectDeref: {
        const [ids] = arg
        if (Array.isArray(ids)) {
          this.connectionCallbackRegistries.get(connection)?.releaseBatch(ids)
        } else {
          this.connectionCallbackRegistries.get(connection)?.release(ids)
        }
        break
      }

      case RpcMessageType.CallbackRes: {
        const [data] = arg
        const req = this.pendingCallbackRequests.get(id)
        if (req) {
          req.resolve(transformer.deserialize(data))
          this.pendingCallbackRequests.delete(id)
        }
        break
      }
      case RpcMessageType.CallbackErr: {
        const [data] = arg
        const req = this.pendingCallbackRequests.get(id)
        if (req) {
          req.reject(transformer.deserialize(data))
          this.pendingCallbackRequests.delete(id)
        }
        break
      }
    }
  }

  call<T>(ctx: TContext, service: string, method: string, args?: any): Promise<T> { throw new Error('Not impl'); }
  listen(ctx: TContext, service: string, event: string, cb: EventCB): void { throw new Error('Not impl'); }
  unlisten(ctx: TContext, service: string, event: string, cb: EventCB): void { throw new Error('Not impl'); }
}

// --- RpcClient ---

export class RpcClient<TContext> implements IRpcClient {
  private requestId = 0
  private handlers = new Map<number, (...args: any[]) => void>()
  private callbackRegistry = new CallbackRegistry()
  private argTransformer: ArgumentTransformer

  constructor(protected connection: IIpcConnection<TContext>, private _events: IEventEmiiter) {
    const remoteRegistry = new RemoteProxyRegistry((ids) => {
      this.connection.send(RpcMessageType.ObjectDeref, 0, ids)
    })

    this.argTransformer = new ArgumentTransformer(
      this.callbackRegistry,
      remoteRegistry,
      (id, method, args) => {
        return this.requestCallbackFromProxy(id, method, args);
      }
    )

    this.connection.on((...arg: any[]) => {
      const [rpcType, id, ...args] = arg
      this.onRawMessage(rpcType, id, ...args)
    })
  }

  private requestCallbackFromProxy(objId: number, method: string | undefined, args: any[]) {
    const callId = ++this.requestId
    return new Promise((resolve, reject) => {
      this.handlers.set(callId, (type, _, res) => {
        const hydrated = this.argTransformer.deserialize(res)
        if (type === RpcMessageType.CallbackRes) resolve(hydrated)
        else reject(hydrated)
      })
      const marshalledArgs = this.argTransformer.serialize(args)
      this.connection.send(RpcMessageType.CallbackReq, callId, objId, method, marshalledArgs)
    })
  }

  public call(service: string, method: string, arg?: any[]) {
    const marshalledArgs = this.argTransformer.serialize(arg)
    return this.requestPromise(service, method, marshalledArgs)
  }

  public listen(service: string, event: string, cb: EventCB, once?: boolean): void { }
  public unlisten(service: string, event: string, cb: EventCB): void { }

  private requestPromise(service: string, method: string, arg?: any[]): Promise<any> {
    const id = ++this.requestId

    // 发送前已经是序列化好的数据
    return new Promise((resolve, reject) => {
      this.connection.send(RpcMessageType.Promise, id, service, method, arg)

      this.handlers.set(id, (type, _, rawResponse) => {
        if (type === RpcMessageType.PromiseSuccess) {
          const { data } = rawResponse as IPromiseSuccessResult
          resolve(this.argTransformer.deserialize(data))
        } else if (type === RpcMessageType.PromiseError) {
          const { data } = rawResponse as IPromiseSuccessResult;
          // 反序列化错误对象以获取真实 Error 实例
          const error = this.argTransformer.deserialize(data);
          reject(error);
        } else {
          reject(rawResponse)
        }
      })
    })
  }

  private async onCallbackReq(reqId: number, objId: number, method: string | undefined, args: any[]) {
    const obj = this.callbackRegistry.get(objId)
    if (!obj) {
      this.connection.send(RpcMessageType.CallbackErr, reqId, { message: 'Callback object not found (GC?)' })
      return
    }

    try {
      const hydratedArgs = this.argTransformer.deserialize(args)
      let result: any
      if (method) {
        if (method === 'constructor' || method.startsWith('__')) {
          throw new Error('Access denied');
        }
        result = await obj[method].apply(obj, hydratedArgs)
      } else {
        result = await obj.apply(null, hydratedArgs)
      }
      const serializedResult = this.argTransformer.serialize(result)
      this.connection.send(RpcMessageType.CallbackRes, reqId, serializedResult)
    } catch (e: any) {
      // 序列化异常
      const errPayload = this.argTransformer.serialize(e);
      this.connection.send(RpcMessageType.CallbackErr, reqId, errPayload)
    }
  }

  private onRawMessage(rpcType: number, id: number | string, ...arg: any[]): void {
    const type = rpcType as RpcMessageType
    switch (type) {
      case RpcMessageType.PromiseSuccess:
      case RpcMessageType.PromiseError:
      case RpcMessageType.CallbackRes:
      case RpcMessageType.CallbackErr: {
        const [data] = arg
        const handler = this.handlers.get(id as number)
        if (handler) {
          handler(type, id as number, data)
          this.handlers.delete(id as number)
        }
        break
      }
      case RpcMessageType.CallbackReq: {
        const [objId, method, args] = arg
        this.onCallbackReq(id as number, objId, method, args)
        break
      }
      case RpcMessageType.ObjectDeref: {
        const [ids] = arg
        if (Array.isArray(ids)) {
          this.callbackRegistry.releaseBatch(ids)
        } else {
          this.callbackRegistry.release(ids)
        }
        break
      }
    }
  }
}