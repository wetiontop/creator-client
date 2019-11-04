module.exports = {
    /**
     * 随机整数
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Integer} min 最小的整数
     * @param {Integer} max 最大的整数
     * @returns {Integer}
     */
    randomInt (min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }
};