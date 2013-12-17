选课神器
======

## 运行环境

* [NodeJS](http://nodejs.org) 0.10.X
* [MariaDB](http://mariadb.org)(建议) 或 MySQL(http://www.mysql.com)

## 安装

```
$ git clone https://github.com/xingrz/biaozi.git
$ cd biaozi
$ npm install
```

## 调试

```
$ make debug
```

## 上线

```
$ make
$ cd ..
$ NODE_ENV=production PORT=8080 pm2 start biaozi
```

## 贡献

这个只是我利用空闲时间写出来的小项目，难免存在许多 BUG 和不足。欢迎各位小伙伴提出意见或帮忙实现功能。

上报错误、提建议或者咨询请[新建 Issue](https://github.com/xingrz/biaozi/issues/new)。

目前已知错误以及因为时间等原因尚未实现的功能详见[此处](https://github.com/xingrz/biaozi/issues?state=open)，提交 Pull Request 时请尽量顺便引用一下原 Issue。

## 协议

本项目基于 GPL v2 协议开源，总的来说就是你可以下载、修改或重新发布它的源代码，但需要继续将你修改的版本开源并维持原有协议。详情请见 [LICENSE](LICENSE) 文件。
