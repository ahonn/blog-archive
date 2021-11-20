---
layout: post
date: 2019-07-28
title: 你可能不知道的 Node.js util 模块
---

作为 Node.js 的内置模块，其实 util 模块中包含了许多实用的工具函数。这篇文章主要介绍其中的两类函数：函数转换类（callbackify/promisify/deprecate）与调试辅助类（debuglog/inspect）。

## 函数转换

### callbackify 与 promisify

提到函数转换就不得不提 callback 与 promise 之间的互相转换了。在不知道这些函数之前，我会写出这样的代码：

```js
const fs = require('fs');

function readFilePromise() {
  return Promise((resolve, reject) => {
    fs.readFile(...arguments, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}
```

通过这种方式给 `fs.readFile` 函数加上一个 Promise 版本，但其实这种做法在 Node.js 中是多此一举。util 模块中早已实现了将 callback 函数转换为 promise 函数的工具函数了。它就是 `util.promisify(original)`，并且也提供了反向转换的函数 `util.callbackify(original)`，有了这两个函数我们就再也不需要手写实现或者是使用 `promisify` 之类的包了。

有了这两个函数，我们就可以优雅的进行转换了:

```js
const fs = require('fs');
const util = require('util');

const readFilePromsise = util.promisify(fs.readFile); // promise
const readFileCallback = util.callbackify(readFilePromise); // callback
```

### deprecate

util 模块中还包含了一个重构过程中非常常用的函数：`util.deprecate(fn, msg[, code])`。通常在一些被多方调用的代码中进行重构，修改暴露出去的函数名称，或者是不再建议第三方调用者使用时会对对应的函数标记为 deprecate。

除了在 jsdoc 中进行标记之外，我们还需要在函数的运行时进行提醒，这个时候就需要用到 `util.deprecate` 了。

假如我们有一个函数叫 `foo`，它会打印一句 `'Hello World'`。现在我们需要把函数名称改为 `bar`，然后将 `foo` 标记为 deprecate。我们可以这样写：

```js
const util = require('util');

exports.bar = () => {
  console.log('Hello World');
};

exports.foo = util.deprecate(
  exports.bar,
  'foo() is deprecated. Use bar() instead.',
);
```

这样在第三方调用者调用导出的 `foo` 函数时，将会看到一行提示 `DeprecationWarning: foo() is deprecated. Use bar() instead.`。通过以上的处理，我们就可以逐渐的在后面的版本中去掉这些已经废弃的函数。

## 调试辅助

### debuglog

如果我问你，你最常用的 debug npm 包是哪一个的话，大概率你会回答 [debug](https://www.npmjs.com/package/debug)。有了 util 模块，其实你大多数时候都不需要这个 npm 包了。通过 `util.debuglog` 就可以轻松的拥有类似的体验。

```js
// debug.js
const util = require('util');
const debug = util.debuglog('app');

function foo() {
  debug('foo');
}

function bar() {
  foo();
  debug('bar');
}

bar();
```

如果你通过 `node debug.js` 命令运行的话，将什么都看不见。`debuglog` 所输出的内容，只有在 `NODE_DEBUG` 中包含对应的`section`（上述代码中的 `'app'`）才会输出。

即运行 `NODE_DEBUG=app node debug.js` 才能够看到输出如下：

```bash
$ NODE_DEBUG=app node debug.js
APP 66568: foo
APP 66568: bar
```

`util.debuglog` 给我们带来的能力有限（没有颜色，不带时间戳），但对于简单的 node.js 脚本来说是完完全全够用了。

### inspect

`util.inspect(object[, options])` 主要用来与 `console.log` 或者 `util.debuglog` 之类的进行配合，能够友好将对象格式化为字符串。

```js
const util = require('util');

const o = {
  a: {
    b: {
      c: 1,
      d: () => {},
    },
  },
};

console.log(util.inspect(o, true, null));
// { a: { b: { c: 1, d: { [Function: d] [length]: 0, [name]: 'd' } } } }
```

看起来有点类似 `JSON.stringify`，但是又有一些不同。`util.inspect`不会忽略函数，同时可以通过 showHidden 参数来控制是否显示隐藏属性（函数的名称，参数长度等）。对象`o`通过`JSON.stringify` 处理后的输出为 `{"a":{"b":{"c":1}}}`。

除此之外，inspect 函数还有一个短参数的版本（上面的代码使用的）：`util.inspect(object[, showHidden[, depth[, colors]]])`。具体使用以及配置可见 [https://nodejs.org/api/util.html#util_util_inspect_object_showhidden_depth_colors](https://nodejs.org/api/util.html#util_util_inspect_object_showhidden_depth_colors) 。

## 写在后面

为什么会写这一篇科普文章呢，其实是早上起床刷 twitter 看到 [https://twitter.com/JavaScriptDaily/status/1154809356023717888](https://twitter.com/JavaScriptDaily/status/1154809356023717888) ，发现对应 util 模块我基本上一无所知，最多只是知道有 `promisify` 函数。因此就此机会学习一下，并做此纪录。

其中对我来说最喜欢的函数是 `deprecate`，简直是重构的好帮手。不知道读完这篇文章的你更喜欢哪一个函数呢？
