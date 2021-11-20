---
layout: post
title: 关于 tapable 你需要知道这些
date: 2019-08-21
---

在阅读 webpack 前如果不了解 [tapable](https://github.com/webpack/tapable) 的话，很有可能会看得云里雾里，那么 tapable 到底是什么，又有什么用呢？本文主要介绍 tapable 的使用以及相关实现，通过学习 tapable 能够进一步的了解 webpack 的插件机制。以下内容皆基于 [tapable v1.1.3 版本](https://github.com/webpack/tapable/tree/tapable-1)。

tapable 是一个类似于 Node.js 中的 EventEmitter 的库，但更专注于自定义事件的触发和处理。webpack 通过 tapable 将实现与流程解耦，所有具体实现通过插件的形式存在。

## 基本使用

想要了解 tapable 的实现，那就必然得知道 tapable 的用法以及有哪些使用姿势。tapable 中主要提供了同步与异步两种钩子。我们先从简单的同步钩子开始说起。

### 同步钩子

#### SyncHook

以最简单的 SyncHook 为例：

```js
const { SyncHook } = require('tapable');
const hook = new SyncHook(['name']);
hook.tap('hello', (name) => {
  console.log(`hello ${name}`);
});
hook.tap('hello again', (name) => {
  console.log(`hello ${name}, again`);
});

hook.call('ahonn');
// hello ahonn
// hello ahonn, again
```

可以看到当我们执行 `hook.call('ahonn')` 时会依次执行前面 `hook.tap(name, callback)` 中的回调函数。通过 `SyncHook` 创建同步钩子，使用 `tap` 注册回调，再调用 `call` 来触发。这是 tapable 提供的多种钩子中比较简单的一种，通过 EventEmitter 也能轻松的实现这种效果。

此外，tapable 还提供了很多有用的同步钩子：

- SyncBailHook：类似于 SyncHook，执行过程中注册的回调返回非 undefined 时就停止不在执行。
- SyncWaterfallHook：接受至少一个参数，上一个注册的回调返回值会作为下一个注册的回调的参数。
- SyncLoopHook：有点类似 SyncBailHook，但是是在执行过程中回调返回非 undefined 时继续再次执行当前的回调。

### 异步钩子

除了同步执行的钩子之外，tapable 中还有一些异步钩子，最基本的两个异步钩子分别是 AsyncParallelHook 和 AsyncSeriesHook 。其他的异步钩子都是在这两个钩子的基础上添加了一些流程控制，类似于 SyncBailHook 之于 SyncHook 的关系。

#### AsyncParallelHook

AsyncParallelHook 顾名思义是并行执行的异步钩子，当注册的所有异步回调都并行执行完毕之后再执行 callAsync 或者 promise 中的函数。

```js
const { AsyncParallelHook } = require('tapable');
const hook = new AsyncParallelHook(['name']);

console.time('cost');

hook.tapAsync('hello', (name, cb) => {
  setTimeout(() => {
    console.log(`hello ${name}`);
    cb();
  }, 2000);
});
hook.tapPromise('hello again', (name) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`hello ${name}, again`);
      resolve();
    }, 1000);
  });
});

hook.callAsync('ahonn', () => {
  console.log('done');
  console.timeEnd('cost');
});
// hello ahonn, again
// hello ahonn
// done
// cost: 2008.609ms

// 或者通过 hook.promise() 调用
// hook.promise('ahonn').then(() => {
//  console.log('done');
//  console.timeEnd('cost');
// });
```

可以看到 AsyncParallelHook 比 SyncHook 复杂很多，SyncHook 之类的同步钩子只能通过 tap 来注册， 而异步钩子还能够通过 tapAsync 或者 tapPromise 来注册回调，前者以 callback 的方式执行，而后者则通过 Promise 的方式来执行。异步钩子没有 call 方法，执行注册的回调通过 callAsync 与 promise 方法进行触发。两者间的不同如上代码所示。

#### AsyncSeriesHook

如果你想要顺序的执行异步函数的话，显然 AsyncParallelHook 是不适合的。所以 tapable 提供了另外一个基础的异步钩子：AsyncSeriesHook。

```js
const { AsyncSeriesHook } = require('tapable');
const hook = new AsyncSeriesHook(['name']);

console.time('cost');

hook.tapAsync('hello', (name, cb) => {
  setTimeout(() => {
    console.log(`hello ${name}`);
    cb();
  }, 2000);
});
hook.tapPromise('hello again', (name) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`hello ${name}, again`);
      resolve();
    }, 1000);
  });
});

hook.callAsync('ahonn', () => {
  console.log('done');
  console.timeEnd('cost');
});
// hello ahonn
// hello ahonn, again
// done
// cost: 3011.162ms
```

上面的示例代码与 AsyncParallelHook 的示例代码几乎相同，不同的是 hook 是通过 `new AsyncSeriesHook()` 实例化的。通过 AsyncSeriesHook 就能够顺序的执行注册的回调，除此之外注册与触发的用法都是相同的。

同样的，异步钩子也有一些带流程控制的钩子：

- AsyncParallelBailHook：执行过程中注册的回调返回非 undefined 时就会直接执行 callAsync 或者 promise 中的函数（由于并行执行的原因，注册的其他回调依然会执行）。
- AsyncSeriesBailHook：执行过程中注册的回调返回非 undefined 时就会直接执行 callAsync 或者 promise 中的函数，并且注册的后续回调都不会执行。
- AsyncSeriesWaterfallHook：与 SyncWaterfallHook 类似，上一个注册的异步回调执行之后的返回值会传递给下一个注册的回调。

### 其他

tapable 中除了这一些核心的钩子之外还提供了一些功能，例如 [HookMap](https://github.com/webpack/tapable#hookmap)，[MultiHook](https://github.com/webpack/tapable#multihook) 等。这里就不详细描述它们了，有兴趣的可以自行前往游览。

## 具体实现

想知道 tapable 的具体实现就必须去阅读相关的源码。由于篇幅有限，这里我们就通过阅读 SyncHook 相关的代码来看看相关实现，其他的钩子思路上大体一致。我们通过以下代码来慢慢深入 tapable 的实现：

```js
const { SyncHook } = require('tapable');
const hook = new SyncHook(['name']);
hook.tap('hello', (name) => {
  console.log(`hello ${name}`);
});
hook.call('ahonn');
```

### 入口

首先，我们实例化了 `SyncHook`，通过 package.json 可以知道 tapable 的入口在 [/lib/index.js](https://github.com/webpack/tapable/blob/tapable-1/lib/index.js) ，这里导出了上面提到的那些同步/异步的钩子。SyncHook 对应的实现在 [/lib/SyncHook.js](https://github.com/webpack/tapable/blob/tapable-1/lib/SyncHook.js) 。

在这个文件中，我们可以看到 SyncHook 类的结构如下：

```js
class SyncHook exntends Hook {
	tapAsync() { ... }
	tapPromise() { ... }
	compile(options) { ... }
}
```

在 `new SyncHook()` 之后，我们会调用对应实例的 `tap` 方法进行注册回调。很明显，`tap` 不是在 SyncHook 中实现的，而是在父类中。

### 注册回调

可以看到 [/lib/Hook.js](https://github.com/webpack/tapable/blob/tapable-1/lib/Hook.js) 文件中 Hook 类中实现了 tapable 钩子的绝大多数方法，包括 `tap`，`tapAsync`，`tapPromise`，`call`，`callAsync` 等方法。

我们主要关注 `tap` 方法，可以看到该方法除了做了一些参数的检查之外还调用了另外的两个内部方法：`_runRegisterInterceptors` 和 `_insert`。`_runRegisterInterceptors()` 是运行 register 拦截器，我们暂且忽略它（有关拦截器可以查看 [tapable#interception](https://github.com/webpack/tapable#interception) ）。

重点关注一下 `_insert` 方法：

```js
_insert(item) {
  this._resetCompilation();
  let before;
  if (typeof item.before === 'string') before = new Set([item.before]);
  else if (Array.isArray(item.before)) {
    before = new Set(item.before);
  }
  let stage = 0;
  if (typeof item.stage === 'number') stage = item.stage;
  let i = this.taps.length;
  while (i > 0) {
    i--;
    const x = this.taps[i];
    this.taps[i + 1] = x;
    const xStage = x.stage || 0;
    if (before) {
      if (before.has(x.name)) {
        before.delete(x.name);
        continue;
      }
      if (before.size > 0) {
        continue;
      }
    }
    if (xStage > stage) {
      continue;
    }
    i++;
    break;
  }
  this.taps[i] = item;
}
```

这里分成三个部分看，第一部分是 `this. _resetCompilation()` ，这里主要是重置一下 `call`，`callAsync`, `promise` 这三个函数。至于为什么要这么做，我们后面再讲，这里先插个眼。

第二部分是一堆复杂的逻辑，主要是通过 options 中的 before 与 stage 来确定当前 `tap` 注册的回调在什么位置，也就是提供了优先级的配置，默认的话是添加在当前现有的 `this.taps` 后。将 before 与 stage 相关代码去除后 `_insert` 就变成了这样：

```js
_insert(item) {
  this._resetCompilation();
  let i = this.taps.length;
  this.taps[i] = item;
}
```

### 触发

到目前为止还没有什么特别的骚操作，我们继续看。当我们注册了回调之后就可以通过 `call` 来进行触发了。通过 Hook 类的构造函数我们可以看到。

```js
constructor(args) {
  if (!Array.isArray(args)) args = [];
  this._args = args;
  this.taps = [];
  this.interceptors = [];
  this.call = this._call;
  this.promise = this._promise;
  this.callAsync = this._callAsync;
  this._x = undefined;
}
```

这时候可以发现 `call` ，`callAsync`，`promise` 都指向了下划线开头的同名函数，在文件底部我们看到了如下代码：

```js
function createCompileDelegate(name, type) {
  return function lazyCompileHook(...args) {
    this[name] = this._createCall(type);
    return this[name](...args);
  };
}

Object.defineProperties(Hook.prototype, {
  _call: {
    value: createCompileDelegate('call', 'sync'),
    configurable: true,
    writable: true,
  },
  _promise: {
    value: createCompileDelegate('promise', 'promise'),
    configurable: true,
    writable: true,
  },
  _callAsync: {
    value: createCompileDelegate('callAsync', 'async'),
    configurable: true,
    writable: true,
  },
});
```

这里可以看到第一次执行 `call`的时候实际上跑的是 `lazyCompileHook` 这个函数，这个函数会调用 `this._createCall('sync')` 来生成新函数执行，后面再次调用 `call` 时其实也是执行的生成的函数。

到这里其实我们就可以明白前面在调用 `tap` 时执行的 `this. _resetCompilation()` 的作用了。也就是说，只要没有新的 `tap` 来注册回调，`call` 调用的就都会是同一个函数（第一次调用 `call` 生成的）。 执行新的 `tap` 来注册回调后的第一次 `call` 方法调用都会重新生成函数。

> 这里其实我不太明白为什么要通过 `Object.defineProperties` 在原型链上添加方法，直接写在 Hook class 中的效果应该是一样的。tapable 目前的 v2.0.0 beta 版本中已经不这样实现了，如果有人知道为什么。请评论告诉我吧。

为什么需要重新生成函数呢？秘密就在 `this._createCall('sync')` 中的 `this.complie()` 里。

```js
_createCall(type) {
  return this.compile({
    taps: this.taps,
    interceptors: this.interceptors,
    args: this._args,
    type: type
  });
}
```

### 编译函数

`this.complie()` 不是在 Hook 中实现的，我们跳回到 SyncHook 中可以看到：

```js
compile(options) {
  factory.setup(this, options);
  return factory.create(options);
}
```

这里出现了一个 `factory`，可以看到 factory 是上面的 `SyncHookCodeFactory` 类的实例，`SyncHookCodeFactory` 中只实现了 `content`。所以我们往上继续看父类 `HookCodeFactory` （[lib/HookCodeFactory.js](https://github.com/webpack/tapable/blob/tapable-1/lib/HookCodeFactory.js)）中的 `setup` 与 `create`。

这里 setup 函数把 Hook 类中传过来的 `options.taps` 中的回调函数（调用 tap 时传入的函数）赋值给了 SyncHook 里的 `this._x`:

```js
setup(instance, options) {
  instance._x = options.taps.map(t => t.fn);
}
```

然后 `factory.create()` 执行之后返回，这里我们可以知道 `create()` 返回的返回值必然是一个函数（供 call 来调用）。看到对应的源码，`create()` 方法的实现有一个 switch，我们着重关注 `case 'sync'`。将多余的代码删掉之后我们可以看到 `create()` 方法是这样的：

```js
create(options) {
  this.init(options);
  let fn;
  switch (this.options.type) {
    case "sync":
      fn = new Function(
        this.args(),
        '"use strict";\n' +
          this.header() +
          this.content({
            onError: err => `throw ${err};\n`,
            onResult: result => `return ${result};\n`,
            resultReturns: true,
            onDone: () => "",
            rethrowIfPossible: true
          })
      );
      break;
  }
  this.deinit();
  return fn;
}
```

可以看到这里用到了 `new Function()` 来生成函数并返回 ,这是 tapable 的关键。通过实例化 SyncHook 时传入的参数名列表与后面注册的回调信息，生成一个函数来执行它们。对于不同的 tapable 钩子，最大的不同就是这里生成的函数不一样，如果是带有流程控制的钩子的话，生成的代码中也会有对应的逻辑。

这里我们在 `return fn` 之前加一句 `fn.toString()` 来看看生成出来的函数是什么样的：

```js
function anonymous(name) {
  'use strict';
  var _context;
  var _x = this._x;
  var _fn0 = _x[0];
  _fn0(name);
}
```

由于我们的代码比较简单，生成出来的代码就非常简单了。主要的逻辑就是获取 `this._x` 里的第一个函数并传入参数执行。如果我们在 `call` 之前再通过 `tap` 注册一个回调。那么生成的代码中也会对应的获取 `_x[1]` 来执行第二个注册的回调函数。

- 到这里整一个 `new SyncHook()` -> `tap` -> `call` 的流程就结束了。主要的两个比较有趣的点在执行 `call` 的时候会进行缓存，以及通过已知的信息来生成不同的函数给 `call` 执行。基本上其他的钩子的运行流程都差不多，具体的生成不同流程控制的细节这里就不详细说了，各位看官自行看源码吧（具体逻辑在 SyncHookCodeFactory 类的 [create](https://github.com/webpack/tapable/blob/tapable-1/lib/HookCodeFactory.js#L14) 方法中）。

## 总结

webpack 通过 tapable 这种巧妙的钩子设计很好的将实现与流程解耦开来，值得学习。或许下一次写类似需要插件机制的轮子的时候可以借鉴一些 webpack 的做法。不过 tapable 生成函数的部分看起来不是很优雅，或许 JavaScript 能够支持元编程的话或许能够实现得更好？

如果本文有理解或者表述错误，请评论告诉我。感谢阅读。
