# babel-plugin-san-hmr

将 JavaScript 文件的 San component 添加 HMR 功能。目前支持写法如下：

```js
// 1.
import {Component} from 'san';
import './app.css';

export default class App extends Component {
    constructor(opts) {
        super(opts);
    }
    static template = '<h1>Hello, World~</h1>';
}
// 2.
import san from 'san';
import './app.css';

export default class App extends san.Component {
    constructor(opts) {
        super(opts);
    }
    static template = '<h1>Hello, World~</h1>';
}
```

## 使用方式

```js
// webpack
//...
loader: require.resolve('babel-loader'),
options: {
    // ...
    plugins: [
        require('babel-plugin-san-hmr')
    ]
}
```
