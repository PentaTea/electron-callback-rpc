"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main/index.ts
var index_exports = {};
__export(index_exports, {
  ArgumentTransformer: () => ArgumentTransformer,
  CallbackRegistry: () => CallbackRegistry,
  ProxyHelper: () => ProxyHelper,
  RPC_PROXY_SYMBOL: () => RPC_PROXY_SYMBOL,
  RemoteProxyRegistry: () => RemoteProxyRegistry,
  RpcClient: () => RpcClient,
  RpcMessageType: () => RpcMessageType,
  RpcServer: () => RpcServer,
  Server: () => Server,
  createRpcService: () => createRpcService,
  isPromise: () => isPromise
});
module.exports = __toCommonJS(index_exports);

// src/shared/rpc.ts
var RPC_PROXY_SYMBOL = /* @__PURE__ */ Symbol.for("__rpc_proxy_meta__");
var RpcMessageType = /* @__PURE__ */ ((RpcMessageType2) => {
  RpcMessageType2[RpcMessageType2["Promise"] = 100] = "Promise";
  RpcMessageType2[RpcMessageType2["ObjectDeref"] = 110] = "ObjectDeref";
  RpcMessageType2[RpcMessageType2["PromiseSuccess"] = 201] = "PromiseSuccess";
  RpcMessageType2[RpcMessageType2["PromiseError"] = 202] = "PromiseError";
  RpcMessageType2[RpcMessageType2["CallbackReq"] = 300] = "CallbackReq";
  RpcMessageType2[RpcMessageType2["CallbackRes"] = 301] = "CallbackRes";
  RpcMessageType2[RpcMessageType2["CallbackErr"] = 302] = "CallbackErr";
  return RpcMessageType2;
})(RpcMessageType || {});
function isPromise(obj) {
  return !!obj && (typeof obj === "object" || typeof obj === "function") && typeof obj.then === "function";
}
var CallbackRegistry = class {
  constructor() {
    this.nextId = 0;
    this.objects = /* @__PURE__ */ new Map();
    this.ids = /* @__PURE__ */ new WeakMap();
  }
  register(obj) {
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") return 0;
    let id = this.ids.get(obj);
    if (id === void 0) {
      id = ++this.nextId;
      this.objects.set(id, obj);
      this.ids.set(obj, id);
    }
    return id;
  }
  get(id) {
    return this.objects.get(id);
  }
  has(id) {
    return this.objects.has(id);
  }
  release(id) {
    const obj = this.objects.get(id);
    if (obj) {
      this.ids.delete(obj);
      this.objects.delete(id);
    }
  }
  releaseBatch(ids) {
    for (const id of ids) {
      this.release(id);
    }
  }
};
var RemoteProxyRegistry = class {
  constructor(onDeref) {
    this.onDeref = onDeref;
    this.pendingIds = [];
    this.batchTimeout = null;
    this.finalizationRegistry = new FinalizationRegistry((id) => {
      this.pendingIds.push(id);
      this.scheduleSend();
    });
  }
  scheduleSend() {
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
  register(proxy, id) {
    if (proxy && (typeof proxy === "object" || typeof proxy === "function")) {
      this.finalizationRegistry.register(proxy, id);
    }
  }
};
var _ArgumentTransformer = class _ArgumentTransformer {
  constructor(registry, remoteRegistry, requestCallback) {
    this.registry = registry;
    this.remoteRegistry = remoteRegistry;
    this.requestCallback = requestCallback;
  }
  serialize(data, visited = /* @__PURE__ */ new Map(), depth = 0) {
    if (depth > 200) return { __rpc_type__: "Error", message: "Serialization Depth Exceeded" };
    if (data === null || data === void 0) return data;
    if (data[RPC_PROXY_SYMBOL]) return data[RPC_PROXY_SYMBOL];
    const type = typeof data;
    if (type !== "object" && type !== "function") {
      if (typeof data === "number") {
        if (Number.isNaN(data)) return { __rpc_type__: "NaN" };
        if (!Number.isFinite(data)) return { __rpc_type__: "Infinity", value: data > 0 ? 1 : -1 };
      }
      if (typeof data === "bigint") return { __rpc_type__: "BigInt", value: data.toString() };
      return data;
    }
    if (visited.has(data)) {
      return { __rpc_type__: "Circular", __rpc_ref_id__: visited.get(data) };
    }
    const refId = visited.size + 1;
    visited.set(data, refId);
    const rawType = Object.prototype.toString.call(data);
    const isBufferLike = data instanceof Uint8Array || rawType === "[object Uint8Array]" || typeof Buffer !== "undefined" && Buffer.isBuffer(data);
    if (isBufferLike) {
      return {
        __rpc_type__: "Buffer",
        value: data,
        __rpc_ref_id__: refId
      };
    }
    if (data instanceof ArrayBuffer || rawType === "[object ArrayBuffer]") {
      return {
        __rpc_type__: "ArrayBuffer",
        value: data,
        __rpc_ref_id__: refId
      };
    }
    if (data instanceof Date || rawType === "[object Date]") {
      return {
        __rpc_type__: "Date",
        value: data.toISOString(),
        __rpc_ref_id__: refId
      };
    }
    if (data instanceof Error) {
      return {
        __rpc_type__: "Error",
        name: data.name,
        message: data.message,
        stack: data.stack
      };
    }
    if (data instanceof RegExp || rawType === "[object RegExp]") {
      return {
        __rpc_type__: "RegExp",
        source: data.source,
        flags: data.flags,
        __rpc_ref_id__: refId
      };
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.serialize(item, visited, depth + 1));
    }
    if (data instanceof Map) {
      return {
        __rpc_type__: "Map",
        value: Array.from(data.entries()).map(([key, value]) => [
          this.serialize(key, visited, depth + 1),
          this.serialize(value, visited, depth + 1)
        ]),
        __rpc_ref_id__: refId
      };
    }
    if (data instanceof Set) {
      return {
        __rpc_type__: "Set",
        value: Array.from(data).map((value) => this.serialize(value, visited, depth + 1)),
        __rpc_ref_id__: refId
      };
    }
    const isTypedArray = ArrayBuffer.isView(data) && !isBufferLike && !(data instanceof DataView);
    const isFunc = typeof data === "function";
    if (!isFunc && !isTypedArray) {
      const proto = Object.getPrototypeOf(data);
      if (!proto || proto === Object.prototype || data.constructor === Object) {
        const result2 = { __rpc_ref_id__: refId };
        try {
          for (const key of Object.keys(data)) {
            if (key === "__proto__" || key === "constructor") continue;
            result2[key] = this.serialize(data[key], visited, depth + 1);
          }
        } catch {
        }
        return result2;
      }
    }
    if (isTypedArray) {
      return {
        __rpc_type__: "TypedArray",
        // @ts-ignore
        value: data,
        __rpc_ref_id__: refId
      };
    }
    let methods = [];
    const dataSnapshot = {};
    if (!isFunc) {
      if (data.constructor !== Object) {
        methods = [...this.getMethodsFromPrototype(data)];
      }
      try {
        for (const key of Object.keys(data)) {
          if (key === "constructor") continue;
          const value = data[key];
          if (typeof value === "function") {
            if (!methods.includes(key)) methods.push(key);
          } else {
            dataSnapshot[key] = this.serialize(value, visited, depth + 1);
          }
        }
      } catch {
      }
    }
    if (isFunc || methods.length > 0) {
      const id = this.registry.register(data);
      return {
        __rpc_obj_id__: id,
        __rpc_methods__: methods,
        __rpc_is_func__: isFunc,
        __rpc_data__: dataSnapshot,
        __rpc_ref_id__: refId
      };
    }
    const result = { __rpc_ref_id__: refId };
    try {
      for (const key of Object.keys(data)) {
        if (key === "__proto__" || key === "constructor") continue;
        const value = data[key];
        if (typeof value !== "function") {
          result[key] = this.serialize(value, visited, depth + 1);
        }
      }
    } catch {
    }
    return result;
  }
  getMethodsFromPrototype(obj) {
    if (!obj) return [];
    const proto = Object.getPrototypeOf(obj);
    if (!proto || proto === Object.prototype) return [];
    if (_ArgumentTransformer.protoMethodCache.has(proto)) {
      return _ArgumentTransformer.protoMethodCache.get(proto);
    }
    const methodSet = /* @__PURE__ */ new Set();
    let currentObj = obj;
    let protoDepth = 0;
    while (currentObj && currentObj !== Object.prototype && protoDepth < 10) {
      const keys = Reflect.ownKeys(currentObj);
      for (const key of keys) {
        if (typeof key !== "string" || key === "constructor") continue;
        try {
          const desc = Object.getOwnPropertyDescriptor(currentObj, key);
          if (desc && typeof desc.value === "function") {
            methodSet.add(key);
          }
        } catch {
        }
      }
      currentObj = Object.getPrototypeOf(currentObj);
      protoDepth++;
    }
    const result = Array.from(methodSet);
    _ArgumentTransformer.protoMethodCache.set(proto, result);
    return result;
  }
  deserialize(data, refMap = /* @__PURE__ */ new Map()) {
    if (data === null || typeof data !== "object") return data;
    if (data.__rpc_ref_id__ !== void 0 && refMap.has(data.__rpc_ref_id__)) {
      return refMap.get(data.__rpc_ref_id__);
    }
    if (data.__rpc_type__) {
      switch (data.__rpc_type__) {
        case "Circular":
          return refMap.get(data.__rpc_ref_id__) || null;
        case "BigInt":
          return BigInt(data.value);
        case "Date": {
          const date = new Date(data.value);
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, date);
          return date;
        }
        case "Buffer": {
          let bufferLike = data.value;
          if (bufferLike === void 0 || bufferLike === null) return new Uint8Array(0);
          if (typeof Buffer !== "undefined" && !Buffer.isBuffer(bufferLike)) {
            try {
              bufferLike = Buffer.from(bufferLike);
            } catch {
            }
          }
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, bufferLike);
          return bufferLike;
        }
        case "ArrayBuffer": {
          const arrayBuffer = data.value;
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, arrayBuffer);
          return arrayBuffer;
        }
        case "TypedArray": {
          const typedArray = data.value;
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, typedArray);
          return typedArray;
        }
        case "RegExp": {
          const regExp = new RegExp(data.source, data.flags);
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, regExp);
          return regExp;
        }
        case "NaN":
          return NaN;
        case "Infinity":
          return data.value === 1 ? Infinity : -Infinity;
        case "Error": {
          const error = new Error(data.message);
          error.name = data.name;
          error.stack = data.stack;
          return error;
        }
        case "Map": {
          const map = /* @__PURE__ */ new Map();
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, map);
          data.value.forEach(([key, value]) => {
            map.set(this.deserialize(key, refMap), this.deserialize(value, refMap));
          });
          return map;
        }
        case "Set": {
          const set = /* @__PURE__ */ new Set();
          if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, set);
          data.value.forEach((value) => {
            set.add(this.deserialize(value, refMap));
          });
          return set;
        }
      }
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.deserialize(item, refMap));
    }
    if (data.__rpc_obj_id__ !== void 0) {
      const id = data.__rpc_obj_id__;
      const methods = data.__rpc_methods__ || [];
      const isFunc = data.__rpc_is_func__;
      const rawData = data.__rpc_data__ || {};
      const hydratedData = isFunc ? () => {
      } : {};
      if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, hydratedData);
      for (const key in rawData) {
        hydratedData[key] = this.deserialize(rawData[key], refMap);
      }
      const proxy = new Proxy(hydratedData, {
        get: (target, prop) => {
          if (prop === RPC_PROXY_SYMBOL) return data;
          if (typeof prop === "string") {
            if ([
              "then",
              "catch",
              "finally",
              "toJSON",
              "toString",
              "valueOf",
              "inspect",
              "constructor",
              "prototype",
              "__proto__"
            ].includes(prop)) {
              return Reflect.get(target, prop);
            }
            if (methods.includes(prop)) {
              return (...args) => this.requestCallback(id, prop, args);
            }
          }
          return Reflect.get(target, prop);
        },
        apply: async (target, thisArg, argArray) => {
          if (isFunc) return this.requestCallback(id, void 0, argArray);
          return Reflect.apply(target, thisArg, argArray);
        }
      });
      this.remoteRegistry.register(proxy, id);
      return proxy;
    }
    const result = {};
    if (data.__rpc_ref_id__) refMap.set(data.__rpc_ref_id__, result);
    for (const key of Object.keys(data)) {
      if (key === "__rpc_ref_id__") continue;
      if (key === "__proto__" || key === "constructor") continue;
      result[key] = this.deserialize(data[key], refMap);
    }
    return result;
  }
};
_ArgumentTransformer.protoMethodCache = /* @__PURE__ */ new WeakMap();
var ArgumentTransformer = _ArgumentTransformer;
var ProxyHelper;
((ProxyHelper2) => {
  function asProxyService(data) {
    return data;
  }
  ProxyHelper2.asProxyService = asProxyService;
  function createProxyService(caller, name, options) {
    return new Proxy(
      {},
      {
        get(_target, propKey) {
          var _a;
          if (typeof propKey !== "string") return void 0;
          if ((_a = options == null ? void 0 : options.properties) == null ? void 0 : _a.has(propKey)) {
            return options.properties.get(propKey);
          }
          if (propKey === "then") return void 0;
          return (...args) => caller.call(name, propKey, args);
        }
      }
    );
  }
  ProxyHelper2.createProxyService = createProxyService;
})(ProxyHelper || (ProxyHelper = {}));
var RpcServiceHelper = class {
  constructor(service) {
    this.service = service;
  }
  call(_, method, args) {
    const handler = this.service;
    if (method === "constructor" || method === "hasOwnProperty" || method.startsWith("__")) {
      throw new Error(`Access denied for method: ${method}`);
    }
    const target = handler[method];
    if (typeof target === "function") {
      return target.apply(handler, args);
    }
    throw new Error(`method not found: ${method}`);
  }
};
function createRpcService(service) {
  return new RpcServiceHelper(service);
}
var RpcServer = class {
  constructor(ctx) {
    this.ctx = ctx;
    this.services = /* @__PURE__ */ new Map();
    this.connections = /* @__PURE__ */ new Set();
    this.activeRequests = /* @__PURE__ */ new Map();
    this.connectionTransformers = /* @__PURE__ */ new Map();
    this.connectionCallbackRegistries = /* @__PURE__ */ new Map();
    this.pendingCallbackRequests = /* @__PURE__ */ new Map();
  }
  addConnection(connection) {
    this.connections.add(connection);
    this.activeRequests.set(connection, /* @__PURE__ */ new Set());
    this.connectionCallbackRegistries.set(connection, new CallbackRegistry());
    const registry = this.connectionCallbackRegistries.get(connection);
    const remoteRegistry = new RemoteProxyRegistry((ids) => {
      connection.send(110 /* ObjectDeref */, 0, ids);
    });
    let callbackIdCounter = 0;
    const transformer = new ArgumentTransformer(registry, remoteRegistry, (cbId, cbMethod, cbArgs) => {
      const callId = ++callbackIdCounter;
      return new Promise((resolve, reject) => {
        this.pendingCallbackRequests.set(callId, { resolve, reject });
        const marshalledArgs = transformer.serialize(cbArgs);
        connection.send(300 /* CallbackReq */, callId, cbId, cbMethod, marshalledArgs);
      });
    });
    this.connectionTransformers.set(connection, transformer);
    connection.on((...arg) => {
      const [rpcType, id, ...args] = arg;
      this.onRawMessage(connection, rpcType, id, args);
    });
  }
  onDisconnect(connection) {
    this.connections.delete(connection);
    this.activeRequests.delete(connection);
    this.connectionTransformers.delete(connection);
    this.connectionCallbackRegistries.delete(connection);
  }
  registerService(name, service) {
    this.services.set(name, service);
  }
  getTransformer(connection) {
    return this.connectionTransformers.get(connection);
  }
  onRawMessage(connection, rpcType, id, arg) {
    var _a, _b, _c;
    const type = rpcType;
    const transformer = this.getTransformer(connection);
    switch (type) {
      case 100 /* Promise */: {
        const [service, method, args] = arg;
        (_a = this.activeRequests.get(connection)) == null ? void 0 : _a.add(id);
        let promise;
        try {
          const hydratedArgs = transformer.deserialize(args);
          const handler = this.services.get(service);
          if (!handler) throw new Error(`service not found: ${service}`);
          let res = handler.call(connection.remoteContext(), method, hydratedArgs);
          if (!isPromise(res)) res = Promise.resolve(res);
          promise = res;
        } catch (err) {
          promise = Promise.reject(err);
        }
        promise.then(
          (data) => {
            var _a2, _b2;
            if ((_a2 = this.activeRequests.get(connection)) == null ? void 0 : _a2.has(id)) {
              try {
                const serializedData = transformer.serialize(data);
                connection.send(201 /* PromiseSuccess */, id, { data: serializedData });
              } catch (e) {
                const errPayload = transformer.serialize(new Error(`Serialization failed: ${e.message}`));
                connection.send(202 /* PromiseError */, id, { data: errPayload });
              }
              (_b2 = this.activeRequests.get(connection)) == null ? void 0 : _b2.delete(id);
            }
          },
          (err) => {
            var _a2;
            try {
              const serializedError = transformer.serialize(err);
              connection.send(202 /* PromiseError */, id, { data: serializedError });
            } catch {
              connection.send(202 /* PromiseError */, id, {
                data: { __rpc_type__: "Error", message: "Failed to serialize error: " + String(err) }
              });
            }
            (_a2 = this.activeRequests.get(connection)) == null ? void 0 : _a2.delete(id);
          }
        );
        break;
      }
      case 110 /* ObjectDeref */: {
        const [ids] = arg;
        if (Array.isArray(ids)) {
          (_b = this.connectionCallbackRegistries.get(connection)) == null ? void 0 : _b.releaseBatch(ids);
        } else {
          (_c = this.connectionCallbackRegistries.get(connection)) == null ? void 0 : _c.release(ids);
        }
        break;
      }
      case 301 /* CallbackRes */: {
        const [data] = arg;
        const req = this.pendingCallbackRequests.get(id);
        if (req) {
          req.resolve(transformer.deserialize(data));
          this.pendingCallbackRequests.delete(id);
        }
        break;
      }
      case 302 /* CallbackErr */: {
        const [data] = arg;
        const req = this.pendingCallbackRequests.get(id);
        if (req) {
          req.reject(transformer.deserialize(data));
          this.pendingCallbackRequests.delete(id);
        }
        break;
      }
    }
  }
};
var RpcClient = class {
  constructor(connection) {
    this.connection = connection;
    this.requestId = 0;
    this.handlers = /* @__PURE__ */ new Map();
    this.callbackRegistry = new CallbackRegistry();
    const remoteRegistry = new RemoteProxyRegistry((ids) => {
      this.connection.send(110 /* ObjectDeref */, 0, ids);
    });
    this.argTransformer = new ArgumentTransformer(this.callbackRegistry, remoteRegistry, (id, method, args) => {
      return this.requestCallbackFromProxy(id, method, args);
    });
    this.connection.on((...arg) => {
      const [rpcType, id, ...args] = arg;
      this.onRawMessage(rpcType, id, ...args);
    });
  }
  call(service, method, arg) {
    const marshalledArgs = this.argTransformer.serialize(arg);
    return this.requestPromise(service, method, marshalledArgs);
  }
  requestCallbackFromProxy(objId, method, args) {
    const callId = ++this.requestId;
    return new Promise((resolve, reject) => {
      this.handlers.set(callId, (type, _, res) => {
        const hydrated = this.argTransformer.deserialize(res);
        if (type === 301 /* CallbackRes */) resolve(hydrated);
        else reject(hydrated);
      });
      const marshalledArgs = this.argTransformer.serialize(args);
      this.connection.send(300 /* CallbackReq */, callId, objId, method, marshalledArgs);
    });
  }
  requestPromise(service, method, arg) {
    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      this.connection.send(100 /* Promise */, id, service, method, arg);
      this.handlers.set(id, (type, _, rawResponse) => {
        if (type === 201 /* PromiseSuccess */) {
          const { data } = rawResponse;
          resolve(this.argTransformer.deserialize(data));
          return;
        }
        if (type === 202 /* PromiseError */) {
          const { data } = rawResponse;
          reject(this.argTransformer.deserialize(data));
          return;
        }
        reject(rawResponse);
      });
    });
  }
  async onCallbackReq(reqId, objId, method, args) {
    const obj = this.callbackRegistry.get(objId);
    if (!obj) {
      this.connection.send(302 /* CallbackErr */, reqId, { message: "Callback object not found (GC?)" });
      return;
    }
    try {
      const hydratedArgs = this.argTransformer.deserialize(args);
      let result;
      if (method) {
        if (method === "constructor" || method.startsWith("__")) {
          throw new Error("Access denied");
        }
        result = await obj[method].apply(obj, hydratedArgs);
      } else {
        result = await obj.apply(null, hydratedArgs);
      }
      const serializedResult = this.argTransformer.serialize(result);
      this.connection.send(301 /* CallbackRes */, reqId, serializedResult);
    } catch (e) {
      const errPayload = this.argTransformer.serialize(e);
      this.connection.send(302 /* CallbackErr */, reqId, errPayload);
    }
  }
  onRawMessage(rpcType, id, ...arg) {
    const type = rpcType;
    switch (type) {
      case 201 /* PromiseSuccess */:
      case 202 /* PromiseError */:
      case 301 /* CallbackRes */:
      case 302 /* CallbackErr */: {
        const [data] = arg;
        const handler = this.handlers.get(id);
        if (handler) {
          handler(type, id, data);
          this.handlers.delete(id);
        }
        break;
      }
      case 300 /* CallbackReq */: {
        const [objId, method, args] = arg;
        this.onCallbackReq(id, objId, method, args);
        break;
      }
      case 110 /* ObjectDeref */: {
        const [ids] = arg;
        if (Array.isArray(ids)) {
          this.callbackRegistry.releaseBatch(ids);
        } else {
          this.callbackRegistry.release(ids);
        }
        break;
      }
    }
  }
};

// src/main/electron.main.ts
var import_electron = require("electron");
var createContext = (id) => {
  return { id };
};
var IpcConnection = class {
  constructor(sender) {
    this.sender = sender;
    this.remoteCtx = createContext(sender.id);
    this.onRpcMessage = (event, ...args) => {
      if (this.listener) {
        if (event.sender.id === this.remoteCtx.id) {
          this.listener(...args);
        }
      }
    };
  }
  remoteContext() {
    return this.remoteCtx;
  }
  send(...args) {
    if (!this.sender.isDestroyed()) {
      this.sender.send("rpc:message", ...args);
    }
  }
  on(listener) {
    this.listener = listener;
    import_electron.ipcMain.on("rpc:message", this.onRpcMessage);
  }
  /**
   * [新增] 主动销毁资源
   * 必须显式调用 ipcMain.off，否则 Electron 主进程会一直持有引用导致泄漏，
   * 且旧的监听器会继续响应新的消息。
   */
  dispose() {
    if (this.onRpcMessage) {
      import_electron.ipcMain.off("rpc:message", this.onRpcMessage);
    }
    if (this.disconnectHandler) {
      import_electron.ipcMain.off("rpc:disconnect", this.disconnectHandler);
      this.disconnectHandler = void 0;
    }
    if (this.destroyedHandler && !this.sender.isDestroyed()) {
      this.sender.off("destroyed", this.destroyedHandler);
      this.destroyedHandler = void 0;
    }
    this.listener = void 0;
  }
  disconnect() {
    try {
      if (!this.sender.isDestroyed()) {
        this.sender.send("rpc:disconnect");
      }
    } catch (error) {
    }
    this.dispose();
  }
  onDisconnect(cb) {
    this.disconnectHandler = (event) => {
      if (event.sender.id === this.remoteCtx.id) {
        cleanup();
      }
    };
    this.destroyedHandler = () => {
      cleanup();
    };
    const cleanup = () => {
      this.dispose();
      cb();
    };
    import_electron.ipcMain.on("rpc:disconnect", this.disconnectHandler);
    this.sender.on("destroyed", this.destroyedHandler);
  }
};
var Server = class extends RpcServer {
  constructor(id = "rpc.electron.main") {
    super({ id });
    // [新增] 维护 WebContents ID -> 连接实例的映射，用于去重
    this.connectionsMap = /* @__PURE__ */ new Map();
    import_electron.ipcMain.on("rpc:hello", (event) => {
      const senderId = event.sender.id;
      if (this.connectionsMap.has(senderId)) {
        const oldConnection = this.connectionsMap.get(senderId);
        oldConnection.dispose();
        super.onDisconnect(oldConnection);
        this.connectionsMap.delete(senderId);
      }
      const connection = new IpcConnection(event.sender);
      this.connectionsMap.set(senderId, connection);
      super.addConnection(connection);
      if (!event.sender.isDestroyed()) {
        event.sender.send("rpc:hello");
      }
      connection.onDisconnect(() => {
        if (this.connectionsMap.get(senderId) === connection) {
          this.connectionsMap.delete(senderId);
        }
        super.onDisconnect(connection);
      });
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ArgumentTransformer,
  CallbackRegistry,
  ProxyHelper,
  RPC_PROXY_SYMBOL,
  RemoteProxyRegistry,
  RpcClient,
  RpcMessageType,
  RpcServer,
  Server,
  createRpcService,
  isPromise
});
