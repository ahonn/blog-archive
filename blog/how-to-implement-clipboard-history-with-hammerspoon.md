---
layout: post
title: 如何使用 Hammerspoon 实现剪贴板历史
date: 2019-04-30
featured: true
---

## 写在前面

[Hammerspoon](http://www.hammerspoon.org/) 是一款 macOS 下的自动化工具，软件本身几乎没有什么功能。所有的功能都需要以 lua 脚本的形式编写，放置在 ~/.hammerspoon 下。Hammerspoon 会通过 lua 脚本直接调用 macOS 本地提供的 API，从而实现我们想要的功能。

网上的文章大多都是关于使用 Hammerspoon 实现窗口管理，快速启动之类的功能，而实际上 Hammerspoon 提供的 [API](http://www.hammerspoon.org/docs/index.html) 非常强大，还能够实现蓝牙 / Wifi 的监听，系统剪贴板控制之类的功能。

本文将通过 Hammerspoon 提供的相关 API，编写 lua 脚本一步一步实现类似 Alfred / LaunchBar 剪贴板历史的功能。

(为了方便，我们把本文的代码直接写在 ~/.hammerspoon/init.lua 中。)

## 创建交互界面

hammerspoon 提供 [hs.chooser](http://www.hammerspoon.org/docs/hs.chooser.html) 来创建一个可选择，可搜索的交互界面（类似 Alfred）。我们可以通过 `hs.chooser.new(completionFn)` 创建，并传入一个 completionFn 函数来处理选择或者取消。

```lua
clipboard = hs.chooser.new(function (choice)
  print(choice)
end)
```

以上只是创建了一个 chooser 对象，我们需要通过 `chooser:show()` 才能将界面显示出来。这里我们需要绑定快捷键来触发。

## 绑定快捷键

绑定快捷键理所应当的在 hammerspoon 的 API 里面躺着，我们可以通过使用 [hs.hotkey.bind](http://www.hammerspoon.org/docs/hs.hotkey.html#bind) 来进行绑定。这里我们绑定 cmd + shift + v 来触发显示剪贴板历史：

```lua
hs.hotkey.bind({ "cmd", "shift" }, "v", function ()
  clipboard:show()
end)
```

重新加载 hammerspoon 配置后，按 cmd + shift + v 将会显示一下界面。

![](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/a09u7.png)

由于我们没有设置可选择的数据，所以理所当然的界面上什么都没有。给 chooser 添加数据需要通过 `hs.chooser:choices(choices)` 来设置，具体怎么设置我们稍后再将。

现在我们要来监听系统剪贴板，并获取剪贴版中的数据添加到我们的剪贴板历史中。

## 监听系统剪贴板

我们可以使用 [hs.pasteboard](http://www.hammerspoon.org/docs/hs.pasteboard.html) 来操作系统系统剪贴板，但 hs.pasteboard 并没有提供监听系统剪贴板相关的方法。所以我们需要自己来实现剪贴板监听。

通过一番搜索之后可以发现，大多数都是通过轮询对比剪贴板的 `changeCount` 来判断剪贴板是否有变化的。

- [https://github.com/chbrown/pbwatch/blob/master/pbwatch.py#L14](https://github.com/chbrown/pbwatch/blob/master/pbwatch.py#L14)
- [https://github.com/hxfdarling/clipboard-watch/blob/master/src/darwin.js#L15](https://github.com/hxfdarling/clipboard-watch/blob/master/src/darwin.js#L15)

所以我们就如法炮制的也这样做，这里需要使用 [hs.timer](http://www.hammerspoon.org/docs/hs.timer.html) 来创建一个定时任务：

```lua
local preChangeCount = hs.pasteboard.changeCount()
local watcher = hs.timer.new(0.5, function ()
  local changeCount = hs.pasteboard.changeCount()
  if preChangeCount ~= changeCount then
    addHistoryFromPasteboard()
    preChangeCount = changeCount
  end
end)
watcher:start()
```

OK，整个壳子都搭起来了。接下来我们要做的是当系统剪贴板有新的内容的时候加到我们的剪贴板历史中（上面的 `addHistoryFromPasteboard()`函数），以供快捷键唤起 chooser 的时候显示。

## 获取剪贴板中的内容

```lua
local history = {}
function addHistoryFromPasteboard()
  local contentTypes = hs.pasteboard.contentTypes()
  print(hs.inspect.inspect(contentTypes))
end
```

这里我们需要了解一下 [UTI](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/understanding_utis/understand_utis_intro/understand_utis_intro.html)，即统一类型标示符。通过上面代码中的 `hs.pasteboard.contentTypes()`，我们可以拿到系统剪贴板中第一项（即我们复制之后剪贴板中储存的）的 UTI table。我们需要根据这个 UTI table 来判断剪贴板中储存的是文本，图片还是文件。

可以看到我在 print 中使用了 [hs.inspect.inspect](http://www.hammerspoon.org/docs/hs.inspect.html#inspect) 来打印。这是因为 contentTypes 的值是一个 table，单纯的使用 print 的话无法打印出 table 的具体值，而 hs.inspect 能够返回更加友好的字符串，方便 debug。

上面的代码在进行文本复制之后会在 hammerspoon console 中显示：

![uti](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/tik0o.png)

为了方便，我们只处理文本。其他类型如何处理可以查看我的 dotfiles 中的 [clipboard.lua](https://github.com/ahonn/dotfiles/blob/8a847d88f141da68e377220795f89bf1cd99947b/hammerspoon/modules/clipboard.lua#L60)。

经过几次复制的测试之后，可以发现复制文本后打印出来类型都会包括 `public.utf8-plain-text`，因此我们就可以在剪贴板第一项返回包含该类型时，将内容当作文本处理。

```lua
local history = {}
function addHistoryFromPasteboard()
  local contentTypes = hs.pasteboard.contentTypes()

  local item = {}
  for index, uti in ipairs(contentTypes) do
    if uti == "public.utf8-plain-text" then
      local text = hs.pasteboard.readString()
      item.text = string.gsub(text, "[\r\n]+", " ")
      item.content = text;
      break
    end
  end

  table.insert(history, 1, item)
end
```

以上代码当复制内容的 contentTypes（UTI table）中包含 “public.utf8-plain-text” 时，我们把内容当作文本进行处理。通过 `hs.pasteboard.readString()` 来读取系统剪贴板中的字符，并把对应的内容插入 history 中。

这时我们复制文本内容之后使用快捷键调出剪贴板历史其实也是看不到内容的，我们还没有把保存的 history 回显到 chooser 中。

## 显示历史数据

回到 `clipboard:show()` 之前，我们要把 history 塞进去让 clipboard 能够显示数据。

```lua
hs.hotkey.bind({ "cmd", "shift" }, "v", function ()
  clipboard:chioces(history) -- 设置可选择的值，即 history
  clipboard:show()
end)
```

我们来尝试复制一段文字，并使用快捷键唤起剪贴板历史：

![](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/okeb3.png)

实际上 [hs.chooser:chioes()](http://www.hammerspoon.org/docs/hs.chooser.html#choices) 传入的值还可以包含另外两个字段：

- subText: 显示在 text 下面（可以显示复制的内容所做应用或者复制的时间之类的）
- image: 可以传入 image 对象，并显示在 text 前面（也就是上图中的箭头位置）

还差最后一步，这里我们即使选择了文本也是不会执行粘贴到操作的。因此我们还需要实现一下这部分的逻辑。

## 选择后进行黏贴

```lua
clipboard = hs.chooser.new(function (choice)
  if choice then
    hs.pasteboard.setContents(choice.content)
    hs.eventtap.keyStroke({ "cmd" }, "v")
  end
end)
```

这里的逻辑就非常简单了，只要把选择的项内容设置到系统剪贴板中，再触发 cmd + v 进行黏贴就可以了。但这里有一个小缺陷，选择对应的项之后进行 `hs.pasteboard.setContents()` 会让 changeCount 改变，进而将相同的一条记录添加到 history。这里可以对复制的内容进行判断一下，或者将旧纪录删除（相当于当前选择的项提到最前面）。

## 总结一下

总的来说，通过 hammerspoon 我们可以轻松的定制实现自己的剪贴板历史。本文只是通过简单的实现文本的剪贴板历史来阐述如何使用 hammmerspoon 编写脚本为自己服务。

作为剪贴板历史，只能纪录文本显然是不合格的。关于如何实现图片/文件或者其他增强的功能，这里就不再赘述了。大概实现过程其实跟文本差不多，有兴趣的可以看看我自己用的 [dotfiles/clipboard.lua](https://github.com/ahonn/dotfiles/blob/8a847d88f141da68e377220795f89bf1cd99947b/hammerspoon/modules/clipboard.lua) 是怎么实现的。

最后，本文的代码可以在 [ahonn/hammerspoon-clipboard.lua](https://gist.github.com/ahonn/32d129428c9213ccf0c29a42c6aa714f) 查看。

## 参考

- [Hammerspoon API Documentaion](http://www.hammerspoon.org/docs/index.html)
- [Introduction to Uniform Type Identifiers Overview](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/understanding_utis/understand_utis_intro/understand_utis_intro.html)
