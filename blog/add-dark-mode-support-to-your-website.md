---
layout: post
title: 为网站添加 dark mode 支持
date: 2019-12-01
---

本文主要介绍如何通过 prefers-color-scheme 来为网站添加 dark mode 支持，另外还赠送一些 prefers-color-scheme 在 tailwind.css 与 React 中的实践。

那么 prefers-color-scheme 到底是什么呢？

## 什么是 prefers-color-scheme 呢？

prefers-color-scheme 是一个用于检测用户的系统主题是浅色或深色的 CSS 媒体查询特征。prefers-color-scheme 的取值可以是以下三种：

- no-preference：表示用户未指定操作系统主题
- light: 表示用户的操作系统是浅色主题
- dark: 表示用户的操作系统是深色主题

例如我们可以通过以下代码来让某些 CSS 样式在用户的操作系统为深色主题的情况下被使用：

```css
@media (prefers-color-scheme: dark) {
  .text {
    background: back;
    color: white;
  }
}
```

这样我们就可以通过添加某些样式让网站在深色系统下显示得更友好。（如果你现在用的是深色系统看到的本站就是黑色背景的，反之则为白色背景）。

### 兼容性

![https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/khhuy.png](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/khhuy.png)

可以看到支持该特性的浏览器并不是非常广泛，但这关系不大。作为 dark mode 的支持目前可以算是锦上添花的功能，在不支持该特性的浏览器上也能够退化到默认的样式上。兼容性的问题并不会妨碍我们使用它，可以放心食用。

(BTW，实测在微信中 prefers-color-scheme 特性无效)

### 番外：Tailwind 中的技巧

如果你的网站使用了 [Tailwind CSS](https://tailwindcss.com/)（例如本站），那么恭喜你，我们可以通过简单的配置让 Tailwind CSS 支持通过类似以下代码支持 dark mode。

```html
<div class="bg-white dark:bg-black">
  <!--things-->
  <div></div>
</div>
```

我们只需要在 `tailwind.config.js` 中[添加自定义媒体查询](https://tailwindcss.com/docs/breakpoints/#custom-media-queries)即可：

```js
module.exports = {
  theme: {
    extend: {
      screens: {
        // highlight-start
        dark: { raw: '(prefers-color-scheme: dark)' },
        light: { raw: '(prefers-color-scheme: light)' },
        // highlight-end
      },
    },
  },
};
```

## 在 JavaScript 中获取

如果我想要 JavaScript 中获取 prefers-color-scheme 的话，应该怎么做呢？我们可以通过

[window.matchMedia](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/matchMedia) 来进行对应的媒体查询。例如查询当前操作系统是否为深色主题：

```js
// 是否为深色主题
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

使用 JavaScript 的方式能够让我们与 localStorage 配合实现类似操作系统中的主题自动/手动切换。

### 番外：useAppearance

以在 React 中为栗子，我们可以仿照 macOS 中的设置系统主题创建一个名为 useAppearance 的 hook：

```js
import React from 'react';

function useAppearance() {
  const isAuto = (val) => !val || val === 'auto';

  const getAppearance = (value) => {
    let appearance = value || window.localStorage.getItem('appearance');
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (isAuto(appearance)) {
      return mql.matches ? 'dark' : 'light';
    }
    return value;
  };

  const [state, setState] = React.useState(getAppearance);
  const setStateWithLocalStorage = (value) => {
    window.localStorage.setItem('appearance', value);
    setState(getAppearance(value));
  };

  React.useLayoutEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addListener((e) => {
      let appearance = window.localStorage.getItem('appearance');
      if (isAuto(appearance)) {
        setState(mql.matches ? 'dark' : 'light');
      }
    });
  }, []);

  return [state, setStateWithLocalStorage];
}

export default useAppearance;
```

<iframe     src="https://codesandbox.io/embed/61sup?fontsize=14&hidenavigation=1&theme=dark&view=preview"     style="width:100%; height:300px; border:0; border-radius: 4px; overflow:hidden;"     title="useAppearance"     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"   ></iframe>

点击 light/dark 会切换到对应的样式，而点击 auto 按钮后则会根据操作系统的主题颜色的改变而改变样式，可以尝试改变系统的主题颜色来看看具体效果。

## 扩展阅读

- [Hello darkness, my old friend](https://web.dev/prefers-color-scheme/)
- [让你的网站支持 macOS 和 IOS 的深色模式](https://zhih.me/website-darkmode-on-macos/)
