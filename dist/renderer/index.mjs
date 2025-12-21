// src/shared/rpc.ts
var RPC_PROXY_SYMBOL = /* @__PURE__ */ Symbol.for("__rpc_proxy_meta__");
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
  function asProxyService2(data) {
    return data;
  }
  ProxyHelper2.asProxyService = asProxyService2;
  function createProxyService2(caller, name, options) {
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
  ProxyHelper2.createProxyService = createProxyService2;
})(ProxyHelper || (ProxyHelper = {}));
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

// src/renderer/electron.renderer.ts
var createContext = (id) => {
  return { id };
};
var IpcConnection = class {
  constructor(ipcRenderer, remoteId) {
    this.ipcRenderer = ipcRenderer;
    this.remoteCtx = createContext(remoteId);
  }
  remoteContext() {
    return this.remoteCtx;
  }
  send(...args) {
    this.ipcRenderer.send("rpc:message", ...args);
  }
  on(listener) {
    this.dispose();
    this.currentHandler = (event, ...args) => {
      listener(...args);
    };
    this.ipcRenderer.on("rpc:message", this.currentHandler);
  }
  /**
   * 本地资源清理
   * 使用 removeListener 清理监听器
   */
  dispose() {
    if (this.currentHandler) {
      this.ipcRenderer.removeListener("rpc:message", this.currentHandler);
      this.currentHandler = void 0;
    }
  }
  disconnect() {
    try {
      this.ipcRenderer.send("rpc:disconnect");
    } catch (e) {
    }
    this.dispose();
  }
};
var Client = class extends RpcClient {
  constructor(ipcRenderer) {
    super(new IpcConnection(ipcRenderer, "rpc.electron.main"));
    this.ipcRenderer = ipcRenderer;
    ipcRenderer.send("rpc:hello");
    this.helloHandler = () => {
      console.log(`Client get rpc:hello`);
      this.cleanupHelloHandler();
    };
    ipcRenderer.on("rpc:hello", this.helloHandler);
  }
  cleanupHelloHandler() {
    if (this.helloHandler) {
      this.ipcRenderer.removeListener("rpc:hello", this.helloHandler);
      this.helloHandler = void 0;
    }
  }
  disconnect() {
    this.cleanupHelloHandler();
    this.connection.disconnect();
  }
};

// src/shared/proxy.ts
var asProxyService = ProxyHelper.asProxyService;
var createProxyService = ProxyHelper.createProxyService;
export {
  Client,
  asProxyService,
  createProxyService
};
