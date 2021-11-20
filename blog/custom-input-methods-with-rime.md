---
layout: post
title: 用 RIME 定制输入法
date: 2020-01-30
---

一直以来我都希望能够有一款输入法能够让我高度的进行自定义，就像 Vim 一样能通过配置文件来进行配置。发现 Rime 正好符合我的需求，加上最近在学习双拼，便折腾了起来。

## 什么是 RIME？

[RIME（中州韻）](https://rime.im/) 是一款高度定制化，开源的跨平台输入法引擎，可以通过配置文件来配置几乎所有的一切。

Rime 在不同的平台上有不同的输入法前端实现，在 macOS 上的发行版称为「鼠鬚管」。可以在网站上下载安装，但我更推荐通过 brew cask 来进行安装：
`brew cask install squirrel`。

![鼠鬚管 / 朙月拼音](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/OOQtiK.jpg)

默认情况下使用的「朙月拼音」拼音输入法，可以通过默认的快捷键 control + \` 来进行输入法的切换或设置符号全半角、繁简转换等。

## 开始定制

在 RIME 中，所有的配置都是在 yaml 文件中进行配置的，macOS 上的配置在 `~/Library/Rime` 文件夹下，用户定制的配置一般有以下这几种：

- `default.custom.yaml` 全局配置
- `<发行版>.custom.yaml` 发行版配置
- `<输入方案>.custom.yaml` 指定输入方案的配置
- 用户自制的输入方案以及字典配置

另外的其他配置文件及其作用可以看这里：[RimeWithSchemata · rime/home Wiki · GitHub](https://github.com/rime/home/wiki/RimeWithSchemata#rime-%E4%B8%AD%E7%9A%84%E6%95%B8%E6%93%9A%E6%96%87%E4%BB%B6%E5%88%86%E4%BD%88%E5%8F%8A%E4%BD%9C%E7%94%A8)

修改输入法配置后需要重新部署输入法才能让配置生效，macOS 上可以在状态栏右侧点击输入法后，点击部署。

![重新部署输入法](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/rFz7yT.png)

### 定制外观

定制外观一般情况下会在 `<发行版>.custom.yaml` 文件中进行配置，macOS 下是 `squirrel.custom.yaml`。由于默认的输入法使用的是竖排显示，我习惯的是横排显示，在配置文件中修改为横排显示：

```yaml
# squirrel.custom.yaml
patch:
style:
horizontal: true
```

即使修改为横排显示看起来依然很丑，但是没关系，RIME 给我们提供了一些内置的输入法配色：[squirrel/squirrel.yaml](https://github.com/rime/squirrel/blob/master/data/squirrel.yaml)。这里我使用内置的「純粹的本質／Purity of Essence」这个配色，在 `squirrel.custom.yaml` 里加上 `color_scheme` 的配置，再额外调整一下样式：

```yaml
# squirrel.custom.yaml
patch:
  style:
    color_scheme: purity_of_essence
    horizontal: true
    inline_preedit: true
    font_point: 16
    corner_radius: 5
    candidate_format: "%c\u2005%@ \u2005"
```

使用横排显示以及内置配色之后：

![純粹的本質 / 朙月拼音](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/O2HU7B.png)

如果内置的配色不喜欢的话，也可以自行自定义配色方案，通过 RIME 文档中提供的[配色方案工具](https://gjrobert.github.io/Rime-See-Me-squirrel/)可以方便快捷的生成配置代码。

### 输入方案

在 RIME 中要实现某种具体的输入法（五笔、注音或双拼等），需要用数据来描述该输入法如何工作，称为输入方案。

RIME 提供了一些常见的输入方案[^1]，由于最近我在使用小鹤双拼，因此这里我安装 [rime-double-pinyin](https://github.com/rime/rime-double-pinyin)。这是 RIME 提供的双拼输入方案，其中包括我需要的小鹤双拼。

官方推荐使用 [東風破 /plum/](https://github.com/rime/plum) 来进行配置管理，这里使用它来安装 RIME 的双拼输入方案。把東風破安装到 `~/Library/Rime` 下，并安装 rime-double-pinyin：

```bash
git clone --depth 1 https://github.com/rime/plum.git ~/Library/Rime/plum
bash ~/Library/Rime/plum/rime-install double-pinyin
```

在用户全局配置（`default.custom.yaml`）中添加输入新输入方案即可：

```yaml
# default.custom.yaml
patch:
  schema_list:
    - schema: double_pinyin_flypy
    - schema: luna_pinyin
```

这样就可以通过 control + \` 来切换到小鹤双拼（实际上并不需要进行切换，schema_list 中的第一个输入方案将会默认启用）。

![切换输入方案](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/YphsLz.png)

如果常见的输入方案无法满足，甚至可以自己自定义输入方案[^2]。

### 快捷键绑定

到目前为止，除了配色更自由之外，整个输入法跟系统自带的输入法区别并不是很大。接下来是我最喜欢的部分，可以通过配置绑定自定义快捷键。不同于其他的输入法软件，RIME 自定义快捷键的自由度非常大。

因此能够自定义出 Vim 风格的快捷键，control + j/k 上下翻页，control + h/l 左右选择等。在用户全局配置（`default.custom.yaml`）中添加以下配置即可：

```yaml
# default.custom.yaml
patch:
	# 其他配置...
	key_binder:
		bindings:
      	- { when: has_menu, accept: "Control+k", send: Page_Up }
      	- { when: has_menu, accept: "Control+j", send: Page_Down }
      	- { when: has_menu, accept: "Control+h", send: Left }
      	- { when: has_menu, accept: "Control+l", send: Right }
```

甚至可以添加快捷键来快速选取第二、第三个候选词并输入，按`;`输入第二个候选词，而按`'`输入第三个候选词：

```yaml
# default.custom.yaml
patch:
	# 其他配置...
	key_binder:
		bindings:
			# 其他快捷键绑定...
      	- { when: has_menu, accept: ";", send: 2 }
      	- { when: has_menu, accept: "'", send: 3 }
```

`accept` 与 `send` 可接受的字段非常的丰富[^3]，基本上满足任何自定义需求。

### 自定义词库

既然是定制输入法，当然少不了自定义词库了。这里我使用 [rime-aca/dictionaries](https://github.com/rime-aca/dictionaries) 来作为基础词库，在这个基础之上再增加自己自定义的词库。

在 RIME 中其实词库也是一个 yaml 文件，遵循 rime-aca/dictionaries 的 README 中的使用方法，将以下的几个文件复制到 `~/Library/Rime` 中：

- luna_pinyin.hanyu.dict.yaml
- luna_pinyin.cn_en.dict.yaml
- luna_pinyin.extended.dict.yaml
- luna_pinyin.poetry.dict.yaml

再创建一个 `squirrel.dict.yaml` 文件作为自己的词库（由于双拼与拼音使用的词库相同，因此我把自定义的词库命名为 squirrel）。

```yaml
# squirrel.dict.yaml
---
name: squirrel
version: "2020-01-30"
sort: by_weight
use_preset_vocabulary: true
import_tables:
  - luna_pinyin
  - luna_pinyin.extended
	- luna_pinyin.cn_en
  - luna_pinyin.hanyu
  - luna_pinyin.poetry
...

JavaScript	js	1000
```

如上所见，我在自己的词库中加了一条`JavaScript js 1000`，意思是在输入法中输入 js 将会显示 JavaScript 作为候选。**词库中的每行内容以 Tab 分隔各列，各列依`词<Tab>码<Tab>词频<Tab>造次码`定义排列。**

如果仅仅是添加以上文件输入法是不会生效的，还需要在对应的输入方案中指定使用该词库：

```yaml
# double_pinyin_flypy.custom.yaml
patch:
  translator:
    dictionary: squirrel
```

重新部署输入法即可生效。

### Emoji 支持

Emoji 作为日常聊天中不可或缺的元素，自然也是不能忘记的，配置 Emoji 支持非常简单。只需要使用東風破运行以下命令即可：

```bash
bash ~/Library/Rime/plum/rime-install emoji
bash ~/Library/Rime/plum/rime-install emoji:customize:schema=double_pinyin_flypy
```

这样就能够通过语义直接在输入法候选框中显示 Emoji 并输入了。

![输入 Emoji](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/MYutMC.png)

Tips: 如果想要在候选框中不显示 Emoji 后的提示文字，将 emoji_suggestion.yaml 中的 tips 注释掉即可。

## 总结

第一阶段的定制基本上到这里就告一段落了，实际上可以定制的点还非常的多。推荐阅读 RIME 官方的 [定制指南](https://github.com/rime/home/wiki/CustomizationGuide) 和 [输入方案设计书](https://github.com/rime/home/wiki/RimeWithSchemata) 来进一步的定制。

定制完之后使用上可能会有一段时间的适应期，RIME 需要慢慢的改进配置才能达到令人满意的程度，就像 Vim 一样，习惯了之后就会离不开它。但有个无法解决的问题是用其他人的电脑上的输入法的话会很不习惯，特别是在习惯了自定义的快捷键之后。

对于我来说，我是非常喜欢这种高度定制化的输入法的。至于值不值得去长期折腾，各位看官可以尝试之后自行判断。

## 参考

- [安装及配置 Mac 上的 Rime 输入法——鼠鬚管 (Squirrel) | 明无梦](https://www.dreamxu.com/install-config-squirrel/)
- [最新版 Rime 输入法使用 - jdhao's blog](https://jdhao.github.io/2019/02/18/rime_configuration_intro/)
- [简单聊聊 Rime 的使用](https://www.notion.so/Rime-60b321a98b5b493192dd15e405a0365b)
- [鼠须管输入法的新配色](https://scomper.me/gtd/shu-xu-guan-shu-ru-fa-de-xin-pei-se)

[^1]: 東風破 Plum Packages: https://github.com/rime/plum/blob/master/README.md#packages
[^2]: RIME 輸入方案創作者的第一本參考書: https://github.com/rime/home/wiki/RimeWithSchemata
[^3]: 自定义快捷键 accept 和 send 可用字段: https://github.com/LEOYoon-Tsaw/Rime_collections/blob/master/Rime_description.md#%E4%B8%83%E5%85%B6%E5%AE%83
