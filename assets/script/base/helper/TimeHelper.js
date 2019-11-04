module.exports = {
    /**
     * 两个日期是否同一天
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Number} timeStampA 时间戳
     * @param {Number} timeStampB 时间戳
     * @returns {Boolean}
     */
    isSameDay (timeStampA, timeStampB) {
        let dateA = new Date(timeStampA);
        let dateB = new Date(timeStampB);
        return (dateA.setHours(0, 0, 0, 0) == dateB.setHours(0, 0, 0, 0));
    },

    /**
     * 两个日期是否同一周
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Number} timeStampA 时间戳
     * @param {Number} timeStampB 时间戳
     * @returns {Boolean}
     */
    isSameWeek (timeStampA, timeStampB) {
        let dateA = new Date(timeStampA).setHours(0, 0, 0, 0);
        let dateB = new Date(timeStampB).setHours(0, 0, 0, 0);
        var oneDayTime = 1000 * 60 * 60 * 24;
        var oldCount = parseInt(dateA / oneDayTime);
        var nowCount = parseInt(dateB / oneDayTime);
        return parseInt((oldCount + 4) / 7) == parseInt((nowCount + 4) / 7);
    },

    /**
     * 日期是否是今天
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Number} timeStamp 时间戳
     * @returns {Boolean}
     */
    isToday (str) {
        return new Date(str).toDateString() === new Date().toDateString();
    },

    /**
     * 日期自定义格式化
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {String} fmt 格式字符串
     * @param {Number} timeStamp 时间戳
     * @returns {String}
     */
    formatDate (fmt, timeStamp) {
        let ret;
        let date = new Date(timeStamp);
        let opt = {
            'Y+': date.getFullYear().toString(),        // 年
            'm+': (date.getMonth() + 1).toString(),     // 月
            'd+': date.getDate().toString(),            // 日
            'H+': date.getHours().toString(),           // 时
            'M+': date.getMinutes().toString(),         // 分
            'S+': date.getSeconds().toString()          // 秒
            // 有其他格式化字符需求可以继续添加，必须转化成字符串
        };
        for (let k in opt) {
            ret = new RegExp('(' + k + ')').exec(fmt);
            if (ret) {
                fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, '0')));
            }
        }
        return fmt;
    },

    /**
     * 日期是否是闰年
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Number} timeStamp 时间戳
     * @returns {Boolean}
     */
    isLeapYear (timeStamp) {
        let date = new Date(timeStamp);
        return (0 == date.getYear() % 4 && ((date.getYear() % 100 != 0) || (date.getYear() % 400 == 0)));
    },

    /**
     * 计算两个日期的时间差
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Number} timeStampA 时间戳
     * @param {Number} timeStampB 时间戳
     * @param {String} interval 时间差类型 s:计算秒差 n:计算分差 h:计算时差 d:计算日差 w:计算周差 m:计算月差 y:计算年差
     * @returns {Number}
     */
    diffDate (timeStampA, timeStampB, interval) {
        let dateA = new Date(timeStampA);
        let dateB = new Date(timeStampB);
        switch (interval) {
            // 计算秒差
            case 's': return parseInt((dateB - dateA) / 1000);
            // 计算分差
            case 'n': return parseInt((dateB - dateA) / 60000);
            // 计算時差
            case 'h': return parseInt((dateB - dateA) / 3600000);
            // 计算日差
            case 'd': return parseInt((dateB - dateA) / 86400000);
            // 计算周差
            case 'w': return parseInt((dateB - dateA) / (86400000 * 7));
            // 计算月差
            case 'm': return (dateB.getMonth() + 1) + ((dateB.getFullYear() - dateA.getFullYear()) * 12) - (dateA.getMonth() + 1);
            // 计算年差
            case 'y': return dateB.getFullYear() - dateA.getFullYear();
            // 输入有误
            default: return undefined;
        }
    }
};