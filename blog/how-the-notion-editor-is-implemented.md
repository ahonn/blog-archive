---
layout: post
title: 'Notion 编辑器是怎么实现的？'
date: 2021-03-25
---

> 本文写于 2020 年 12 月，当你读到本文时文中提到的部分 Notion 内容可能已经过时，望读者知晓

Notion 是一款 All in one 的协作工具，集个人笔记，知识管理以及项目管理于一身。作为一个笔记软件爱好者自然早闻大名，早在两年前就开始使用 Notion 进行知识管理、文章协作等，可以说对 Notion 的各种使用姿势了然于心。但是作为开发者，我却从来没有关注过 Notion 是怎么实现的，特别是核心的编辑器部分。

因此，笔者花了些时间查看 Notion 的代码，结合浏览器提供的调试工具对 Notion 的编辑器进行了分析研究，主要聚焦在文本编辑，大概的了解到了 Notion 的编辑器实现以及其编辑器的不足。在此分享一下研究的成果。

## TL;DR

- 以 Block 为基本单位，Block 中可能拥有编辑区域也可能没有，Block 间相互独立。
- 布局排版功能简单，依赖浏览器的 Flex 弹性布局，复杂排版不好实现。
- Block 中的编辑区域由 contenteditable div 实现的，但不使用 document.execCommand。
- 编辑器视图层使用 React，但自行实现了渲染队列以及页面刷新逻辑。
- 进行编辑操作时会产生 transaction，并且执行其中的 opeartions 来对 block 的数据进行更改。
- 富文本样式通过特定的数据格式与文本保存在一起，会根据数据结构来拼接 HTML 重新渲染到 Block 中。
- 编辑区域内的光标和选区由 contenteditable div 控制，拥有独特的 Block 选区以及奇怪的选区逻辑。
- 复制粘贴不解析单行文本的样式当作纯文本处理，多行文本才会对样式进行解析。内部复制粘贴 Block 或者文本有特殊的逻辑，但内部粘贴 Block 时依赖网络拉取数据。
- 撤销和重做采用栈的方式存储，通过指针来获取撤销或者重做时要执行的操作。

## 编辑区域

![contenteditable 实现编辑](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/I0lEI8.png)

可以看到在 Notion 的编辑器中，每一段的文字都在单独的 Block 中，而且每个 Block 中的编辑区域都是由 contenteditable div 实现的。因此，我们很容易想到选区的处理会受到限制，跨 Block 的选区不太好处理。

而如果是图片或者是其他嵌入的内容的话，Block 就直接由 DOM 进行呈现，没有编辑区域。

![图片 Block](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/GypIyz.png)

无编辑区域的 Block 与其他的 Block 相互独立，因此也不要做常见的在 contenteditable div 中添加零宽字符为光标占位的做法。光标控制逻辑相对简单，降低了编辑器的实现难度。

## 布局排版

不同于 Word 之类强大的布局排版功能，Notion 的布局排版功能相对简单。从 DOM 的结构上可以看到，Notion 的布局排版依赖浏览器的 Flex 弹性布局，当两个 Block 并排时会使两个 Block 均匀平铺，拉动调整两个 Block 的宽度占比后，Block 数据中会保存当前的宽度占比，并且更新 div 上的 width。

![Flex 弹性布局](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/L9s6Tv.png)

因此，如果想要某一个 Block 靠右对齐显示的话，就需要在左侧拖入一个空白的 Block 并调整宽度，从而将目标 Block 挤到右边。

## 文字输入

在输入文本时，Notion 会在 Block 的文字编辑区域（即 contenteditable div）上监听对应的事件，然后对不同的情况使用不同的方式来处理 Block 的数据，在处理完成之后对 Block 中的内容进行更新。

这里 Notion 实现了一套自己的渲染逻辑，虽然从技术栈上可以发现视图层主要使用的是 React，但是更新视图的逻辑却不是正常的 React 渲染逻辑。Notion 会通过不同的事件触发，将执行组件`forceUpdate` 的函数保存到一个队列中，并且在编辑操作之后对队列顺序执行以更新视图。

从代码中还可以发现，在 Notion 中进行的每一次编辑操作都会产生一个叫做 transaction 的对象来对相关的数据进行变更。transaction 中包含了两个字段用来描述需要对数据进行的操作，其中 operations 字段表示的是本次编辑需要执行的操作，而另一个 InvertedOperations 则是对本次编辑需要执行的操作的逆操作。（很容易发现 InvertedOperations 是用于撤销的，这个我们后面再进行讨论）

举个例子，我们在 Block 中有「123」这三个字符，当我们在其后添加「4」时，通过监听 onInput 事件会产生如下 transaction：

![transaction 结构](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/pLjnQG.png)

如框中所示，文本编辑操作所生成的 transaction 中包含一个 operations 数组。该数组中有一个将 id 为 "4393d1a7-301e-4d6a-bf45-55e907e33215" 的 properties.title（这个字段用于保存文本 Block 的值） 更新为 「1234」 的 set 操作。

在通过 transaction 对 Block 的数据进行了变更之后，会触发渲染队列的执行，进行页面的渲染。在 Block 编辑区域中有对应的逻辑，会在重新渲染时根据 Block 的数据重新生成 DOM 并进行替换。

![编辑区域更新](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/0Jh57U.png)

由此我们可以知道，在 Notion 中对某个文本 Block 进行编辑时，会对现有的 Block 中的值进行重新设置。因此，理论上单个 Block 中如果进行非常大的文本编辑的话，每次编辑操作都会重新赋值并渲染，这可能会导致页面比较卡。

所以在 Notion 中采取了换行后新建 Block 的方式来避免过长的文本 Block 出现。

### 换行创建新 Block

按照 Notion 的逻辑，在文本输入框中进行换行/回车时将在当前 Block 后创建新的 Block，并且将焦点移动都新创建的 Block 中。所以在 Notion 中会拦截 onEnter 事件，并且生成一个所对应的 transaction 执行，在执行后重新渲染。

换行时产生新 Block 的 transaction 的结构如下所示：

![创建新 Block 时的 operations](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/SsC8ot.png)

可以看到换行这一操作将产生一个包含 4 个 operation 的 transaction，按照顺序分别是：

- set：创建一个有新的 id 的 Block， 并且类型为 text，版本为 1
- update：更新新 Block 的 parent_id 和 parent_table 等来关联到当前的文档
- listAfter：将新的 Block 移动到输入换行的 Block 后
- set：设置新 Block 的 properties.title 为空（即空白的文本 Block）

Notion 中基本上所有的操作都会产生包含 operations 的 transaction，其中 opeartions 是对本次操作细粒度的拆分。如果对此有兴趣的话可以在 Notion 的代码中搜索 “commit” 或者 “createAndCommit” 来断住对应的点查看产生的 transaction。

## 格式化

格式化文本时与普通的文本编辑类似，也是通过拦截事件生成 transacation 来修改 Block 的数据。Notion 会在 window 上监听所有的按键操作，不同的按键被按下的时候会根据光标位置的不同，来执行不同的快捷键集合中的某一个处理函数。

以加粗文本为例，我们可以在 Notion 的代码中添加断点。可以看到如下调用栈：

![格式化调用栈](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/TNj7rw.png)

即可以看到生成的 transaction 如下：

![格式化数据结构](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/GK0GJO.png)

其中包含了一个 command 为 set 的操作，将文本 Block 的 properties.title 设置为 `"[["this is a "],["bold",[["b"]]],[" text"]]"`。由此我们可以知道，Notion 中对文本格式化相关的信息也保存在 properies.title 中，并且是以 `[[TEXT, [FORMAT, FORMAT, ...]], TEXT, ...]` 的形式进行保存的。相同的格式化信息会产生相同的数据结构，从而使得编辑器在渲染的时候能够有相同的 DOM 结构，避免 contenteditable 在不同的 DOM 结构中光标行为不一致的问题。

因此，我们可以知道，虽然 Notion 中使用了 contenteditable div 来实现编辑区域，但是编辑区域中的格式化并没有使用 `document.execCommand`，而是自己实现了相关逻辑，兼容性更好。

对应不同的文本格式化信息，Notion 中使用了不同的标记来表示，例如上面加粗使用的是`b`。我们可以在 Notion 的代码中看到这一信息：

![不同的格式化信息标记](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/kVFN6O.png)

## 光标和选区

由于 Notion 在 Block 的编辑区域是通过 contenteditable 实现的，所以在编辑区域的光标是浏览器原生实现的。

而选区比较特殊，当选区的区域是在 Block 编辑区域内时，使用的是 contenteditable 自带的选区逻辑。而当选区跨两个 Block 时会转为 Notion 自己实现的选区逻辑，即选区起点和终点在不同的 Block 时会变成选中这两个 Block。

![独立 Block 选区](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/XtlqKY.gif)

Notion 的选区逻辑

可以看到，当选中的区域超过了 Block 编辑区域的范围时，将会在当前 Block 对应的 DOM 中添加一个 `div.notion-selectable-halo` 来高亮 Block。如果继续将选区扩大到其他的 Block 时也是相同的逻辑，会直接高亮选中的 Block。

代码中主要是通过监听全局的鼠标事件来实时判断 Block 是否需要显示高亮并选中。除了普通的鼠标框选选区之外，在将 Block 拉拽到另一个 Block 中时也会高亮选区。

![拖拽选中高亮选区](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/dESGqk.png)

- shouldShowSelectionHala 用于判断是否需要在框选 Block 时高亮显示
- shouldShowDropParentHalo 用于判断是否需要在拖拽 Block 到另一个 Block 中时高亮显示

值得注意的是，Notion 中鼠标框选 Block 时相同的 y 座标在不同的 x 座标下的表现不相同，而不是直觉上的框选的概念。

![特殊的拉拽框选逻辑](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/2U2rsK.gif)

## 复制粘贴

粘贴富文本进入 Notion 时，除了处理常见的 `text/uri-list` / `text/plain` / `text/html` 之外，还对处理由 Notion 内部复制粘贴过来的`text/_notion-blocks-v2-production` 和 `text/_notion-text-production` 以及从 Office 中复制过来的数据。

![复制粘贴数据处理](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/9sBc1t.png)

从 `clipboardData` 中拿到各种格式的数据之后会经过一系列的判断。如果是从外部粘贴过来的话，则会先判断格式为 `text/plain` 的文本是否包含换行符 `/n` 。若是，则会对 `text/html` 的数据进行处理，通过解析 HTML 来还原大部分的文本格式。但如果不包含换行符（即单行富文本），则会直接当成文本进行粘贴，丢弃的富文本的样式。

因此，如果从外部粘贴单行文本，不管是否有富文本格式，Notion 都统一当做无样式的文本进行处理。只有多行文本才会解析 HTML 来添加对应的文本的富文本样式。从这点上来看，Notion 在粘贴富文本的实现上还有很大的优化空间。

**Notion 内复制粘贴 Block**

如果是从 Notion 内部复制过来的话会走特殊的逻辑，从 Notion 中复制表格或者任何 Block 时不会将表格的数据写入剪贴板，而是写入类似 `<meta charset='utf-8'><p><a href="https://www.notion.so/f746ffe6e9cc44bc93cb2e3d6a997991%22">测试表格</a></p>">` 的 HTML，以及格式为 `text/_notion-blocks-v2-production` 的 JSON 字符串。

![内部复制粘贴](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/68AJms.png)

对 Block 粘贴时会做不同的处理，执行如下 operation 来关联复制的 Block 后，通过接口（`api/v3/syncRecordValues` 等）拉去 Block 中的其他数据（例如表格 Block 中的列格式、行数据等）。

```json
{
  "id": "3daf0bdd-aa46-47d9-a1db-456e59df3a74",
  "table": "block",
  "path": [],
  "command": "set",
  "args": {
    "type": "copy_indicator",
    "id": "3daf0bdd-aa46-47d9-a1db-456e59df3a74",
    "version": 1
  }
}
```

由于 Notion 内的 Block 复制粘贴需要依赖网络来关联所复制的 Block 以及同步 Block 相关的数据，所以在网页端离线断网的情况下，无法进行 Notion 内的 Block 粘贴：

![部分内部复制粘贴依赖网络](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/4AkSpw.png)

移动端 App 上做了不同的处理，在 App 上对文档的数据进行的储存，因此能够在离线的状态下对 Notion 内部的 Block 进行复制粘贴操作。

**Notion 内复制粘贴文本**

内部复制粘贴文本的处理与 Block 类似，也是在剪贴板中写入文本相关信息的 JSON 字符串。粘贴时会获取 `text/_notion-text-production` 格式的数据进行处理。

![复制粘贴文本](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/yP1jnr.png)

由于文本数据相对简单，因此在剪贴板中就能够获取到整个文本的数据，不需要发送请求获取具体的数据，网页端也能够进行离线编辑（但无法提及其他的页面）。

## 撤销重做

撤销重做实际上在上面的每个编辑操作中都有涉及，在提交 transaction 时包含的 invertedOperations 就是用来撤销操作的。每次编辑操作如果不是撤销操作的话，会将当前操作的 transaction 保存到 revisionStack 栈中，栈顶即为当前的最后一次操作。

![撤销重做](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/vqaPgB.png)

然后在进行撤销操作的时候会在 `revisionStack` 中获取对应的此前执行的 transaction，然后从中获取 invertedOperations 生成一个新的 transaction 去进行此前编辑操作的逆操作，并且会标记为 `canUndo: false` 避免添加到 revisionStack 中。

进行撤销操作后，指向 `revisionStack` 栈顶的指针 `currentIndex` 就会减一，指向倒数第二个非撤销的编辑操作。如果此时立即进行重做操作的话，就会取之前栈顶的 transaction （即 currentIndex - 1）再执行一次。而如果是在撤销操作后进行其他编辑操作的话，那么 `revisionStack` 做 slice 处理（即抛弃当前指针前的操作），然后把当前的其他编辑操作添加到栈顶并在指针指向栈顶。

## 最后

在研究 Notion 的代码的过程中还发现了许多有意思的事情，例如 Database 实际上只是在 Block 中包含了 Block，表格中的每一行都是一个 Block。这样做的好处是，能够方便的实现不同的展现形式（例如现在 Notion 有的看板、甘特图视图等）。由于篇幅原因以及时间的原因，没有办法一一的列举。

Notion 基于 Block 为单位的设计方式非常的棒，通过这种方式理论上能够方便的接入任何第三方的数据进行展示，拓展性非常的好。但从细节上来看，Notion 目前有些功能的实现还是相对粗糙的，有很大的优化空间。

本篇文章分享了我短时间的研究，在更多的细节方面目前还没有涉及。如果有机会的话，后面会继续研究并分享关于 Notion 的更多实现细节。
