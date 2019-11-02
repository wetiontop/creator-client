let GameMgr = {
    init () {
        if (CC_EDITOR) {
            return;
        }
    }
};

module.exports = GameMgr;