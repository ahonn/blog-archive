---
layout: post
date: 2015-08-24
title: Ubuntu 下 LAMP环境搭建
---

## 安装

### 安装 apache2

```
$ sudo apt-get install apache2
```

### 安装 php 模块

```
$ sudo apt-get install php5
```

### 安装 Mysql

```
$ sudo apt-get install mysql-server
$ sudo apt-get install mysql-client
```

<!--more-->

### 安装其他模块

```
$ sudo apt-get install libapache2-mod-php5
$ sudo apt-get install libapache2-mod-auth-mysql
$ sudo apt-get install php5-mysql
$ sudo apt-get install php5-gd
```

### 测试 Apache

浏览器访问 [http://localhost/](http://localhost/)

页面显示 It Works！即为 Apache 服务器成功安装运行

### 修改权限

```
$ sudo chmod 777 /var/www/html
```

### 安装 phpmyadmin

```
$ sudo apt-get install phpmyadmin
```

安装过程选择 apache2,输入密码。

### 测试 phpmyadmin

```
$ sudo ln -s /usr/share/phpmyadmin /var/www/html
```

浏览器访问 [http://localhost/phpmyadmin](http://localhost/phpmyadmin),并登录。

## 配置

### 启用 mod_rewrite 模块

```
$ sudo a2enmod rewrite
```

启用后重启 Apache 服务器：

```
$ sudo service apache2 restart
```

### 设置 Apache 支持 .htm .html .php

```
$ sudo gedit /etc/apache2/apache2.conf&
```

打开并添加：`AddType application/x-httpd-php .htm .html .php`

### 测试 PHP 网页

在/var/www/html 下新建 mysql_test.php:

```php
<?php
$link = mysql_connect("localhost", "root", "password");
if(!$link)
  die('Could not connect: ' . mysql_error());
else
  echo "Mysql 配置正确!";
mysql_close($link);
?>
```

访问 [http://localhost/mysql_test.php](http://localhost/mysql_test.php)，显示“Mysql 配置正确”即完成
