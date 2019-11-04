
module.exports = {
    init (ns) {
        ns.ObjectHelper = require('ObjectHelper');
        ns.NumberHelper = require('NumberHelper');
        ns.StringHelper = require('StringHelper');
        ns.ArrayHelper = require('ArrayHelper');
        ns.TimeHelper = require('TimeHelper');
        ns.ViewHelper = require('ViewHelper');

        // 存储管理器
        ns.StorageMgr = require('StorageMgr').init();

        // 网络管理器
        ns.NetworkMgr = require('NetworkMgr').init();
    }
};