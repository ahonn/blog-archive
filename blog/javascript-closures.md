---
layout: post
title: JavaScript 作用域与闭包
date: 2016-04-04
---

## 作用域

在 JavaScript 中变量的作用域与其他语言不同，JavaScript 的作用域不是由 `{}` 来界定，而是函数。所以循环实际上是在全局作用域中。

```js
for (var i = 0; i < 10; i++) {}

console.log(i); // 10
```

### 全局变量 & 局部变量

JavaScript 变量的作用域分为两种，全局和局部。

在 JavaScript 中声明全局变量有两种方式，一种是在全局环境下使用 `var` 声明，另一种是在任何地方直接初始化变量，那么它将会是全局变量。

<!--more-->

```js
var name = 'ahonn'; // 全局变量

function f1() {
  name = 'ahonn'; // 还是全局变量
}
```

除了在任意地方直接初始化声明全局变量这一特殊之处外，JavaScript 全局变量还可以在函数内部直接读取。

```js
var name = 'ahonn';

function f1() {
  console.log(name);
}

f1(); // 'ahonn'
```

在函数中使用 `var` 定义的变量为局部变量。因为 JavaScript 的作用域是由函数界定，那么理所当然的函数外部是无法读取函数内部的局部变量。这一点其实其他的编程语言也是这样的。

```js
function f1() {
  var name = 'ahonn';
}

console.log(name); // Error
```

### 作用域链

作用域链的原理与原型链很类似。在某个环境中为了读取变量时，会沿着作用域链来搜索这个变量，从作用域链的前端开始，向上级搜索。如果在当前局部环境中没有找到该变量，则继续沿作用域链向上搜索，直到最顶层。搜索到该变量时将停止搜索，如果到最后还是没有找到该变量，那么意味着这个变量是未定义的，即它的值为 `undefined`。

```js
var a = 'a';

function f1() {
  var b = 'b';
  console.log(a + b);
}

f1(); // 'ab'
```

在这个例子中，在全局环境中定义了全局变量 a，然后在函数中定义了局部变量 b。函数通过 `console.log` 输出 a + b。

首先在当前的局部环境中搜索变量 a 的值，没有找到。那么继续向上一级搜索，在全局环境中找到标识符为 a 的变量的值 'a'。接着在局部环境中搜索变量 b，得到局部变量 b 的值 'b'。最后输入变量 a 和 b 的值拼接后的字符串的值。

## 闭包

函数外部无法读取函数内部定义的局部变量，所以当我们需要读取局部变量时就需要使用到闭包。

那么闭包是什么呢？我的理解是函数返回一个局部作用域来使得函数外部能够读取函数内部的变量。因为 JavaScript 中作用域的界定是由函数来完成的，所以实际上也就是在函数中再返回一个函数。闭包将函数内外给联系了起来。

```js
function f1() {
  var name = 'ahonn';
  return function () {
    console.log(name);
  };
}

var f2 = f1();
f2(); // 'ahonn'
```

一般情况下，当函数执行后，函数所在的局部环境将被销毁，也就是说函数在执行后函数中的变量是会被销毁的，在内存中就仅存在全局环境，即全局变量。

但是使用闭包的情况又有所不同，在函数内部定义的匿名函数会包含函数（外部函数，即包含匿名函数的函数）中的变量。在外部函数执行完毕后，原本应该被销毁的局部变量不会被销毁，因为闭包的作用域链仍然在引用这些局部函数，内存的垃圾回收机制不会回收这部分变量所在的内存空间。直到匿名函数被销毁后，这些局部对象才会被销毁。

### 内存泄漏

由于闭包使得函数中的局部变量不会被垃圾回收机制回收，会依然存在于内存中，所以使用闭包的内存消耗很大，所以大量的使用闭包会造成性能问题。另外，在 IE 中可能会导致内存泄漏。解决方法是在退出函数前将不使用的局部变量全部删除。

```js
function f1() {
  var e = document.getElementById('id');
  var id = e.id;

  e.onclick = function () {
    alert(id);
  };

  e = null; // 删除不使用的局部变量值，只将需要的 id 保存为副本
}
```
