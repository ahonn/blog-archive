---
layout: post
title: 使用 TiddlyWiki 进行个人知识管理
date: 2020-05-30
---

近一段时间在研究个人知识管理，期望能够找到一个好用并且能够长期使用的「非线性笔记」软件来进行管理。近期比较火的 Roam Research 与 Notion 都尝试过，但可惜的是两者都有些地方我不是特别满意。最后我选择了 TiddlyWiki 来进行知识管理。

## 无法满足需求

理论上 Roam Research 是最符合我的需求的，但问题在于后续的收费价格过高（15 刀每月），并且手机上不管是看还是写都不是特别的友好。

而 Notion 多端的支持很不错，但是有一些小的点用起来还是特别难受。例如，笔记间相互链接不够方便（利用 database Relation 不好用，行内关键词无法直接链接到对应的笔记）；加载速度太慢，稍微大一点的 database 都需要转蛮久的菊花。

而且以上两者都或多或少的依赖网络，完全离线的状态下是不可用的。最后也是最重要的一点是，使用这些服务时数据需要储存在云端，太过脆弱。

## 我的需求

因此，对于个人知识管理软件我的需求有以下几点：

- 成本低（毕竟是要长期使用的）
- 网状组织结构，能够方便的在笔记间相互链接
- 能够离线使用，如果能够公开分享更好

通过了一番搜寻，发现了曾经嫌弃太丑的 TiddlyWiki 完全的符合需求，而且并不是印象中的那么丑。更棒的是 TiddlyWiki 完全免费！

![我的 TiddlyWiki](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/LMq7hQ.png)

## TiddlyWiki 特点

### 单 HTML 文件

单 HTML 文件，没有什么其他的东西，软件与数据本身都在其中，每次保存的使用会生成新的 HTML 文件。部署及其方便，如果需要公开笔记给其他人看只要将这个 HTML 文件丢到服务器上就可以了。

### 丰富插件与主题

作为一款十几年历史的软件，相关的插件非常的多，能够实现大多数想要的功能。而且还可以通过主题来解决长得丑的问题，再不济可以写些 CSS 样式来改造它。

### 强大的编辑能力

通过标签与条目间的互相引用可以非常灵活的进行整理，并且提供了一些非常强大的宏来实现一些复杂的功能（例如，列出某个标签下面按时间排序的最近 15 条日志条目）。

另外，通过 CodeMirror 插件还可以对编辑器进行增强，可以使用 emacs 或者是 vim 之类的 keymap，或者是添加代码高亮支持（BTW，Roam Research 对这方面的支持几乎为 0）

## 如何使用

由于 TiddlyWiki 是单 HTML 文件，所以一开始非常简单，只需要在官网上[下载空白](https://tiddlywiki.com/#GettingStarted)的文件，拖进浏览器中就可以使用了。但这样在保存的时候会比较麻烦，需要把生成的 HTML 文件（内容保存后的文件）保存下来或者是覆盖原来的 HTML 文件。

为了简化数据保存的步骤，TiddlyWiki 提供了[一些方案](https://tiddlywiki.com/#GettingStarted)，大概分成几种：通过服务端部署的方式自动进行保存、基于浏览器插件自动处理、使用专门的 Desktop 软件。

这里我使用的是 [TiddlyDesktop](https://tiddlywiki.com/#TiddlyDesktop) 软件的方式。我将 TiddlyWiki HTML 文件放到 iCloud 中，然后通过 TiddlyDesktop 进行编辑与保存。TiddlyDesktop 会在保存的时候将自动备份原文件，然后把修改后文件覆盖原文件，从而实现了数据保存。

由于放置在 iCloud (你可以选择你喜欢的同步方式)中，因此在不同的设备上都可以进行编辑、保存和同步，我唯一需要做的就是安装 TiddlyDesktop。

### 插件与主题

前面提到了 TiddlyWiki 上可以安装 CodeMirror 插件来增强编辑器，除此之外，TiddlyWiki 还有非常都的插件与主题可以使用。可以通过 [TiddlyWiki toolmap](https://dynalist.io/d/zUP-nIWu2FFoXH-oM7L7d9DM) 来找到需要的插件与主题，如果现有的插件不满足需求，我们还可以[通过 JavaScript 来编写自己的插件](http://tw5-zh.tiddlyspot.com/#Using%20ES2016%20for%20Writing%20Plugins)

![我使用的一些插件](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/18YKJx.png)

### 双向链接

Roam Research 最大的特点以及用的最舒服的功能就是双向链接了。因为在 TiddlyWiki 中也希望能够有类似的功能。幸运的是，社区已经有人做了，并且它可以通过插件的形式集成到现有的 TiddlyWiki 中。它就是 [Stroll](https://giffmex.org/stroll/stroll.html#Welcome%20to%20Stroll)（前身是 [TiddlyBlink](https://giffmex.org/gifts/tiddlyblink.html)），通过 TiddlyWiki 强大的宏来实现双向链接。

![Stroll 实现的双向链接](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/LdZ347.png)

### 使用控件与宏进行定制

除了使用插件来进行拓展之外，还使用内置的[控件](http://tw5-zh.tiddlyspot.com/#Widgets)或[宏](http://tw5-zh.tiddlyspot.com/#Core%20Macros)来进行定制。

通过控件，我们可以使用 `transclude` 控件来在条目里面动态的嵌入其他条目的内容；或者使用 `diff-text`控件展示两个条目直接的差异。通过使用 `tabs` 宏来把一些条目放到同一个条目中的标签里；使用 `copy-to-clipboard`宏来显示一个复制到剪贴版的按钮。

## 写在后面

目前来说，TiddlyWiki 基本满足我的需求，使用体验上来说与 Roam Research 类似，但又提供了更多的功能可以做更多的事情。当前我的使用模式是每天写日志，将看到的、学到的东西统统记录到里面，充当日记的角色，也充当 Wiki 的角色。

至于使用 TiddlyWiki 不足的地方可能还需要用多几个月后来回来补充。如果你有什么看法或者想法，欢迎留言交流\~

## 相关链接

- [号外：知识管理工具 - Λ-Reading](https://rizime.substack.com/p/d28)
- [使用 TiddlyWiki 打造轻便个人 Wiki 知识库 - 钉子の次元](http://blog.dimpurr.com/tiddly-wiki/)
- [TiddlyWiki 舞 — 基礎文件正體中文版](http://tw5-zh.tiddlyspot.com/)
- [TiddlyWiki toolmap - Dynalist](https://dynalist.io/d/zUP-nIWu2FFoXH-oM7L7d9DM)
