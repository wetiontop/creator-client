let StorageMgr = {
    init () {
        if (CC_EDITOR) {
            return;
        }
    }
};

module.exports = StorageMgr;