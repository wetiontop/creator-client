module.exports = {
    /**
     * Buffer转字数组
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {ArrayBuffer} buffer
     * @returns {Uint8Array}
     */
    bufferToUint8 (buffer) {
        let v = new DataView(buffer, 0);
        let a = new Array();
        for (let i = 0; i < v.byteLength; i++) {
            a[i] = v.getUint8(i);
        }
        return a;
    },

    /**
     * Buffer转字符串
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {ArrayBuffer} buffer
     * @returns {string}
     */
    bufferToString (buffer) {
        return String.fromCharCode.apply(undefined, new Uint8Array(buffer));
    },

    /**
     * 数组转Buffer
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Uint8Array} arr
     * @returns {ArrayBuffer}
     */
    uint8ToBuffer (arr) {
        let b = new ArrayBuffer(arr.length);
        let v = new DataView(b, 0);
        for (let i = 0; i < arr.length; i++) {
            v.setUint8(i, arr[i]);
        }
        return b;
    },

    /**
     * Uint8数组转字符串
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Uint8Array} arr
     * @returns {String}
     */
    uint8ToString (arr){
        let dataString = '';
        for (let i = 0; i < arr.length; i++) {
            dataString += String.fromCharCode(arr[i]);
        }
        return dataString;
    },

    /**
     * utf8字符数组转字符串
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr
     * @returns {String}
     */
    utf8ToString (arr) {
        if (typeof arr === 'string') {
            return undefined;
        }

        let utf = '';
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] == undefined) {
                break;
            }

            let one = arr[i].toString(2);
            let v = one.match(/^1+?(?=0)/);
            if (v && one.length == 8) {
                let bytesLength = v[0].length;
                let store = arr[i].toString(2).slice(7 - bytesLength);

                for (let st = 1; st < bytesLength; st++) {
                    store += arr[st + i].toString(2).slice(2);
                }
                utf += String.fromCharCode(parseInt(store, 2));
                i += bytesLength - 1;
            } else {
                utf += String.fromCharCode(arr[i]);
            }
        }
        return utf;
    },

    /**
     * 数组查找元素
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr
     * @param {object} obj 要查找的对象
     * @returns {Number} 下标或-1
     */
    search (arr, obj) {
        for (let i in arr){
            if (arr[i] == obj){
                return i;
            }
        }
        return -1;
    },

    /**
     * 数组删除对象
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr
     * @param {object} obj 要删除的对象
     * @returns {Boolean} 删除结果 成功/失败
     */
    remove (arr, obj) {
        let index = this.search(arr, obj);
        if (index > -1) {
            arr.splice(index, 1);
            return true;
        }
        return false;
    },

    /**
     * 数组中是否存在某个对象
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr
     * @param {object} obj
     * @returns {Boolean}
     */
    isExist (arr, obj) {
        let index = this.search(arr, obj);
        return index > -1 ? true : false;
    },

    /**
     * 数组去重 (用的是Array的from方法)
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr
     * @returns {Array} 去重后的数组
     */
    unique (arr) {
        return Array.from(new Set(arr));
    },

    /**
     * 将数组乱序输出
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr
     * @returns {Array} 打乱后的数组
     */
    upset (arr) {
        return arr.sort(function (){
            return Math.random() - 0.5;
        });
    },

    /**
     * 由小到大排序，只针对数字类型的数组
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr 数字数组
     * @returns {Array} 排序后的数组
     */
    min2max (arr) {
        return arr.sort((a, b) => {
            return a < b;
        });
    },

    /**
     * 由大到小排序，只针对数字类型的数组
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr 数字数组
     * @returns {Array} 排序后的数组
     */
    max2min (arr) {
        return arr.sort((a, b) => {
            return a > b;
        });
    },

    /**
     * 获取数组的最大值，只针对数字类型的数组
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr 数字数组
     * @returns {Number} 最大值
     */
    getMax (arr) {
        return Math.max.apply(undefined, arr);
    },

    /**
     * 获取数组的最小值，只针对数字类型的数组
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr 数字数组
     * @returns {Number} 最小值
     */
    getMin (arr) {
        return Math.min.apply(undefined, arr);
    },

    /**
     * 得到数组的和，只针对数字类型数组
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr 数字数组
     * @returns {Number} 和
     */
    getSum (arr) {
        let sum = 0;
        for (let i = 0, len = arr.length; i < len; i++){
            sum += arr[i];
        }
        return sum;
    },

    /**
     * 数组的平均值,只针对数字类型数组，小数点可能会有很多位，这里不做处理，处理了使用就不灵活了！
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr 数字数组
     * @returns {Number} 平均值
     */
    getAverage (arr) {
        let sum = this.getSum(arr);
        let average = sum / arr.length;
        return average;
    },

    /**
     * 随机获取数组中的某个元素
     *
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr
     * @returns {object} 随机获取的对象
     */
    random (arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /**
    * 统计某个元素在数组中出现的次数
    *
    * @author Wetion
    * @date 2019-11-04
    * @param {Array} arr
    * @param {object} obj
    * @returns {Number} 出现的次数
    */
    getElementCount (arr, obj) {
        let num = 0;
        for (let i = 0, len = arr.length; i < len; i++) {
            if (obj == arr[i]) {
                num++;
            }
        }
        return num;
    },

    /**
     * @description 判断数组是否包含另一个数组
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} aa
     * @param {Array} bb
     * @returns {Boolean} 是否包含
     */
    isContained (aa, bb) {
        if (!(aa instanceof Array) || !(bb instanceof Array) || ((aa.length < bb.length))) {
            return false;
        }
        for (let i = 0; i < bb.length; i++) {
            let flag = false;
            for (let j = 0; j < aa.length; j++){
                if (aa[j] == bb[i]){
                    flag = true;
                    break;
                }
            }
            if (flag == false){
                return flag;
            }
        }
        return true;
    },

    /**
     * @description 随机权重下标
     * @author Wetion
     * @date 2019-11-04
     * @param {Array} arr 数字数组如：[1,2,3]
     * @returns
     */
    getWeightIndex (arr){
        let index = 0;
        let totalWeight = this.getSum(arr);
        let random = Math.random() * totalWeight;
        if (random <= arr[0]){
            return 0;
        } else if (random >= arr[arr.length - 1]){
            index = arr.length - 1;
            return index;
        } else {
            for (let i = 0 ;i < arr.length; i++){
                if (random <= arr[i]){
                    index = i;
                } else if (random > arr[i] && random <= arr[i + 1]){
                    index = i + 1;
                    break;
                } else if (random > arr[i] && random <= arr[ i + 1] ){
                    index = i + 1;
                    break;
                }
            }
        }
        return index;
    }
};