# webpack-project-snippet

将项目中所有导出的变量写入 vscode 代码片段，输入变量名会提示变量所在路径

# note

仅开发环境使用

## Getting Started

To begin, you'll need to install `webpack-project-snippet`:

```console
npm install webpack-project-snippet --save-dev
```

or

```console
yarn add -D webpack-project-snippet
```

or

```console
pnpm add -D webpack-project-snippet
```

Then add the plugin to your `webpack` config. For example:

**webpack.config.js**

```js
const webpackProjectSnippet = require("webpack-project-snippet");

module.exports = {
  plugins: [new webpackProjectSnippet()],
};
```

# 使用说明

如果 src(别名@)下有一个文件 build.js 导出如下变量

```js
module.exports = {
  a: 'a'
};

export const b = 'b'

export funciotn c() {}
```

输入 a 会提示 import build from '@/build.js'
输入 b 会提示 import {b} from '@/build.js'
输入 c 会提示 import {c} from '@/build.js'

# 使用问题

新建文件导出的变量，因为还未被 webpack 收集到依赖中，需要引入新增文件之后下次更新才能使用
