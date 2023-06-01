# webpack-project-snippet

将项目中所有导出的变量写入 vscode 代码片段，输入变量名会提示变量所在路径

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
