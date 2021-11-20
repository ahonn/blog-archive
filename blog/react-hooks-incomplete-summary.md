---
layout: post
title: React Hooks 不完全总结
date: 2020-01-02
---

React Hooks 在 2019 的二月份的 V16.8 版本中发布，带来了革命性的改变，同时也带来了另外的问题。本文是个人的 React Hooks 的不完全总结，主要内容包括 React Hooks 带来的改变以及其优缺点。

## 带来的改变

### 函数组件使用 state

在 React Hooks 出现之前，只有 Class Component 有组件状态，通常称之为 Stateful Component。并且称 Function Component 为 Stateless Component。而 React Hooks 中提供了 useState 来让 Function Component 拥有组件状态。

```jsx
function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <p>count: {count}</p>
      <button onClick={() => setCount(count - 1)}>-</button>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

[![](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/gracious-sutherland-7j5z8?fontsize=14&hidenavigation=1&theme=dark)

useState 的出现打破了我们无法在函数组件中拥有状态的困境，Stateless Component 不再 stateless。

### 忘记生命周期函数

那么，如果想要在 Function Component 中使用生命周期函数的话应该怎么办？忘记生命周期函数，我们不需要它，我们有 [useEffect](https://reactjs.org/docs/hooks-effect.html)。

使用 useEffect 我们可以达到类似生命周期的效果，useEffect 可以在组件进行渲染的时候，根据依赖判定是否需要执行传入的回调。

```jsx
function App() {
  const [count, setCount] = React.useState(0);
  const [title, setTitle] = React.useState('Hello World');

  // 不管什么情况，只要是渲染就会执行
  React.useEffect(() => {
    console.log(`title：${title}\ncount: ${count}`);
  });

  // 初始化渲染时执行，以及 count 的值改变时执行
  React.useEffect(() => {
    console.log(`count: ${count}`);
  }, [count]);

  return (
    <div>
      <div>
        <p>count: {count}</p>
        <button onClick={() => setCount(count - 1)}>-</button>
        <button onClick={() => setCount(count + 1)}>+</button>
      </div>
      <div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
    </div>
  );
}
```

[![](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/prod-lake-m9y39?fontsize=14&hidenavigation=1&theme=dark)

useEffect 会在组件初始化渲染的时候执行，类似于 ComponentDidMount。同时也会在组件重新渲染的时候执行，是否会执行取决于传入的 deps 数组。

- deps 为 undefind 时，不管什么情况，只要函数执行（渲染）就会调用
- deps 为 [] 时，只在组件首次渲染时调用
- deps 为包含变量数组时，只在变量改变时调用

**大多数情况下我们只需要用 useEffect 处理当值变化引起的副作用**

#### 返回回收函数

我们可以通过 useEffect 返回函数进行某些回收工作，这个函数会在组件被销毁时调用。例如我们可以通过 useEffect 注册监听，在通过返回的函数来注销监听。

```js
useEffect(() => {
  el.addEventListener(‘click’, handleClick);
  return () => {
    el.removeEventListener(‘click’, handleClick);
  }
}, [handleClick])
```

### 缓存值

由于没有了生命周期函数，所以所有在函数中的逻辑都将会在重新渲染时被执行。那么当进行某些比较昂贵的计算的时候，我们就可以使用 useMemo 避免在不必要的时候被重新计算。

useMemo 可以根据传入的依赖值，判断是否要重新执行函数，若需要则执行函数返回。

```js
function App() {
  const [number, setNumber] = React.useState(0);
  const [title, setTitle] = React.useState(“Hello World”);

  // result 值只在 number 变化的时候会重新执行
  const result = React.useMemo(() => {
    console.log(`call fibonacci(${number})`)
    return fibonacci(number);
  }, [number]);

  React.useEffect(() => {
    console.log(`title：${title}`);
  }, [title]);

  return (
    <div>
      <div>fibonacci({number}) = {result}</div>
      <button onClick={() => setNumber(number - 1)}>-</button>
      <button onClick={() => setNumber(number + 1)}>+</button>
      <div>
        <input value={title} onChange={e => setTitle(e.target.value)} />
      </div>
    </div>
  );
}
```

[![](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/quiet-hill-b6bdr?fontsize=14&hidenavigation=1&theme=dark)

以上代码中，改变 title 值会使得组件重新渲染，但不会重新计算 result 的值。

除了 useMemo ，React Hooks 中还提供了缓存函数的钩子。当我们需要往 useEffect 中执行函数时，我们就可能会需要使用到它。具体使用方式与 useMemo 类似，这里不再赘述。

## 优势与不足

### 优势

#### 易于复用

在使用 Class Component 的时候，我们大多数情况下会使用高阶组件或者 render props 的方式进行逻辑复用，但使用这两种方式所能进行的复用范围有限，跟生命周期函数相关的逻辑没有办法抽象。

反观 React Hooks，我们可以通过组合 useState 和 useEffect 自定义 hook 来实现状态与生命周期的逻辑复用，而 Hook 之间还可以互相嵌套组合。

#### 代码更少

由于是函数，因此不再需要通过 this 来进行取值与执行函数，不在需要使用烦人的 bind(this) 来绑定组件中的函数。修改状态也不再需要 setState，而是通过 useState 返回的 setter 来进行更新 state。

#### 逻辑统一

使用 Class Component 时，我们常常会将相关的逻辑代码分散写在各个生命周期函数中。而使用 React Hooks 之后就可以将相关的逻辑写在一起，方便后期的维护与扩展。

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Took <a href="https://twitter.com/dan_abramov?ref_src=twsrc%5Etfw">@dan_abramov</a>&#39;s code from <a href="https://twitter.com/hashtag/ReactConf2018?src=hash&amp;ref_src=twsrc%5Etfw">#ReactConf2018</a> and visualised it so you could see the benefits that React Hooks bring us. <a href="https://t.co/dKyOQsG0Gd">pic.twitter.com/dKyOQsG0Gd</a></p>&mdash; Pavel Prichodko (@prchdk) <a href="https://twitter.com/prchdk/status/1056960391543062528?ref_src=twsrc%5Etfw">October 29, 2018</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

### 不足

#### 依赖调用顺序

实现方式使然，React Hooks 只能在组件的最顶层使用。不能在循环，条件或者函数内的函数中调用 Hook。总而言之就是，Hook 的调用顺序必须在每次调用函数组件时都相同。

#### 需要正确的依赖

除了 useState, useReducer 之外，大部分的 Hook 都是需要写依赖列表的。useEffect 之类的 Hook 需要根据所给的依赖列表来判断是否需要执行。因此，如果依赖没有写对，可能会没有办法达到预期，或者是产生多余的渲染。

也是因为 React Hooks 的这些不足，我们需要使用 [eslint-plugin-react-hooks - npm](https://www.npmjs.com/package/eslint-plugin-react-hooks) 来确保我们不会犯错。

## 最后

以上我们总结了 React Hooks 带来的改变以及其优势与不足，对于 React Hooks 是否值得使用，回答是必然的。React Hooks 虽有些不足，但整体上能够为我们提供更加灵活的逻辑组织与复用方式。虽然带来便利的同时也带来了一些问题，但就目前来说这些问题无关大雅，未来也会随着 React 的更新而进一步解决，拭目以待吧。

## 扩展阅读

- [React hooks: not magic, just arrays - Rudi Yardley - Medium](https://medium.com/@ryardley/react-hooks-not-magic-just-arrays-cd4f1857236e)
- [React Today and Tomorrow and 90% Cleaner React With Hooks - YouTube](https://www.youtube.com/watch?v=dpw9EHDh2bM)
- [Getting Closure on React Hooks by Shawn Wang | JSConf.Asia 2019 - YouTube](https://www.youtube.com/watch?v=KJP1E-Y-xyo)
