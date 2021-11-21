---
layout: post
title: 从 @babel/register 到 node.js require()
date: 2019-04-09
featured: true
---

通常我们会用 babel 来将浏览器未兼容的新语法编译为兼容的代码，以便在旧浏览器或者环境下运行。
除了编译运行外，babel 还提供了 @babel/register 来即时编译运行。

## 如何使用 @babel/register

使用 @babel/register 的方式很简单，只需要将以下代码放在需要编译运行的代码引入前：

```js
require("@babel/register");
```

值得注意的是当所需的功能需要使用 polyfill 来实现时，你必须将它们逐个引入。

那么 @babel/register 是怎么通过这一行代码使得后面引入的代码会即时编译之后再运行呢？答案是通过 node 的 require 钩子来在加载代码时进行即时编译。（ @babel/register 调用了一个名为 [pirates](https://github.com/ariporad/pirates) 的库来实现）。

相关代码：

```js
import { addHook } from "pirates";

// ...

function hookExtensions(exts) {
  if (piratesRevert) piratesRevert();
  piratesRevert = addHook(compileHook, { exts, ignoreNodeModules: false });
}

// ...
```

## 怎么添加 require 钩子

其实原理非常简单，只要在 Module.\_extensions 中处理对应文件扩展名的函数前执行钩子函数就可以了。在 node 内部的模块加载流程中会通过 Module.\_extensions 查找对应的处理函数来处理不同的文件。具体代码见 [https://github.com/nodejs/node/blob/v11.x/lib/internal/modules/cjs/loader.js#L664](https://github.com/nodejs/node/blob/v11.x/lib/internal/modules/cjs/loader.js#L664)

而在 Module.\_extensions 上默认实现了对 .js / .json / .node 文件的处理：

- 对于 .js 文件，通过 `fs.readFileSync()` 读取文件，并调用 `module._compile()` 进行编译返回
- 对于 .json 文件，读取文件后尝试使用 `JSON.parse()` 解析，并赋值给 `module.exports` 返回
- 对于 .node 文件，通过 `process.dlopen` 加载 node addons

所以实际上对于 .js 文件的处理， `pirates.addHook()` 是会重写 `module._compile()`，将传入该函数的文件内容（对于 @babel/register 来说，就是使用新语法的 JavaScript 代码）通过 hook 函数处理之后再使用默认的 `module._complie()` 进行编译。

```js
const oldLoader = Module._extensions[ext];
Module._extensions[ext] = function newLoader(mod, filename) {
  compile = mod._compile;
  mod._compile = function _compile(code) {
    mod._compile = compile;
    const newCode = hook(code, filename); // 调用钩子函数处理代码
    return mod._compile(newCode, filename); // 将返回的代码传给默认的编译函数
  };
  oldLoader(mod, filename);
};
```

## 实现 flow-register

通过以上的描述，我们很容易的可以通过 [flow-remove-types](https://github.com/flowtype/flow-remove-types) 在 require 时去除 flow 相关的类型标记并执行代码。

简单的实现：

```js
/* index.js */
const Module = require("module");
const flowRemoveTypes = require("flow-remove-types");

const oldLoader = Module._extensions[".js"];
Module._extensions[".js"] = function (mod, filename) {
  let compile = mod._compile;
  mod._compile = function _compile(code) {
    mod._compile = compile;
    const newCode = flowRemoveTypes(code);
    return mod._compile(newCode, filename);
  };
  oldLoader(mod, filename);
};

const hello = require("./hello.js");
hello("ahonn");

/* hello.js */
// @flow

function hello(name: string) {
  console.log(`hello ${name}`);
}

module.exports = hello;
```

使用这种方式就可以定制当 require 某种文件时我们需要的处理逻辑，例如可以指定某种格式的 JSON 文件后缀为 `.jsonx` ，然后通过 require 钩子的方式使用 [ajv](https://github.com/epoberezkin/ajv) 来更快的解析；或者让 node 环境下能够直接 require wasm 文件并运行。

虽然 Hack require 的方式性能不太好（每次 require 新的文件都会执行编译），并且也不推荐使用在生产环境，但是在开发环境下却能够非常方便的无需编译的使用现有代码。另外通过以上了解，也能够更好的理解 node 的模块机制。

## 参考

- [@babel/register · Babel](https://babeljs.io/docs/en/babel-register)
- [ariporad/pirates: Properly hijack require](https://github.com/ariporad/pirates)
- [Modules | Node.js v11.13.0 Documentation](https://nodejs.org/api/modules.html)
