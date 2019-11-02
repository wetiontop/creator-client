var _global;
if (typeof window === 'undefined') {
    _global = global;
} else {
    _global = window;
}
_global.G = _global.G || {};

// 基础
require('BaseInit').init(G);

// // 平台
require('PlatformInit').init(G);

// // 模块
require('ModuleInit').init(G);