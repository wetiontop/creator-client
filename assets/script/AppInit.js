var _global;
if (typeof window === 'undefined') {
    _global = global;
} else {
    _global = window;
}
_global.app = _global.app || {};

// 第三方
require('TPInit').init(_global);

// 基础
require('BaseInit').init(app);

// 平台
require('PlatformInit').init(app);

// 模块
require('ModuleInit').init(app);