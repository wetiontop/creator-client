
module.exports = {
    init (ns) {
        // 存储管理器
        ns.StorageMgr = require('StorageMgr').init();

        // 网络管理器
        ns.NetworkMgr = require('NetworkMgr').init();
    }
};