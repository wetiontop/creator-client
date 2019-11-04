
module.exports = {
    /**
     * 判断对象是否是字符串类型
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {object} obj
     * @returns {Boolean}
     */
    isString (obj) {
        return Object.prototype.toString.call(obj) == '[object String]';
    },

    /**
     * 判断对象是否是数字类型
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {object} obj
     * @returns {Boolean}
     */
    isNumber (obj) {
        return Object.prototype.toString.call(obj) == '[object Number]' && !isNaN(obj);
    },

    /**
     * 判断对象是否是布尔类型
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {object} obj
     * @returns {Boolean}
     */
    isBoolean (obj) {
        return Object.prototype.toString.call(obj) == '[object Boolean]';
    },

    /**
     * 判断对象是否是数组类型
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {object} obj
     * @returns {Boolean}
     */
    isArray (obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    },

    /**
     * 判断对象是否是字典类型
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {object} obj
     * @returns {Boolean}
     */
    isObject (obj) {
        return Object.prototype.toString.call(obj) == '[object Object]';
    },

    /**
     * 判断对象是否是未定义类型
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {object} obj
     * @returns {Boolean}
     */
    isUndefined (obj) {
        return Object.prototype.toString.call(obj) == '[object Undefined]';
    },

    /**
     * 判断对象是否是函数类型
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {object} obj
     * @returns {Boolean}
     */
    isFunction (obj) {
        return Object.prototype.toString.call(obj) == '[object Function]';
    },

    /**
     * 判断对象是否是空类型
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {object} obj
     * @returns {Boolean}
     */
    isNull (obj) {
        return Object.prototype.toString.call(obj) == '[object Null]';
    },

    /**
     * 判断对象是否是标志类型
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {object} obj
     * @returns {Boolean}
     */
    isSymbol (obj) {
        return Object.prototype.toString.call(obj) == '[object Symbol]';
    },

    /**
     * 拷贝对象
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {object} obj 仅支持 Number, String, Array, Object, Boolean
     * @returns {object}
     */
    clone (obj) {
        return JSON.parse(JSON.stringify(obj));
    }
};