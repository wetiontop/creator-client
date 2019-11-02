
module.exports = {
    init (ns) {
        // 登录管理器
        ns.LoginMgr = require('LoginMgr').init();

        // 大厅管理器
        ns.LobbyMgr = require('LobbyMgr').init();

        // 游戏管理器
        ns.GameMgr = require('GameMgr').init();
    }
};