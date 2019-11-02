// 微信小游戏平台的广告接入
module.exports = {
    // 初始化
    init (ns) {
        if (CC_EDITOR) {
            return;
        }

        ns.PlatformMgr = this.getPlatformMgr();
    },

    getPlatformParam () {
        var channel = this.getChannel();
        var sdk = this.getSDKConfig(channel);
        return {
            channel: channel,
            sdk: sdk
        };
    },

    getChannel () {
        let channel = 'browser';
        return channel;
    },

    getSDKConfig (channel) {
        return '';
    },

    getPlatformMgr () {
        var platformMgr;

        var param = this.getPlatformParam();
        switch (param.channel) {
            case 'wechat':
                platformMgr = require('WechatMgr').init(param.sdk); // 微信
                break;

            default:
                platformMgr = require('BrowserMgr').init(param.sdk); // 浏览器
                break;
        }

        return platformMgr;
    }
};