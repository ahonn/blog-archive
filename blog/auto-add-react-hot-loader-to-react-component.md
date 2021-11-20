---
layout: post
title: 自动为 React 组件添加 react-hot-loader 支持
date: 2019-07-16
---

在 React 项目中使用 Webpack HMR 时，通常会使用 [react-hot-loader](https://github.com/gaearon/react-hot-loader) 来进行局部热更新。但使用 react-hot-loader 需要对原有代码进行修改，这对多入口的老项目非常的不友好。

为了使用上 HMR 这一“激动人心”的功能，需要在构建时在原有代码上自动添加 react-hot-loader 的相关代码。
因此我们需要创建一个 webpack loader 来在 babel 处理前将 react-hot-loader 相关代码添加到源
码中。

## react-hot-loader 的用法

react-hot-loader 的用法非常简单，安装 `react-hot-loader` 后在 babel 配置中加上 `react-hot-loader/babel` 插件：

```json
// .babelrc
{
  "plugins": ["react-hot-loader/babel"]
}
```

并且在根组件文件中添加如下代码即可：

```js
// App.js
import 'react-hot-loader';
import { hot } from 'react-hot-loader/root';
const App = () => <div>Hello World!</div>;
export default hot(App);
```

## 通过 webpack loader 修改代码

这里我们需要创建一个 webpack loader 来做这件事情，在代码被 `babel-loader` 处理前进行插入与修改。

Webpack Loader 用于对模块源码的转换，所以这里我们在源码顶部添加 `import 'react-hot-loader'` 与 `import { hot } from 'react-hot-loader/root'`，并将默认导出修改为 `export default hot(xxx)`。

如何对模块源码进行分析并修改呢？答案是 @babel/parser 与 @babel/traverse，通过 @babel/parser 解析为 AST 之后使用 @babel/traverse 遍历节点并进行修改。

### 将模块代码转换为 AST

```js
const ast = parse(source, {
  sourceType: 'module',
  plugins: ['jsx'],
});
```

对于 React 我们需要启用 jsx 插件（.babelrc 中需要有 babel-preset-react）才能正确的解析代码。如果使用了其他特性的话也需要启用相对应的插件，具体有哪些插件可以查看[@babel/parser · Babel](https://babeljs.io/docs/en/babel-parser#plugins)。

解析成 AST 之后我们就可以进行一些操作了，首先我们先把导入 react-hot-loader 的代码都加到模块源码的顶部。

### 导入 `react-hot-loader`

```js
ast.program.body.unshift(
  // insert `import 'react-hot-loader';`
  t.importDeclaration([], t.stringLiteral('react-hot-loader')),
  // insert `import { hot } from 'react-hot-loader/root';`
  t.importDeclaration(
    [t.importSpecifier(t.identifier('hot'), t.identifier('hot'))],
    t.stringLiteral('react-hot-loader/root'),
  ),
);
```

这里的 `t` 指的是 `@babel/types`，这个包包含了一些用于判断与创建 AST 节点对象的工具方法。上述代码在模块代码的最顶端导入了 `react-hot-loader` 以及从 `react-hot-loader/root` 导入需要调用的 `hot` 方法。

导入完之后我们需要对导出进行修改，将默认导出的组件包上一层 HOC。

### 修改模块导出

```js
traverse(ast, {
  ExportDefaultDeclaration: (path) => {
    path.node.declaration = t.callExpression(t.identifier(identifier), [
      path.node.declaration,
    ]);
  },
});
```

这样就能将 `export default xxx` 修改为 `export default hot(xxx)`。但现实世界是残酷的，我们还可能遇到这样的代码：

```js
export default const App = () => {};
export default class App {};
// 或者这样
export default () => {}
export default class {}
```

对于直接导出匿名函数或者类的，我们无能为力（其实也是有办法的，给它命一个名再导出，但是我不想这样干，使用暂时先不管了）。
但是对于导出非匿名的函数或者类的话，我们就可以进行修改了。把 `export default` 抽到底部，再把组件调用 `hot()` 之后进行导出。

稍微修改一下实现：

```js
const insertNodes = [];
traverse(ast, {
  const { declaration } = path.node;
  // 如果是 export default const App = () => {} 或者 export default class App {}
  if (t.isClassDeclaration(declaration) || t.isFunctionDeclaration(declaration)) {
    if (t.isIdentifier(declaration.id)) {
      path.replaceWith(declaration);
      // 在源码尾部进行默认导出
      insertNodes.push(
        t.ExportDefaultDeclaration(
          t.callExpression(
            t.identifier(identifier),
            [declaration.id]
          )
        )
      );
    }
    return;
  }
  // 如果是 export default App
  if (t.isIdentifier(declaration)) {
    path.node.declaration = t.callExpression(
    t.identifier(identifier),
      [path.node.declaration]
    );
    return;
  }
});
if (insertNodes.length > 0) {
  ast.program.body.push(...insertNodes);
}
```

好的，我们完成了解析代码为 AST 与修改 AST。是时候把它转回代码交给下一个 loader 了。

### AST 转换为代码

与 @babel/parser 类似，babel 也提供了将 AST 转换回代码的包： @babel/generator。不需要什么乱七八糟的魔法或者咒语，只需要 `const { code } = generate(ast);` 就可以获得崭新的 hot exportd 组件代码了。将它返回之后就可以愉快的使用 webpack HMR 了！！

## 还有一些坑

- 导入了就必须调用，没有例外
  如果对每个模块代码都进行以上操作的话，会发现页面上会提示 `hot update was not successful`。这是因为在调用 `ReactDOM.render()` 的文件中 `import { hot } from 'react-hot-loader'` 之后没有进行调用。所以我们需要添加一些判断，只在导出 React 组件的模块中进行代码修改。

- hot exportd 的组件被继承无效
  如果 A 组件继承 B 组件，而 B 组件被自动添加了 react-hot-loader 相关代码的话，A 组件将无法继承 B 组件的 state 与 methods。这个时候 B 组件已经不是 B 组件了，而是 `hot()` 这个 HOC 返回的 ExportedComponent。理论上被继承的组件也是不应该调用 `hot()`的，因此我们需要添加配置函数，用来判断是否需要修改模块代码。

基于以上的实现以及发现的坑点，我写了一个 [react-hot-export-loader](https://github.com/ahonn/react-hot-export-loader) 用来给 React 组件自动加上 react-hot-loader，并且添加了一些判断或者配置来避免上面的坑。具体的使用方式这里就不在赘述了，请移步 [README.md](https://github.com/ahonn/react-hot-export-loader/blob/master/README.md)。

## 写在最后

其实按照一般套路，我们只需要在项目的入口处加上几句 react-hot-loader 代码就可以了。但是无奈的是有些时候总是不会按照套路出牌，例如 webpack 打包的逻辑是公共的，打包的是多入口，或者入口你根本就不知道是什么样的。所以才会出现这样一篇文章，这里权当做记录解决这一问题的方案，顺带输出一个 loader 给有缘人。
