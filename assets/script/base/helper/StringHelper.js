
module.exports = {
    /**
     * 字符串转Buffer
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {ArrayBuffer}
     */
    toBuffer (str) {
        let buf = new ArrayBuffer(str.length * 2); // 每个字符占用2个字节
        let bufView = new Uint16Array(buf);
        for (let i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    },

    /**
     * 字符串转Uint8数组
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Uint8Array}
     */
    toUint8 (str){
        let arr = [];
        for (let i = 0, j = str.length; i < j; ++i) {
            arr.push(str.charCodeAt(i));
        }

        return new Uint8Array(arr);
    },

    /**
     * 字符串转utf8字符数组
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Array}
     */
    toUtf8 (str) {
        let back = [];

        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i);
            if (0x00 <= code && code <= 0x7f) {
                back.push(code);
            } else if (0x80 <= code && code <= 0x7ff) {
                back.push((192 | (31 & (code >> 6))));
                back.push((128 | (63 & code)));
            } else if ((0x800 <= code && code <= 0xd7ff) || (0xe000 <= code && code <= 0xffff)) {
                back.push((224 | (15 & (code >> 12))));
                back.push((128 | (63 & (code >> 6))));
                back.push((128 | (63 & code)));
            }
        }

        for (let i = 0; i < back.length; i++) {
            back[i] &= 0xff;
        }

        return back;
    },

    /**
     * 验证输入的字符串是否是有效的IP地址
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Boolean}
     */
    isIP (str) {
        let re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return re.test(str);
    },

    /**
     * 判断是否是有效的端口（0～65535）
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Boolean}
     */
    isPort (str) {
        let re = /^([0-9]|[1-9]\d|[1-9]\d{2}|[1-9]\d{3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/;
        return re.test(str);
    },

    /**
     * 验证输入的字符串是否是域名
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Boolean}
     */
    isDomain (str) {
        let re = /^(?=^.{3,255}$)[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$/;
        return re.test(str);
    },

    /**
     * 验证输入的字符串是否是URL
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Boolean}
     */
    isUrl (str) {
        let strRegex = '^((https|http|ftp|rtsp|mms)?://)'
            + '?(([0-9a-z_!~*().&=+$%-]+: )?[0-9a-z_!~*().&=+$%-]+@)?' // ftp的user@
            + '(([0-9]{1,3}.){3}[0-9]{1,3}' // IP形式的URL- 199.194.52.184
            + '|' // 允许IP和DOMAIN（域名）
            + '([0-9a-z_!~*()-]+.)*' // 域名- www.
            + '([0-9a-z][0-9a-z-]{0,61})?[0-9a-z].' // 二级域名
            + '[a-z]{2,6})' // first level domain- .com or .museum
            + '(:[0-9]{1,4})?' // 端口- :80
            + '((/?)|' // a slash isn't required if there is no file name
            + '(/[0-9a-z_!~*().;?:@&=+$,%#-]+)+/?)$';
        let re = new RegExp(strRegex);
        return re.test(str);
    },

    /**
     * 验证输入的EMAIL格式是否正确
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Boolean}
     */
    isEmail (str) {
        let re = /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
        return re.test(str);
    },

    /**
     * 验证输入的手机号码是否正确
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Boolean}
     */
    isMobile (str) {
        let re = /^1[3456789]\d{9}$/;
        return re.test(str);
    },

    /**
     * 验证输入的昵称格式是否有效 正确格式为：只能中英文，数字，下划线，减号
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Boolean}
     */
    isNickname (str) {
        let re = /^[\u4e00-\u9fa5A-Za-z0-9-_]*$/;
        return re.test(str);
    },

    /**
     * 判断是否是真实姓名，2-4个中文
     *
     * @author libo
     * @date 2019-06-21
     * @param {String} str
     * @returns {Boolean}
     */
    isRealName (str) {
        let re = /^[\u4E00-\u9FA5]{2,4}$/;
        return re.test(str);
    },

    /**
     * 验证输入的密码格式是否有效 正确格式为：以字母开头，长度在6-18之间，只能包含字符、数字和下划线
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Boolean}
     */
    isPassword (str) {
        let re = /^[a-zA-Z]\w{5,17}$/;
        return re.test(str);
    },

    /**
     * 验证输入的身份证号格式是否有效（15位或18位数字）
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Boolean}
     */
    isIdCard (str) {
        let re = /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
        return re.test(str);
    },

    /**
     * 替换字符串中所有相同的字符串
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @param {String} original 要替换的字符串
     * @param {String} target 替换后的字符串
     * @param {Boolean} ignoreCase 忽略大小写
     * @returns {Boolean}
     */
    replaceAll (str, original, target, ignoreCase) {
        if (!RegExp.prototype.isPrototypeOf(original)) {
            return str.replace(new RegExp(original, (ignoreCase ? 'gi' : 'g')), target);
        } else {
            return str.replace(original, target);
        }
    },

    /**
     * 获取文件名
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {String}
     */
    getFileName (str) {
        var re = /(.*\/)*([^.]+).*/ig;
        return str.replace(re, '$2');
    },

    /**
     * 获取文件扩展
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {String}
     */
    getFileExtension (str) {
        var re = /.+\./;
        return str.replace(re, '');
    },

    /**
     * 获取文件全名（文件名+扩展）
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {String}
     */
    getFileFullName (str) {
        var re = /\.\w+$/;
        return str.replace(re, '');
    },

    /**
     * 获取字符串的字节数
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} str
     * @returns {Number}
     */
    byteLength (str) {
        var len = 0;
        for (var i = 0, n = str.length; i < n; i++) {
            var c = str.charCodeAt(i);
            if ((c >= 0x0001 && c <= 0x007e) || (0xff60 <= c && c <= 0xff9f)) {
                len += 1;
            } else {
                len += 2;
            }
        }
        return len;
    }
};