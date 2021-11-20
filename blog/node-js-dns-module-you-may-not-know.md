---
layout: post
date: 2019-08-12
title: 你可能不知道的 Node.js dns 模块
---

作为 Node.js 的内置模块之一，dns 模块日常的使用率并不高。但在某些情况下 dns 模块却是非常有用的，例如在需要通过 Node.js 来判断本地网络是否畅通；或者在某些[高并发的情况](https://cnodejs.org/topic/5bc20c1f15e4fd1923f48eb1)下，可以手动通过 dns 模块进行查询并缓存之后，再进行请求发送。

所以 dns 模块还是有必要好好了解了解的，毕竟说不定什么时候就用上了呢？

## 解析

作为一个合格的 dns 模块，必然是需要具备 DNS 解析的功能了。在 dns 模块中，用于解析的函数分为两种，一种是通过使用底层操作系统工具进行本地域名解析，且无需进行网络通信。而另一个则是通过连接 DNS 服务器进行域名解析。

### 本地解析

本地解析顾名思义就是不进行网络请求来进行解析，一般用来查看本地请求某个域名时，对应的 IP 地址是什么。dns 模块中通过 `dns.lookup()`方法来进行本地域名解析，解析的过程类似于 `ping`。

#### dns.lookup(hostname[, options], callback)

```js
const dns = require('dns');

dns.lookup('ahonn.me', (err, address, family) => {
  if (err) {
    throw err;
  }
  console.log('address: %s, family: IPv%s', address, family);
});

// address: 151.101.100.133, family: IPv4
```

可以通过函数的第二个参数 options 来进行解析的设置，例如能够传入 `{ all: true }`，来获取所有的解析结果（包括 IPv4 与 IPv6）。

### 网络解析

除了 `dns.lookup()` 之外，dns 模块中的其他函数都是通过网络进行 DNS 解析。其中最主要的一个方法就是: `dsn.resolve()`。

#### dns.resolve(hostname[, rrtype], callback)

```js
const dns = require('dns');

dns.resolve('ahonn.me', (err, records) => {
  if (err) {
    throw err;
  }
  console.log(records);
});

// [ '151.101.100.133' ]
```

该方法通过二个参数可以指定解析的资源记录类型，默认为 ’A’，即返回 IPv4 地址。如果想返回所有的资源纪录类型的值，可以通过 `dns.resolveAny()` 来获取。

#### dns.resolveAny(hostname, callback)

```js
const dns = require('dns');

dns.resolveAny('ahonn.me', (err, records) => {
  if (err) {
    throw err;
  }
  console.log(records);
});

/* [ { address: '151.101.100.133', ttl: 369, type: 'A' },
     { value: 'dns10.hichina.com', type: 'NS' },
     { value: 'dns9.hichina.com', type: 'NS' },
     { entries:
      [ 'google-site-verification=j5dWC85DkoAfUR50W00ewfii3X9ouH55HnyBP6oZxGE' ],
      type: 'TXT' },
     { nsname: 'dns9.hichina.com',
       hostmaster: 'hostmaster.hichina.com',
       serial: 2015090709,
       refresh: 3600,
       retry: 1200,
       expire: 3600,
       minttl: 360,
       type: 'SOA' }] */
```

与此同时，模块还提供了一些与资源记录类型绑定的函数，用于单独获取某资源记录类型的值。例如 `dns.resolve4()`，`dns.resolve6()`与`dns.resolveCname()` 等。

### 反向解析

一般情况下我们所说的 DNS 解析指的是正向解析，即通过域名查询 IP 地址。那么既然有正向解析就必然有反向解析了（rDNS）。dns 模块中同样提供了方法来进行反向查询，通过 IP 地址查找对应的域名。

#### dns.reverse(ip, callback)

```js
dns.resolve('google.com', (err, addresses) => {
  if (err) {
    throw err;
  }
  addresses.map((ip) => {
    dns.reverse(ip, (err, hostnames) => {
      if (err) {
        throw err;
      }
      console.log(ip, hostnames);
    });
  });
});
```

> TIPS: 在命令行中我们可以通过 `nslookup -qt=ptr <IP>` 来查看该 IP 地址反向解析的结果信息。

还需要注意的是大多数 IP 地址都没有做反向域名解析，设置反向解析需要找对应的服务器 IP 提供商进行设置。如何为服务器 IP 地址添加反向解析可参考这篇文章：[为服务器 IP 添加反向 DNS 解析 | 祁劲松的博客 👨‍💻](https://jamesqi.com/%E5%8D%9A%E5%AE%A2/%E4%B8%BA%E6%9C%8D%E5%8A%A1%E5%99%A8IP%E6%B7%BB%E5%8A%A0%E5%8F%8D%E5%90%91DNS%E8%A7%A3%E6%9E%90)。

反向解析主要应用到邮件服务器中来阻拦垃圾邮件，若邮件发送者的 IP 地址没有设置反向解析则将其视为垃圾邮件。

## 设置 DNS 服务器

默认情况下 DNS 服务器的 IP 地址是由网关进行分配的，但我们也可以设置为我们想使用的 IP 地址。比较有名的是国内通用的 114.114.114.114 以及 Google 的 8.8.8.8。

### dns.setServers(servers)

Dns 模块可以通过 dns.setServers()来设置模块使用哪些 DNS 服务器进行解析。例如我们将 dns 模块使用的 DNS 服务器设置为 8.8.8.8。

```js
const dns = require('dns');

dns.setServers(['8.8.8.8']);
dns.resolove('ahonn.me', (err, records) => {
  if (err) {
    throw err;
  }
  console.log(records);
});
```

### dns.Resolver()

另外我们也可以通过 dns.Resolver()进行独立的设置 DNS 服务器 IP 地址，这样就不会影响 dns 模块的默认 DNS 服务器配置。 dns.Resolver() 的实例拥有与 dns 模块相同的 lookup, resolve 等方法。

```js
const { Resolver } = require('dns');

const resolver = new Resolver();
resolver.setServers(['8.8.8.8']);
reslover.reslove('ahonn.me', (err, records) => {
  if (err) {
    throw err;
  }
  console.log(records);
});
```

通过 dns 模块中的反向解析可以判断是否为垃圾邮件之外，正向解析可以定时向指定的 DNS 服务发送请求进行 DNS 解析，用来确认当前是否连接到网络（网络断开的情况下必然是没有办法通过网络进行 DNS 解析）。

```js
const { Resolver } = require('dns');

function internetAvailable() {
  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8']);
  reslover.reslove('google.com', (err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
}
```

## 参考资料

- [javascript - Node.js dns.resolve() vs dns.lookup() - Stack Overflow](https://stackoverflow.com/questions/40985367/node-js-dns-resolve-vs-dns-lookup)
- [DNS 中的正向解析与反向解析](https://blog.csdn.net/jackxinxu2100/article/details/8145318)
- [关于反向域名解析（Reverse DNS）](https://penpenguanguan.com/322.html)
- [为服务器 IP 添加反向 DNS 解析](https://jamesqi.com/%E5%8D%9A%E5%AE%A2/%E4%B8%BA%E6%9C%8D%E5%8A%A1%E5%99%A8IP%E6%B7%BB%E5%8A%A0%E5%8F%8D%E5%90%91DNS%E8%A7%A3%E6%9E%90)
- [nodejs 检测因特网是否断开方案 - 掘金](https://juejin.im/post/5cb5d6d6518825324f68cb20)
