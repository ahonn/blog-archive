---
layout: post
title: Jade 模板引擎
date: 2016-02-29
---

最近在改一个 Hexo 的主题 [apollo](https://github.com/pinggod/hexo-theme-apollo)。然后看到这个主题用的是叫做 Jade 的模版引擎写的。之前了解过几个模版引擎 ejs，swig 什么的，但是这些都是在原有的 HTML 中插标签，看起来有点乱。看到 Jade 后就深深的被它那如同 Python 的缩进语法深深吸引了，遂上网学习一发。

Jade 是 JavaScript 实现的，供 Node 使用，原生支持 Express。但也有 PHP，Python 等其他语言的实现。（要是 HTML 模版用 Jade，CSS 用 Styl，后端用 Python，那岂不是很好玩~全是缩进缩进缩进=。=）

### DOCTYPE

添加文档类型可以通过 `!!!` 或者 `doctype` 来添加。

<!--more-->

### 标签、属性

Jade 写起来就跟在 Sublime Text 中用 Emmet 写 HTML 一样。标签直接写，Class 用 `.`，ID 用 `#`。不同的是，层级关系 Jade 使用缩进表示，类似于 Python，而 Emmet 插件的写法是只有一行的。结果写出来就是这个样子滴：

```pug
doctype html
html
	head.class
    	title
    body#id
```

渲染出来的结果:

```html
<!DOCTYPE html>
<html>
  <head class="class">
    <title></title>
  </head>
  <body id="id"></body>
</html>
```

看起来超级简洁，而且都不需要去写闭合标签。不过比较需要注意缩进，坏处就是如果复制代码过来的话可能需要重新人脑格式化一下。

那么问题来了，其他属性怎么办？不是 Class 和 id 的话，就可以在 标签后面加个括号，写在括号里面。当属性值 `undefined` 或者 `null` 时，该属性将不会编译。

```pug
a(href="http://www.ahonn.me", class=null)
```

渲染为：

```html
<a href="http://www.ahonn.me></a>
```

这样就解决了其他属性的问题了~

### 文本

那么标签里的文本怎么写呢，so easy~ 只要跟在标签的后面就行了。Like this:

```pug
a(href="http://www.ahonn.me") Ahonn
```

渲染为：

```html
<a href="http://www.ahonn.me>Ahonn</a>
```

大段文本的话可以使用`|` 或者`.`：

使用 `|`：

```pug
p
  | one
  | two
  | there
```

使用`.`:

```pug
p.
  one
  two
  there
```

上面两种写法渲染后是不一样的，使用 `|` 的写法渲染后不会换行，而使用 `.` 会根据格式原样输出。

```html
<!-- 使用 | -->
<p>one two there</p>
<!-- 使用 . -->
<p>one two there</p>
```

在使用 `script`、`style`、`textarea` 等只包含文本标签时，可以不加前缀 `|`，

当需要在模版中写 JavaScript 时，推荐使用 `.`。

既然是 HTML 模版，那么一定是可以结合数据的。这时候，我们可以用 `#{}` 将变量包起来。这样的话 `#{}` 中的值将会被转义成对应的数据。

例如：

```pug
- var name = "ahonn"
p.
 My name is #{name}
```

渲染为：

```html
<p>My name is ahonn</p>
```

### 注释

jade 支持 HTML 的注释，即在 html 代码中能看到的注释，还有一种是 Jade 的注释，不会被渲染。

```pug
// HTML 注释
p foo
//- Jade 注释，这个注释只有在 .jade 文件中显示
p bar
```

渲染为：

```html
<!-- HTML 注释 -->
<p>foo</p>
<p>bar</p>
```

### 代码

在 Jade 中可以定义变量，写条件语句或者循环什么的，这时候就需要使用到 `-` 前缀，这不会被输出。 `-` 支持 JavaScript 的语法。

```pug
- var foo = 'bar';
- if (foo === 'bar')
- for (var key in obj)
  p= obj[key]
```

上面写的条件和循环语句是 JavaScript 中的写法，同时 Jade 也有自己的条件和循环语句。

**循环**：

```pug
- var items = ["one", "two", "there"]
each item, i in items
  li #{item}: #{i}
```

渲染为：

```html
<li>one: 0</li>
<li>two: 1</li>
<li>three: 2</li>
```

**条件**：

条件语句类似 Python，不需要加 `()`

```pug
for user in users
  if user.role == 'admin'
    p #{user.name} is an admin
  else
    p= user.name
```

Jade 支持转义和非转义输出，使用 `=` 时将会转义，而 `!=` 将会原样输出。

例如：

```pug
- var  ahonn = 'nnoha'
p= ahonn
p!= ahonn
```

渲染为：

```html
<p>nnoha</p>
<p>ahonn</p>
```

### 继承、包含

#### 继承

Jade 支持通过 `block` 和 `extends` 关键字老实现模版继承，`block` 部分将在子模块实现。

举个栗子 🌰：

layout.jade

```pug
!!!
html
  head
  	block title
  body
  	block content
```

index.jade

```pug
extends layout

block title
  title= ahonn

block content
  p.
    My name is ahonn.
    This is index.jade
```

index.jade 继承 layout.jade，layout 中的 block 部分将在子模版 index 中实现。

index.jade 渲染为：

```html
<DOCTYPE html>
  <html>
    <head>
      <title>ahonn</title>
    </head>
    <body>
      <p>My name is ahonn. This is index.jade</p>
    </body>
  </html></DOCTYPE
>
```

#### 包含

Jade 可以使用 `include` 静态包含其他文件

head.jade

```pug
head
  title!= ahonn
```

body.jade

```pug
body
  p.
    My name is ahonn.
    This is index.jade
```

index.jade

```pug
html
  include head
  include body
```

渲染结果将于上面继承的相同。

### Mixins

Mixins 相当于 JavaScript 中的函数，实际上 Mixins 在编译过程中就是被转换为 JavaScript 函数的。

不带参数的 🌰：

```pug
mixin list
  ul
	li foo
    li bar

h2!= Ahonn
+list()
```

渲染为：

```html
<h2>Ahonn</h2>
<ul>
  <li>foo</li>
  <li>bar</li>
</ul>
```

带参数的 🌰：

```pug
mixin list(items)
  ul
    - each item in items
      li= item

- var items = ["foo", "bar"]
h2!= Ahonn
+list(items)
```

渲染结果与上面无参数的 Mixins 相同。

### 总结

使用 Jade 写模版非常的简洁，各种 `include` 和 `extends` 使用起来也非常方便，可以模块化的去写各个组件。优点显而易见，对于我这种写 Python 的来说简直是大爱。不过可能这种写法相对于其他模版引擎来说差别较大，跟 HTML 代码的差别也挺大，所以相对来说也是比较少人去用了。而且用这个写的话，写的人来维护的倒是挺方便简洁，但是如果是其他人来维护的话还是比较难上手的，有点增加维护成本的感觉。不过我个人倒是挺喜欢的。
