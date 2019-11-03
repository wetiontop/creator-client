
module.exports = {
    init (ns) {
        // 加密
        ns.MD5 = require('md5');
        ns.XXTEA = require('xxtea');

        // 协议
        ns.SPROTO = require('sproto');
    }
};