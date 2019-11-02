const WechatAuthorize = require('WechatAuthorize');
const WechatAdvert = require('WechatAdvert');
const WechatPay = require('WechatPay');

module.exports = {
    init () {
        WechatAuthorize.init();
        WechatAdvert.init();
        WechatPay.init();
    }
};