---
layout: post
date: 2015-11-22
title: phpmyadmin 缺少 mcrypt 扩展
---

今天重装了腾讯云上面的服务器，安装的是 Ubuntu server 14.04。搞完 apache2 + mysql + PHP 后，安装了 phpmyadmin 来作为数据库管理。
登录之后发现报错：缺少 mcrypt 扩展。上网查了一下，发现需要安装 php-mcrypt、libmcrypt、libmcrypt-devel 这三个。

#### 安装 mcrypt

    sudo apt-get install php-mcrypt libmcrypt libmcrypt-devel

安装后重启 apache2 服务器后发现依然报错，后面在网上找到了解决办法。原来是在`/etc/php5/apache2/conf.d`下缺少一个`20-mcrypt.ini`。该文件是`mcrypt.ini`的链接。
但是不知道是不是因为是版本不同的关系，这个文件的路径与搜索到的解决方案中不同。我的路径是：`/etc/php5/mods-available/mcrypt.ini`

<!--more-->

#### 链接 mcrypt.ini

    sudo ln -s /etc/php5/mods-available/mcrypt.ini 20-mcrypt.ini

这次重启 apache2 服务器后不报错了。

#### 重启 apache2

    sudo service apache2 restart
