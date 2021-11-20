---
layout: post
date: 2021-03-13
title: 使用 Telegram Bot + Beancount 记账
---

由于最近听的捕蛇者说的这期播客节目[^1]，去了解了一下经常听到但是从来没去了解过的 [Beancount](https://github.com/beancount/beancount)，看了几篇网上的博文 [^2][^3]初步使用了几天。Beancount 的记账模式我非常的喜欢，但是美中不足的是基于文本很难能够进行随手记录。

发现了一款需要注册的 Beancount 应用，但和我想象中的不太一样，我希望的是能够通过 iCloud 读取 Beancount 文本并且进行快速的添加记录的应用。然后发现了[一篇博文](https://blog.stdioa.com/2020/09/using-beancount/)讲到通过 Telegram Bot 来进行记账的方式，看起来非常的靠谱。发现这种方式也不错，于是就开始了折腾起来。

首先，第一个问题是如何在 Telegram 里面方便的进行记录，如果是输入 beancount 语法的话就会非常的麻烦：

```txt
2021-03-13 * "Ahonn.me" "赞助 Ahonn 买一杯咖啡"
  Expenses:Blog:Donate 20 CNY
  Liabilities:CreditCard:CMB -20 CNY
```

原先是打算自己写一个 parser 来通过简化的语义命令来转换为 Beancount 的，偶然间发现了 [Costflow Parser](https://www.costflow.io/docs/parser/)，简直就是我所需要的，节省了写 parser 的工作。虽然 Costflow 是可以 Self-Hosted 的，但是作为爱折腾的我来说，这种事情是我可以自己折腾的。

有了方便输入的文本格式转换之后，第二个问题就是怎么写 Telegram Bot，这里我通过 [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) 来实现：

```typescript
import TelegramBot from 'node-telegram-bot-api';

const token = 'YOUR_TELEGRAM_BOT_TOKEN';
const bot = new TelegramBot(token, { polling: true });
```

Telegram Bot 的 Token 可以很容易的通过 `@BotFather` 这个机器人来得到[^4]。然后这里又遇到了问题，Telegram Bot 是有两种实现的方式：一种是通过设置 polling 来进行轮训消息处理；另一种是通过 webhook 的方式让 Telegram Bot 有输入的时候进行触发。这里我选择了我更喜欢的 webhook 的方式，好处是说不定未来还可以通过其他的方式（IFTTT 之类的）来触发。

作为 [Vercel](https://vercel.com/dashboard) 的无脑粉丝自然是希望能够将机器人部署在 Vercel 上了。搜索了许久终于找到 [Build a serverless Telegram chatbot deployed using Vercel](https://www.marclittlemore.com/serverless-telegram-chatbot-vercel/) 这篇文章，无脑照做。于是就变成了下面这样：

```typescript
import TelegramBot from 'node-telegram-bot-api';
import costflow from 'costflow';

const config = {
  mode: 'beancount',
  currency: 'CNY',
  timezone: 'Asia/Hong_Kong',
  account: {
    信用卡: 'Liabilities:CreditCard:CMB',
    捐赠: 'Expenses:Blog:Donate',
    // ...
  },
};

module.exports = async (req: NowRequest, res: NowResponse) => {
  const bot = new TelegramBot(BOT_TOKEN);

  const { message } = req.body;

  if (message) {
    const {
      chat: { id },
      text,
      message_id,
    } = message as TelegramBot.Message;

    try {
      const { output } = await costflow.parse(text, config);
      bot.sendMessage(id, output, { reply_to_message_id: message_id });
    } catch (e) {
      bot.sendMessage(id, e.message, {
        reply_to_message_id: message_id,
      });
    }
  }

  res.send('OK');
};
```

发布到 Vercel，设置对应的机器人的 webhook[^4]，大功告成！按照 Cosflow 的语法在 Telegram 的机器人上进行输入：`给 ahonn.me 捐赠 20 CNY 信用卡 > 捐赠` 就可以得到对应的记录文本了。

## 更新 beancount 文件

在 Telegram 的机器人入口搞定了，那么现在要解决的就是存储的问题。如果 beancount 文件存放在本地，机器人很难能够进行更新。所以最后决定把 beancount 文件放在 GitHub 上，这样就可以通过 webhook 来添加记录，本地 git pull 更新之后就可以愉快的使用 [fava](https://github.com/beancount/fava) 进行可视化查看。

一切都非常的顺利，GitHub 对应的操作只需要生成一个 personal access tokens 配合 [octokit](https://github.com/octokit/core.js) 就可以了：

```typescript
const response = await octokit.request(
  'GET /repos/{owner}/{repo}/contents/{path}',
  {
    owner: OWNER,
    repo: REPO,
    path: 'txs/2021.bean',
  },
);

const { content: encodeContent, encoding, sha, path } = response.data;
const content = Buffer.from(encodeContent, encoding).toString();

await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
  path,
  sha,
  owner: OWNER,
  repo: REPO,
  message: text!,
  content: Buffer.from(`${content}${output}\n\n`).toString('base64'),
});
```

在 Telegram 进行记录，同时 GitHub 上的 beancount 文件也有了一个新的提交，完工！

![Telegram Beancount Bot](https://ahonn-me.oss-cn-beijing.aliyuncs.com/images/ZxxOF2.jpeg)

[^1]: [特别篇 04] - 四位主播的无主题闲聊: https://pythonhunter.org/episodes/sp04
[^2]: Beancount —— 命令行复式簿记: https://wzyboy.im/post/1063.html
[^3]: Beancount 复式记账（一）：为什么: https://byvoid.com/zhs/blog/beancount-bookkeeping-1/
[^4]: How do I create bot: https://core.telegram.org/bots#3-how-do-i-create-a-bot
[^5]: Telegram Bot setWebhook: https://core.telegram.org/bots/api#setwebhook
