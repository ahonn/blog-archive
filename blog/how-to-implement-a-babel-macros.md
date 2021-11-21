---
layout: post
title: 如何实现一个 Babel Macros
date: 2019-10-30
---

通过 babel 插件，我们很容易的就在编译时将某些代码转换成其他代码以实现某些优化。例如 [babel-plugin-lodash](https://github.com/lodash/babel-plugin-lodash) 可以帮我们将直接 import 的 lodash 替换成能够进行 tree shaking 的代码；通过 [babel-plugin-preval](https://github.com/kentcdodds/babel-plugin-preval) 在编译时执行脚本并使用返回值原位替换。

一切看起来都很美好，但实际上在使用 babel 插件时我们还需要对 `.babelrc` 或者 `babel.config.js` 进行配置。

```json
{
  "plugins": ["preval"]
}
```

在暴露 babel 配置文件的项目下或许还能够接受，但在 [create-react-app](https://github.com/facebook/create-react-app) 下就不得不破坏原来的和谐， eject 一下配置再进行相关的配置了。

有没有什么更好的方式呢？有的，我们可以用 [babel-plugin-macros](https://github.com/kentcdodds/babel-plugin-macros)

## babel-plugin-macros 是什么？

babel-plugin-macros 显而易见是一个 babel 插件，它提供了一种零配置编译时替换代码的方式。我们只需要在 babel 配置里添加 babel-plugin-macros 插件配置就可以使用了。显然这个 “零配置” 是把自身除外的。但别担心，create-react-app 已经内置了这个插件，可以开箱即用。

```json
{
  "plugins": ["macros"]
}
```

然后就可以开始真正的零配置体验，引入我们需要的 macro 直接使用。

```js
// 编译前
import preval from "preval.macro";
const one = preval`module.exports = 1 + 2 - 1 - 1`;

// 编译后
const one = 3;
```

与 babel-plugin-preval 相比，我们不在需要再进行额外的配置，而是通过 import macro 来使用对应的功能。babel 在编译期会读取以 .macro 结尾的包，并执行对应的逻辑来替换代码，这种方式比插件来的更加直观，我们再也不会出现 “这个 preval 是哪里引进来？” 的疑问了。

那么怎么实现一个 babel macros 呢？

## 实现一个 Babel macros

假设我们有这么一个场景：我们的项目中包括前后端的代码，后端的 Node.js 通过 [dotenv](https://www.npmjs.com/package/dotenv) 读取项目根目录下的 `.env` 获取某些配置，现在我们有一些前端 JavaScript 代码也需要使用到 `.env` 里到某些配置，但不能把所有的配置都暴露到 JavaScript 中。

一般情况下，我们可以将 .env 中的某些配置传入 webpack 的 DefinePlugin 插件中，前端代码通过读取全局变量的方式进行访问。现在我们通过 Babel macros 的方式来实现如下效果：

```bash
# .env
NAME=ahonn
NUMBER=123
```

```js
// 编译前
import dotenv from "dotenv.macro";

const NAME = dotenv("NAME");
const NUMBER = dotenv("NUMBER");

// 编译后
const NAME = "ahonn";
const NUMBER = "123";
```

### 创建 Macro

babel-plugin-macros 会把引入的 .macro 或者 .macro.js 当成宏进行处理，所有首先我们需要创建一个名为 dotenv.macro.js 的文件，并且这个文件导出的应该是一个通过 `createMacro` 包装后的函数。

如果没有通过 `createMacro` 进行包装的话，执行 `babel` 就会提示：`The macro imported from "../../dotenv.macro" must be wrapped in "createMacro" which you can get from "babel-plugin-macros".`

```js
const { createMacro } = require("babel-plugin-macros");

module.exports = createMacro(({ references, state, babel }) => {
  // TODO
});
```

传入 `createMacro` 的函数接受三个参数：

- references: 编译的代码中对该宏的引用
- state: 编译状态信息
- babel: babel-core 对象，与 `require(‘@babel/core’)` 相同

在我们的例子中 references 的值是 `{ default: [ NodePath {...} ] }`，这里的 `default` 中的 NodePath 即是上面编译前代码中 `dotenv` 调用在 AST 中的节点。
（如果对 AST 或者 babel 插件开发不太熟悉的话，推荐阅读 [babel-handbook/plugin-handbook.md](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md)）

### 判断调用形式

拿到对应的 AST 节点（后面称为 path）之后，我们需要对调用形式进行判断来确定如何转换代码，这里我们通过判断 `path.parentPath` 的节点类型来判断。

我们可以通过传入 `createMacro` 的函数的第三个参数 babel 来获取一些用于判断节点类型的函数，`babel.types` 等价于 [@babel/types](https://babeljs.io/docs/en/babel-types)。

- 通过 `babel.types.isCallExpression` 来判断是否为函数形式调用
- 通过 `babel.types.isTaggedTemplateExpression` 来判断是否为模版字符串形式调用

我们只对函数形式调用处理：

```js
const { createMacro } = require("babel-plugin-macros");

module.exports = createMacro(({ references, state, babel }) => {
  references.default.forEach((path) => {
    if (path.parentPath && babel.types.isCallExpression(path.parentPath)) {
      // TODO
    }
  });
});
```

### 获取目标值

做完前置的条件判断之后，现在我们就可以通过 `dotenv` 来获取 `.env` 中配置的值，然后将对应的值替换对应的 AST 节点，从而使得编译后的代码在 macro 引用位置被替换为目标值。

```js
const dotenv = require("dotenv");
const { createMacro } = require("babel-plugin-macros");

module.exports = createMacro(({ references, state, babel }) => {
  const env = dotenv.config();

  references.default.forEach((path) => {
    if (path.parentPath && babel.types.isCallExpression(path.parentPath)) {
      const args = path.parentPath.get("arguments");
      const key = args[0].evaluate().value;
      const value = env.parsed[key]; // ahonn
    }
  });
});
```

我们通过 `path.parentPath.get('arguments')` 获取到父节点（即节点类型为 CallExpression 的节点）中的 arguments 属性（即函数调用参数列表）。然后通过 `args[0].evaluate().value` 来获取第一个参数的值，即为 `dotenv('NAME')` 中的 `'NAME'`。最后从 dotenv 解析的 env 对象中获取目标值 `'ahonn'`。

### AST 节点替换

最后一步，我们需要判断上一步获取的目标值的类型，然后根据不同的类型进行 AST 转换。以我们上面的例子来说就是：

- `const NAME = dotenv('NAME');` 转换为 `const NAME = 'ahonn';`
- `const NUMBER = dotenv('NUMBER');` 转换为 `const NUMBER = 123;`

```js
const dotenv = require("dotenv");
const { createMacro } = require("babel-plugin-macros");

module.exports = createMacro(({ references, state, babel }) => {
  const env = dotenv.config();

  references.default.forEach((path) => {
    if (path.parentPath && babel.types.isCallExpression(path.parentPath)) {
      const args = path.parentPath.get("arguments");
      const key = args[0].evaluate().value;
      const value = env.parsed[key];

      if (typeof value === "number") {
        path.parentPath.replaceWith(babel.types.numericLiteral(value));
      } else {
        path.parentPath.replaceWith(babel.types.stringLiteral(value));
      }
    }
  });
});
```

通过 `typeof value` 判断目标值的类型，这里只处理数字与字符串，非数字的值都当成字符串处理。然后再一次的通过 `babel.types` 中提供的 `numericLiteral` 与 `stringLiteral` 来创建对应的 AST 节点。最后将 `path.parentParh` 替换为生成的节点。

到这里，一个读取 .env 中对应的值并在编译时替换相应的代码的 macro 就完成了。上面我们提到的 `preval.macro` 的实现也与上面类似。

### Q&A

- 为什么是替换掉 path.parentPath ?
  A: 因为我们拿到的 references 中的引用只是对应的宏的 AST 节点，而一般 Babel macros 中我们通过函数调用或者模版字符串形式进行调用，因此需要往上一层进行替换。

- 可以通过 Babel macros 拓展 JavaScript 语法么?
  不行，因为 Babel 只能够识别合法的 JavaScript 语法，即使使用 babel-plugin-macros 也无法改变这一事实。如果想要拓展 JavaScript 语法的话需要修改 [babel-parser](https://github.com/babel/babel/tree/master/packages/babel-parser)。具体怎么做，可以查看这篇文章：[Creating custom JavaScript syntax with Babel | Tan Li Hau](https://lihautan.com/creating-custom-javascript-syntax-with-babel/)

## 总结

看到这里，可以发现实现一个 Babel macros 的过程与开发 Babel 插件的流程类似，都是对 AST 进行操作。babel-plugin-macro 只是提供一个在“外部”进行 AST 修改的方式，通过这种方式能够灵活的对 Babel 编译时进行拓展。但话又说回来，这种方式用多了会不会令代码变得不好维护呢？欢迎留言讨论。

## 参考

- [深入浅出 Babel 下篇：既生 Plugin 何生 Macros - 掘金](https://juejin.im/post/5da12397e51d4578364f6ffa#heading-5)
- [Babel macros | Tan Li Hau](https://lihautan.com/babel-macros/)
- [Zero-config code transformation with babel-plugin-macros · Babel](https://babeljs.io/blog/2017/09/11/zero-config-with-babel-macros)
