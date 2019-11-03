/* eslint-disable no-console */
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable camelcase */
// sproto.js 解析

let sproto = (function () {
    let t = {};
    let host = {};
    let header_tmp = {};

    // 常量定义
    let SPROTO_REQUEST = 0;
    let SPROTO_RESPONSE = 1;

    // type (sproto_arg.type)
    let SPROTO_TINTEGER = 0;
    let SPROTO_TBOOLEAN = 1;
    let SPROTO_TSTRING = 2;
    let SPROTO_TSTRUCT = 3;

    let SPROTO_CB_ERROR = -1;
    let SPROTO_CB_NIL = -2;
    let SPROTO_CB_NOARRAY = -3;

    let SPROTO_TARRAY = 0x80;
    let SIZEOF_LENGTH = 4;
    let SIZEOF_HEADER = 2;
    let SIZEOF_FIELD = 2;

    let ENCODE_DEEPLEVEL = 64;

    // js中只long只能表示到2^52-1, 0xFFFFFFFFFFFFF表示
    function expand64 (v) {
        let value = v;
        if ((value & 0x80000000) != 0) {
            value = 0x0000000000000 + (value & 0xFFFFFFFF);
        }
        return value;
    }

    function hi_low_uint64 (low, hi) {
        let value = (hi & 0xFFFFFFFF) * 0x100000000 + low;
        return value;
    }

    function uint64_rshift (num, offset) {
        return Math.floor(num / Math.pow(2, offset));
    }

    // 2 byte 的数
    function toword (stream, sidx = 0) {
        return (stream[sidx] & 0xff) | (stream[sidx + 1] & 0xff) << 8;
    }

    // 4 byte 的数。取绝对值
    function todword (stream, sidx = 0) {
        return (
            (stream[sidx] & 0xff) |
            (stream[sidx + 1] & 0xff) << 8 |
            (stream[sidx + 2] & 0xff) << 16 |
            (stream[sidx + 3] & 0xff) << 24
        ) >>> 0;
    }

    function count_array (stream, sidx = 0) {
        let length = todword(stream, sidx);
        let n = 0;
        sidx += SIZEOF_LENGTH; // 下一个元素的起点
        while (length > 0) {
            // 异常：尾部不齐
            if (length < SIZEOF_LENGTH) {
                return -1;
            }

            let nsz = todword(stream, sidx);
            nsz += SIZEOF_LENGTH;
            // 异常：stream长度不对
            if (nsz > length) {
                return -1;
            }

            ++n;
            sidx += nsz;
            length -= nsz;
        }

        return n;
    }

    function struct_field (stream, sz, sidx = 0) {
        if (sz < SIZEOF_HEADER) {
            return -1;
        }

        let fn = toword(stream, sidx);

        // 不做检查了！

        return fn;
    }

    // stream 是 arraybuffer
    function import_string (stream, sidx = 0) {
        let sz = todword(stream, sidx);
        sidx += SIZEOF_LENGTH;
        let buffer = '';
        for (let i = 0; i < sz; i++) {
            buffer += String.fromCharCode(stream[sidx + i]);
        }
        return buffer;
    }

    function calc_pow (base, n) {
        if (n == 0)
            return 1;
        let r = calc_pow(base * base, Math.floor(n / 2));
        if ((n & 1) != 0) {
            r *= base;
        }
        return r;
    }

    function import_field (s, f, stream, sidx = 0) {
        let sz, result, fn;
        let array = 0;
        let tag = -1;
        f.tag = -1;
        f.type = -1;
        f.name = null;
        f.st = null;
        f.key = -1;
        f.extra = 0;

        sz = todword(stream, sidx);
        sidx += SIZEOF_LENGTH;
        result = sidx + sz;
        fn = struct_field(stream, sz, sidx);
        if (fn < 0)
            return null;

        sidx += SIZEOF_HEADER;
        for (let i = 0; i < fn; i++) {
            let value;
            ++tag;
            value = toword(stream, sidx + SIZEOF_FIELD * i);
            if (value & 1 != 0) {
                tag += Math.floor(value / 2);
                continue;
            }
            if (tag == 0) { // name
                if (value != 0)
                    return null;
                f.name = import_string(stream, sidx + fn * SIZEOF_FIELD);
                continue;
            }
            if (value == 0)
                return null;
            value = Math.floor(value / 2) - 1;
            switch (tag) {
                case 1: { // buildin
                    if (value >= SPROTO_TSTRUCT) {
                        return null; // invalid buildin type
                    }
                    f.type = value;
                    break;
                }
                case 2: { // type index
                    if (f.type == SPROTO_TINTEGER) {
                        f.extra = calc_pow(10, value);
                    } else if (f.type == SPROTO_TSTRING) {
                        f.extra = value; // string if 0 ; binary is 1
                    } else {
                        if (value >= s.type_n) {
                            return null; // invalid type index
                        }

                        if (f.type >= 0) {
                            return null;
                        }

                        f.type = SPROTO_TSTRUCT;
                        f.st = value;
                    }
                    break;
                }
                case 3: { // tag
                    f.tag = value;
                    break;
                }
                case 4: { // array
                    if (value != 0) {
                        array = SPROTO_TARRAY;
                    }
                    break;
                }
                case 5: { // key
                    f.key = value;
                    break;
                }
                default: {
                    return null;
                }
            }
        }
        if (f.tag < 0 || f.type < 0 || f.name == null) {
            return null;
        }
        f.type |= array;
        return result;
    }

    /*
    .type {
        .field {
            name 0 : string
            buildin 1 : integer
            type 2 : integer
            tag 3 : integer
            array 4 : boolean
        }
        name 0 : string
        fields 1 : *field
    }
    */
    function import_type (s, t, stream, sidx = 0) {
        let result, fn, n, maxn, last;
        let sz = todword(stream, sidx);
        sidx += SIZEOF_LENGTH;
        result = sidx + sz;
        fn = struct_field(stream, sz, sidx);
        if (fn <= 0 || fn > 2) {
            return null;
        }
        for (let i = 0; i < fn * SIZEOF_FIELD; i += SIZEOF_FIELD) {
            // name and fields must encode to 0
            let v = toword(stream, sidx + SIZEOF_HEADER + i);
            if (v != 0)
                return null;
        }

        t.name = null;
        t.n = 0;
        t.base = 0;
        t.maxn = 0;
        t.f = null;

        sidx += SIZEOF_HEADER + fn * SIZEOF_FIELD;
        t.name = import_string(stream, sidx);
        if (fn == 1) {
            return result;
        }
        sidx += todword(stream, sidx) + SIZEOF_LENGTH; // second data
        n = count_array(stream, sidx);
        if (n < 0) {
            return null;
        }

        sidx += SIZEOF_LENGTH;
        maxn = n;
        last = -1;
        t.n = n;
        t.f = [];
        for (let i = 0; i < n; i++) {
            let tag;
            t.f[i] = Object.create(null);
            let f = t.f[i];
            sidx = import_field(s, f, stream, sidx);
            if (sidx == null) {
                return null;
            }
            tag = f.tag;
            if (tag <= last) {
                return null; // tag must in ascending order
            }
            if (tag > last + 1) {
                ++maxn;
            }
            last = tag;
        }
        t.maxn = maxn;
        t.base = t.f[0].tag;
        n = t.f[n - 1].tag - t.base + 1;
        if (n != t.n) {
            t.base = -1;
        }
        return result;
    }

    /*
    .protocol {
        name 0 : string
        tag 1 : integer
        request 2 : integer
        response 3 : integer
    }
    */
    function import_protocol (s, p, stream, sidx = 0) {
        let result, fn, tag;
        let sz = todword(stream, sidx);
        sidx += SIZEOF_LENGTH;
        result = sidx + sz;
        fn = struct_field(stream, sz, sidx);
        sidx += SIZEOF_HEADER;
        p.name = null;
        p.tag = -1;
        p.p = [];
        p.p[SPROTO_REQUEST] = null;
        p.p[SPROTO_RESPONSE] = null;
        p.confirm = 0; // TODO
        tag = 0;
        for (let i = 0; i < fn; i++, tag++) {
            let value = toword(stream, sidx + SIZEOF_FIELD * i);
            if (value & 1 != 0) {
                tag += (value - 1) / 2;
                continue;
            }
            value = value / 2 - 1;
            switch (i) {
                case 0: { // name
                    if (value != -1) {
                        return null;
                    }
                    p.name = import_string(stream, sidx + SIZEOF_FIELD * fn);
                    break;
                }
                case 1: { // tag
                    if (value < 0) {
                        return null;
                    }
                    p.tag = value;
                    break;
                }
                case 2: { // request
                    if (value < 0 || value >= s.type_n)
                        return null;
                    p.p[SPROTO_REQUEST] = s.type[value];
                    break;
                }
                case 3: { // response
                    if (value < 0 || value >= s.type_n)
                        return null;
                    p.p[SPROTO_RESPONSE] = s.type[value];
                    break;
                }
                case 4: { // TODO
                    p.confirm = value;
                    break;
                }
                default: {
                    return null;
                }
            }
        }

        if (p.name == null || p.tag < 0) {
            return null;
        }
        return result;
    }

    function create_from_bundle (s, stream, sz) {
        let content, typedata, protocoldata;
        let sidx = 0;
        let fn = struct_field(stream, sz, sidx);
        if (fn < 0 || fn > 2)
            return null;

        sidx += SIZEOF_HEADER;
        content = sidx + fn * SIZEOF_FIELD;

        for (let i = 0; i < fn; i++) {
            let value = toword(stream, sidx + i * SIZEOF_FIELD);
            if (value != 0) {
                return null;
            }
            let n = count_array(stream, content);
            if (n < 0) {
                return null;
            }
            if (i == 0) {
                typedata = content + SIZEOF_LENGTH;
                s.type_n = n;
                s.type = [];
            } else {
                protocoldata = content + SIZEOF_LENGTH;
                s.protocol_n = n;
                s.proto = [];
            }
            content += todword(stream, content) + SIZEOF_LENGTH;
        }

        for (let i = 0; i < s.type_n; i++) {
            s.type[i] = Object.create(null);
            typedata = import_type(s, s.type[i], stream, typedata);
            if (typedata == null) {
                return null;
            }
        }

        for (let i = 0; i < s.protocol_n; i++) {
            s.proto[i] = Object.create(null);
            protocoldata = import_protocol(s, s.proto[i], stream, protocoldata);
            if (protocoldata == null) {
                return null;
            }
        }

        return s;
    }

    // query
    function sproto_prototag (sp, name) {
        for (let i = 0; i < sp.protocol_n; i++) {
            if (name == sp.proto[i].name) {
                return sp.proto[i].tag;
            }
        }
        return -1;
    }

    // 二分查找
    function query_proto (sp, tag) {
        let begin = 0;
        let end = sp.protocol_n;
        while (begin < end) {
            let mid = Math.floor((begin + end) / 2);
            let t = sp.proto[mid].tag;
            if (t == tag) {
                return sp.proto[mid];
            }

            if (tag > t) {
                begin = mid + 1;
            } else {
                end = mid;
            }
        }
        return null;
    }

    function sproto_protoquery (sp, proto, what) {
        let p = null;
        if (what < 0 || what > 1) {
            return null;
        }

        p = query_proto(sp, proto);
        if (p) {
            return p.p[what];
        }
        return null;
    }

    function sproto_protoname (sp, proto) {
        let p = query_proto(sp, proto);
        if (p) {
            return p.name;
        }
        return null;
    }

    function sproto_type (sp, type_name) {
        for (let i = 0; i < sp.type_n; i++) {
            if (type_name == sp.type[i].name) {
                return sp.type[i];
            }
        }
        return null;
    }

    function findtag (st, tag) {
        let begin, end;
        if (st.base >= 0) {
            tag -= st.base;
            if (tag < 0 || tag > st.n) {
                return null;
            }
            return st.f[tag];
        }

        begin = 0;
        end = st.n;
        while (begin < end) {
            let mid = Math.floor((begin + end) / 2);
            let f = st.f[mid];
            let t = f.tag;
            if (t == tag) {
                return f;
            }
            if (tag > t) {
                begin = mid + 1;
            } else {
                end = mid;
            }
        }
        return null;
    }

    function fill_size (data, data_idx, sz) {
        data[data_idx] = sz & 0xff;
        data[data_idx + 1] = (sz >> 8) & 0xff;
        data[data_idx + 2] = (sz >> 16) & 0xff;
        data[data_idx + 3] = (sz >> 24) & 0xff;
        return sz + SIZEOF_LENGTH;
    }

    function encode_integer (v, data, data_idx, size) {
        data[data_idx + 4] = v & 0xff;
        data[data_idx + 5] = (v >> 8) & 0xff;
        data[data_idx + 6] = (v >> 16) & 0xff;
        data[data_idx + 7] = (v >> 24) & 0xff;
        return fill_size(data, data_idx, 4);
    }

    function encode_uint64 (v, data, data_idx, size) {
        data[data_idx + 4] = v & 0xff;
        data[data_idx + 5] = uint64_rshift(v, 8) & 0xff;
        data[data_idx + 6] = uint64_rshift(v, 16) & 0xff;
        data[data_idx + 7] = uint64_rshift(v, 24) & 0xff;
        data[data_idx + 8] = uint64_rshift(v, 32) & 0xff;
        data[data_idx + 9] = uint64_rshift(v, 40) & 0xff;
        data[data_idx + 10] = uint64_rshift(v, 48) & 0xff;
        data[data_idx + 11] = uint64_rshift(v, 56) & 0xff;
        return fill_size(data, data_idx, 8);
    }

    function encode_object (cb, args, data, data_idx) {
        let sz;
        args.buffer = data;
        args.buffer_idx = data_idx + SIZEOF_LENGTH;
        sz = cb(args);
        if (sz < 0) {
            if (sz == SPROTO_CB_NIL) {
                return 0;
            }
            return -1; // sz == SPROTO_CB_ERROR
        }
        return fill_size(data, data_idx, sz);
    }

    function uint32_to_uint64 (negative, buffer, buffer_idx) {
        if (negative) {
            buffer[buffer_idx + 4] = 0xff;
            buffer[buffer_idx + 5] = 0xff;
            buffer[buffer_idx + 6] = 0xff;
            buffer[buffer_idx + 7] = 0xff;
        } else {
            buffer[buffer_idx + 4] = 0;
            buffer[buffer_idx + 5] = 0;
            buffer[buffer_idx + 6] = 0;
            buffer[buffer_idx + 7] = 0;
        }
    }

    function encode_integer_array (cb, args, buffer, buffer_idx, noarray) {
        let intlen, index;
        let header_idx = buffer_idx;

        buffer_idx++;
        intlen = 4;
        index = 1;
        noarray.value = 0;

        for (;;) {
            let sz;
            args.value = null;
            args.length = 8;
            args.index = index;
            sz = cb(args);
            if (sz <= 0) {
                if (sz == SPROTO_CB_NIL) { // nil object, end of array
                    break;
                }

                if (sz == SPROTO_CB_NOARRAY) { // no array, don't encode it
                    noarray.value = 1;
                    break;
                }

                return null; // sz == SPROTO_CB_ERROR
            }

            if (sz == 4) {
                let v = args.value;
                buffer[buffer_idx] = v & 0xff;
                buffer[buffer_idx + 1] = (v >> 8) & 0xff;
                buffer[buffer_idx + 2] = (v >> 16) & 0xff;
                buffer[buffer_idx + 3] = (v >> 24) & 0xff;

                if (intlen == 8) {
                    uint32_to_uint64(v & 0x80000000, buffer, buffer_idx);
                }
            } else {
                let v;
                if (sz != 8) {
                    return null;
                }

                if (intlen == 4) {
                    buffer_idx += (index - 1) * 4;
                    for (let i = index - 2; i >= 0; i--) {
                        let negative;
                        for (let j = (1 + i * 8); j < (1 + i * 8 + 4); j++) {
                            buffer[header_idx + j] = buffer[header_idx + j - i * 4];
                        }
                        negative = buffer[header_idx + 1 + i * 8 + 3] & 0x80;
                        uint32_to_uint64(negative, buffer, buffer_idx + 1 + i * 8);
                    }
                    intlen = 8;
                }

                v = args.value;
                buffer[buffer_idx] = v & 0xff;
                buffer[buffer_idx + 1] = (v >> 8) & 0xff;
                buffer[buffer_idx + 2] = (v >> 16) & 0xff;
                buffer[buffer_idx + 3] = (v >> 24) & 0xff;
                buffer[buffer_idx + 4] = (v >> 32) & 0xff;
                buffer[buffer_idx + 5] = (v >> 40) & 0xff;
                buffer[buffer_idx + 6] = (v >> 48) & 0xff;
                buffer[buffer_idx + 7] = (v >> 56) & 0xff;
            }

            buffer_idx += intlen;
            index++;
        }

        if (buffer_idx == header_idx + 1) {
            return header_idx;
        }
        buffer[header_idx] = intlen & 0xff;
        return buffer_idx;
    }

    function encode_array (cb, args, data, data_idx) {
        let sz;
        let buffer = data;
        let buffer_idx = data_idx + SIZEOF_LENGTH;
        switch (args.type) {
            case SPROTO_TINTEGER: {
                let noarray = {};
                noarray.value = 0;
                buffer_idx = encode_integer_array(cb, args, buffer, buffer_idx, noarray);
                if (buffer_idx == null) {
                    return -1;
                }

                if (noarray.value != 0) {
                    return 0;
                }
                break;
            }
            case SPROTO_TBOOLEAN: {
                args.index = 1;
                for (;;) {
                    let v = 0;
                    args.value = v;
                    args.length = 4;
                    sz = cb(args);
                    if (sz < 0) {
                        if (sz == SPROTO_CB_NIL)        // nil object , end of array
                            break;
                        if (sz == SPROTO_CB_NOARRAY)    // no array, don't encode it
                            return 0;
                        return -1; // sz == SPROTO_CB_ERROR
                    }

                    if (sz < 1) {
                        return -1;
                    }

                    buffer[buffer_idx] = (args.value == 1) ? 1 : 0;
                    buffer_idx++;
                    ++args.index;
                }
                break;
            }
            default: {
                args.index = 1;
                for (;;) {
                    args.buffer = buffer;
                    args.buffer_idx = buffer_idx + SIZEOF_LENGTH;
                    sz = cb(args);
                    if (sz < 0) {
                        if (sz == SPROTO_CB_NIL) {
                            break;
                        }

                        if (sz == SPROTO_CB_NOARRAY) { // no array, don't encode it
                            return 0;
                        }

                        return -1; // sz == SPROTO_CB_ERROR
                    }

                    fill_size(buffer, buffer_idx, sz);
                    buffer_idx += SIZEOF_LENGTH + sz;
                    ++args.index;
                }
                break;
            }
        }

        sz = buffer_idx - (data_idx + SIZEOF_LENGTH);
        if (sz == 0) {
            return 0;
        }

        return fill_size(buffer, data_idx, sz);
    }

    function decode_array_object (cb, args, stream, sz, sidx = 0) {
        let hsz;
        let index = 1;
        while (sz > 0) {
            if (sz < SIZEOF_LENGTH) {
                return -1;
            }

            hsz = todword(stream, sidx);
            sidx += SIZEOF_LENGTH;
            sz -= SIZEOF_LENGTH;
            if (hsz > sz) {
                return -1;
            }

            args.index = index;
            args.value = stream.slice(sidx, sidx + hsz);
            args.length = hsz;
            if (cb(args) != 0) {
                return -1;
            }

            sidx += hsz;
            sz -= hsz;
            ++index;
        }
        return 0;
    }


    function decode_array (cb, args, stream, sidx = 0) {
        let sz = todword(stream, sidx);
        let type = args.type;
        if (sz == 0) {
            // It's empty array, call cb with index == -1 to create the empty array.
            args.index = -1;
            args.value = null;
            args.length = 0;
            cb(args);
            return 0;
        }

        sidx += SIZEOF_LENGTH;
        switch (type) {
            case SPROTO_TINTEGER: {
                let len = stream[sidx];
                ++sidx;
                --sz;
                if (len == 4) {
                    if (sz % 4 != 0) {
                        return -1;
                    }
                    for (let i = 0; i < Math.floor(sz / 4); i++) {
                        let value = expand64(todword(stream, sidx + i * 4));
                        args.index = i + 1;
                        args.value = value;
                        args.length = 8;
                        cb(args);
                    }
                } else if (len == 8) {
                    if (sz % 8 != 0) {
                        return -1;
                    }

                    for (let i = 0; i < Math.floor(sz / 8); i++) {
                        let low = todword(stream, sidx + i * 8);
                        let hi = todword(stream, sidx + i * 8 + 4);
                        let value = hi_low_uint64(low, hi);
                        args.index = i + 1;
                        args.value = value;
                        args.length = 8;
                        cb(args);
                    }
                } else {
                    return -1;
                }
                break;
            }
            case SPROTO_TBOOLEAN: {
                for (let i = 0; i < sz; i++) {
                    let value = stream[sidx + i];
                    args.index = i + 1;
                    args.value = value;
                    args.length = 8;
                    cb(args);
                }
                break;
            }
            case SPROTO_TSTRING:
            case SPROTO_TSTRUCT: {
                return decode_array_object(cb, args, stream, sz, sidx);
            }
            default: {
                return -1;
            }
        }
        return 0;
    }

    function pack_seg (src, src_idx, buffer, buffer_idx, sz, n) {
        let header = 0;
        let notzero = 0;
        let obuffer_idx = buffer_idx;
        ++buffer_idx;
        --sz;
        if (sz < 0) {
            obuffer_idx = null;
        }

        for (let i = 0; i < 8; i++) {
            if (src[src_idx + i] != 0) {
                notzero++;
                header |= 1 << i;
                if (sz > 0) {
                    buffer[buffer_idx] = src[src_idx + i];
                    ++buffer_idx;
                    --sz;
                }
            }
        }

        if ((notzero == 7 || notzero == 6) && n > 0) {
            notzero = 8;
        }

        if (notzero == 8) {
            if (n > 0) {
                return 8;
            } else {
                return 10;
            }
        }

        if (obuffer_idx != null) {
            buffer[obuffer_idx] = header;
        }

        return notzero + 1;
    }

    function write_ff (src, src_idx, des, dest_idx, n) {
        let align8_n = (n + 7) & (~7);
        des[dest_idx] = 0xff;
        des[dest_idx + 1] = Math.floor(align8_n / 8) - 1;

        for (let i = 0; i < n; i++) {
            des[dest_idx + i + 2] = src[src_idx + i];
        }

        for (let i = 0; i < align8_n - n; i++) {
            des[dest_idx + n + 2 + i] = 0;
        }
    }

    function sproto_pack (srcv, src_idx, bufferv, buffer_idx) {
        let tmp = new Array(8);
        let ff_srcstart, ff_desstart;
        let ff_srcstart_idx = 0;
        let ff_desstart_idx = 0;
        let ff_n = 0;
        let size = 0;
        let src = srcv;
        let buffer = bufferv;
        let srcsz = srcv.length;
        let bufsz = 1 << 30;

        for (let i = 0; i < srcsz; i += 8) {
            let n;
            let padding = i + 8 - srcsz;
            if (padding > 0) {
                for (let j = 0; j < 8 - padding; j++) {
                    tmp[j] = src[src_idx + j];
                }

                for (let j = 0; j < padding; j++) {
                    tmp[7 - j] = 0;
                }

                src = tmp;
                src_idx = 0;
            }

            n = pack_seg(src, src_idx, buffer, buffer_idx, bufsz, ff_n);
            bufsz -= n;
            if (n == 10) {
                // first FF
                ff_srcstart = src;
                ff_srcstart_idx = src_idx;
                ff_desstart = buffer;
                ff_desstart_idx = buffer_idx;
                ff_n = 1;
            } else if (n == 8 && ff_n > 0) {
                ++ff_n;
                if (ff_n == 256) {
                    if (bufsz >= 0) {
                        write_ff(ff_srcstart, ff_srcstart_idx, ff_desstart, ff_desstart_idx, 256 * 8);
                    }
                    ff_n = 0;
                }
            } else {
                if (ff_n > 0) {
                    if (bufsz >= 0) {
                        write_ff(ff_srcstart, ff_srcstart_idx, ff_desstart, ff_desstart_idx, ff_n * 8);
                    }
                    ff_n = 0;
                }
            }
            src_idx += 8;
            buffer_idx += n;
            size += n;
        }
        if (bufsz >= 0) {
            if (ff_n == 1) {
                write_ff(ff_srcstart, ff_srcstart_idx, ff_desstart, ff_desstart_idx, 8);
            } else if (ff_n > 1) {
                write_ff(ff_srcstart, ff_srcstart_idx, ff_desstart, ff_desstart_idx, srcsz - ff_srcstart_idx);
            }
            if (buffer.length > size) {
                for (let i = size; i < buffer.length; i++) {
                    buffer[i] = 0;
                }
            }
        }
        return size;
    }

    function sproto_unpack (srcv, src_idx, bufferv, buffer_idx) {
        let src = srcv;
        let buffer = bufferv;
        let size = 0;
        let srcsz = srcv.length;
        let bufsz = 1 << 30;
        while (srcsz > 0) {
            let header = src[src_idx];
            --srcsz;
            ++src_idx;
            if (header == 0xff) {
                let n;
                if (srcsz < 0) {
                    return -1;
                }

                n = (src[src_idx] + 1) * 8;
                if (srcsz < n + 1)
                    return -1;

                srcsz -= n + 1;
                ++src_idx;
                if (bufsz >= n) {
                    for (let i = 0; i < n; i++) {
                        buffer[buffer_idx + i] = src[src_idx + i];
                    }
                }

                bufsz -= n;
                buffer_idx += n;
                src_idx += n;
                size += n;
            } else {
                for (let i = 0; i < 8; i++) {
                    let nz = (header >>> i) & 1;
                    if (nz != 0) {
                        if (srcsz < 0)
                            return -1;

                        if (bufsz > 0) {
                            buffer[buffer_idx] = src[src_idx];
                            --bufsz;
                            ++buffer_idx;
                        }

                        ++src_idx;
                        --srcsz;
                    } else {
                        if (bufsz > 0) {
                            buffer[buffer_idx] = 0;
                            --bufsz;
                            ++buffer_idx;
                        }
                    }
                    ++size;
                }
            }
        }
        return size;
    }

    function string2utf8 (str) {
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
    }

    function utf82string (arr) {
        if (typeof arr === 'string') {
            return null;
        }

        let UTF = '';
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] == null) {
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
                UTF += String.fromCharCode(parseInt(store, 2));
                i += bytesLength - 1;
            } else {
                UTF += String.fromCharCode(arr[i]);
            }
        }
        return UTF;
    }

    function arrayconcat (a1, a2) {
        let b = [];

        for (let i = 0; i < a1.length; i++) {
            b[i] = a1[i];
        }

        for (let j = a1.length; j < a1.length + a2.length; j++) {
            b[j] = a2[j - a1.length];
        }

        return b;
    }

    // /////////////////////导出方法///////////////////////////////

    t.pack = function (inbuf) {
        let src_idx = 0;
        let buffer = [];
        let buffer_idx = 0;
        sproto_pack(inbuf, src_idx, buffer, buffer_idx);
        return buffer;
    },

    t.unpack = function (inbuf) {
        let src_idx = 0;
        let buffer = [];
        let buffer_idx = 0;
        sproto_unpack(inbuf, src_idx, buffer, buffer_idx);
        return buffer;
    },

    t.createNew = function (binsch) {
        let s = {};
        s.type_n = 0;
        s.protocol_n = 0;
        s.type = null;
        s.proto = null;
        s.tcache = {};
        s.pcache = {};
        let sp = create_from_bundle(s, binsch, binsch.length);
        if (sp == null)
            return null;

        function sproto_encode (st, buffer, buffer_idx, cb, ud) {
            let args = Object.create(null);
            let header_idx = buffer_idx;
            let data_idx = buffer_idx;
            let header_sz = SIZEOF_HEADER + st.maxn * SIZEOF_FIELD;
            let index, lasttag, datasz;

            args.ud = ud;
            data_idx = header_idx + header_sz;
            index = 0;
            lasttag = -1;
            for (let i = 0; i < st.n; i++) {
                let f = st.f[i];
                let type = f.type;
                let value = 0;
                let sz = -1;
                args.tagname = f.name;
                args.tagid = f.tag;
                if (f.st != null) {
                    args.subtype = sp.type[f.st];
                } else {
                    args.subtype = null;
                }

                args.mainindex = f.key;
                args.extra = f.extra;
                if ((type & SPROTO_TARRAY) != 0) {
                    args.type = type & ~SPROTO_TARRAY;
                    sz = encode_array(cb, args, buffer, data_idx);
                } else {
                    args.type = type;
                    args.index = 0;
                    switch (type) {
                        case SPROTO_TINTEGER:
                        case SPROTO_TBOOLEAN: {
                            args.value = 0;
                            args.length = 8;
                            args.buffer = buffer;
                            args.buffer_idx = buffer_idx;
                            sz = cb(args);
                            if (sz < 0) {
                                if (sz == SPROTO_CB_NIL)
                                    continue;
                                if (sz == SPROTO_CB_NOARRAY) // no array, don't encode it
                                    return 0;
                                return -1; // sz == SPROTO_CB_ERROR
                            }
                            if (sz == 4) {
                                if (args.value < 0x7fff) {
                                    value = (args.value + 1) * 2;
                                    sz = 2; // sz can be any number > 0
                                } else {
                                    sz = encode_integer(args.value, buffer, data_idx, sz);
                                }
                            } else if (sz == 8) {
                                sz = encode_uint64(args.value, buffer, data_idx, sz);
                            } else {
                                return -1;
                            }
                            break;
                        }
                        case SPROTO_TSTRUCT:
                        case SPROTO_TSTRING: {
                            sz = encode_object(cb, args, buffer, data_idx);
                            break;
                        }
                    }
                }

                if (sz < 0)
                    return -1;

                if (sz > 0) {
                    let record_idx, tag;
                    if (value == 0) {
                        data_idx += sz;
                    }
                    record_idx = header_idx + SIZEOF_HEADER + SIZEOF_FIELD * index;
                    tag = f.tag - lasttag - 1;
                    if (tag > 0) {
                        // skip tag
                        tag = (tag - 1) * 2 + 1;
                        if (tag > 0xffff)
                            return -1;
                        buffer[record_idx] = tag & 0xff;
                        buffer[record_idx + 1] = (tag >> 8) & 0xff;
                        ++index;
                        record_idx += SIZEOF_FIELD;
                    }
                    ++index;
                    buffer[record_idx] = value & 0xff;
                    buffer[record_idx + 1] = (value >> 8) & 0xff;
                    lasttag = f.tag;
                }
            }

            buffer[header_idx] = index & 0xff;
            buffer[header_idx + 1] = (index >> 8) & 0xff;

            datasz = data_idx - (header_idx + header_sz);
            data_idx = header_idx + header_sz;
            if (index != st.maxn) {
                let v = buffer.slice(data_idx, data_idx + datasz); // 拷贝一份
                for (let s = 0; s < datasz; s++) {
                    buffer[header_idx + SIZEOF_HEADER + index * SIZEOF_FIELD + s] = v[s];
                }
                buffer.splice(header_idx + SIZEOF_HEADER + index * SIZEOF_FIELD + datasz, buffer.length);
            }

            return SIZEOF_HEADER + index * SIZEOF_FIELD + datasz;
        }

        function encode (args) {
            let self = args.ud;
            if (self.deep >= ENCODE_DEEPLEVEL) {
                alert('table is too deep');
                return -1;
            }

            if (self.indata[args.tagname] == null) {
                return SPROTO_CB_NIL;
            }

            let target = null;
            if (args.index > 0) {
                if (args.tagname != self.array_tag) {
                    self.array_tag = args.tagname;

                    if (typeof(self.indata[args.tagname]) != 'object') {
                        self.array_index = 0;
                        return SPROTO_CB_NIL;
                    }

                    if (self.indata[args.tagname].length == 0 || self.indata[args.tagname].length == null) {
                        self.array_index = 0;
                        return SPROTO_CB_NOARRAY;
                    }
                }
                target = self.indata[args.tagname][args.index - 1];
                if (target == null) {
                    return SPROTO_CB_NIL;
                }
            } else {
                target = self.indata[args.tagname];
            }

            switch (args.type) {
            case SPROTO_TINTEGER:
            {
                let v, vh;
                if (args.extra > 0) {
                    let vn = target;
                    v = Math.floor(vn * args.extra + 0.5);
                } else {
                    v = target;
                }
                vh = uint64_rshift(v, 31);
                if (vh == 0 || vh == -1) {
                    args.value = v >>> 0;
                    return 4;
                } else {
                    args.value = v;
                    return 8;
                }
            }
            case SPROTO_TBOOLEAN:
            {
                if (target == true) {
                    args.value = 1;
                } else if (target == false) {
                    args.value = 0;
                }
                return 4;
            }
            case SPROTO_TSTRING:
            {
                let str = target;
                let arr = string2utf8(str);
                let sz = arr.length;
                if (sz > args.length) {
                    args.length = sz;
                }

                for (let i = 0; i < arr.length; i++) {
                    args.buffer[args.buffer_idx + i] = arr[i];
                }
                return sz;
            }
            case SPROTO_TSTRUCT:
            {
                let sub = Object.create(null);
                sub.st = args.subtype;
                sub.deep = self.deep + 1;
                sub.indata = target;
                let r = sproto_encode(args.subtype, args.buffer, args.buffer_idx, encode, sub);
                if (r < 0) {
                    return SPROTO_CB_ERROR;
                }
                return r;
            }
            default:
                alert('Invalid filed type ' + args.type);
                return SPROTO_CB_ERROR;
            }
        }

        function sproto_decode (st, data, size, cb, ud) {
            let args = Object.create(null);
            let total = size;
            let stream, fn, tag;
            if (size < SIZEOF_HEADER)
                return -1;
            stream = data;
            let sidx = 0;
            fn = toword(stream, sidx);
            sidx += SIZEOF_HEADER;
            size -= SIZEOF_HEADER;
            if (size < fn * SIZEOF_FIELD)
                return -1;

            let dsidx = sidx + fn * SIZEOF_FIELD;
            size -= fn * SIZEOF_FIELD;
            args.ud = ud;

            tag = -1;
            for (let i = 0; i < fn; i++) {
                let f = null;
                let value = toword(stream, sidx + i * SIZEOF_FIELD);
                ++tag;
                if (value & 1 != 0) {
                    tag += Math.floor(value / 2);
                    continue;
                }
                value = Math.floor(value / 2) - 1;

                let currentdataIdx = dsidx;
                if (value < 0) {
                    let sz;
                    if (size < SIZEOF_LENGTH) {
                        return -1;
                    }
                    sz = todword(stream, dsidx);
                    if (size < sz + SIZEOF_LENGTH) {
                        return -1;
                    }
                    dsidx += sz + SIZEOF_LENGTH;
                    size -= sz + SIZEOF_LENGTH;
                }
                f = findtag(st, tag);
                if (f == null) {
                    continue;
                }
                args.tagname = f.name;
                args.tagid = f.tag;
                args.type = f.type & ~SPROTO_TARRAY;
                if (f.st != null) {
                    args.subtype = sp.type[f.st];
                } else {
                    args.subtype = null;
                }

                args.index = 0;
                args.mainindex = f.key;
                args.extra = f.extra;
                if (value < 0) {
                    if ((f.type & SPROTO_TARRAY) != 0) {
                        if (decode_array(cb, args, stream, currentdataIdx)) {
                            return -1;
                        }
                    } else {
                        switch (f.type) {
                            case SPROTO_TINTEGER: {
                                let sz = todword(stream, currentdataIdx);
                                if (sz == 4) {
                                    let v = expand64(todword(stream, currentdataIdx + SIZEOF_LENGTH));
                                    args.value = v;
                                    args.length = 8;
                                    cb(args);
                                } else if (sz != 8) {
                                    return -1;
                                } else {
                                    let low = todword(stream, currentdataIdx + SIZEOF_LENGTH);
                                    let hi = todword(stream, currentdataIdx + SIZEOF_LENGTH + 4);
                                    let v = hi_low_uint64(low, hi);
                                    args.value = v;
                                    args.length = 8;
                                    cb(args);
                                }
                                break;
                            }
                            case SPROTO_TSTRING:
                            case SPROTO_TSTRUCT: {
                                let sz = todword(stream, currentdataIdx);
                                args.value = stream.slice(currentdataIdx + SIZEOF_LENGTH, currentdataIdx + SIZEOF_LENGTH + sz);
                                args.length = sz;
                                if (cb(args) != 0) {
                                    return -1;
                                }
                                break;
                            }
                            default: {
                                return -1;
                            }
                        }
                    }
                } else if (f.type != SPROTO_TINTEGER && f.type != SPROTO_TBOOLEAN) {
                    return -1;
                } else {
                    args.value = value;
                    args.length = 8;
                    cb(args);
                }
            }
            return total - size;
        }

        function decode (args) {
            let self = args.ud;
            let value;
            if (self.deep >= ENCODE_DEEPLEVEL) {
                alert('the table is too deep');
            }

            if (args.index != 0) {
                if (args.tagname != self.array_tag) {
                    self.array_tag = args.tagname;
                    self.result[args.tagname] = [];
                    if (args.index < 0) {
                        return 0;
                    }
                }
            }

            switch (args.type) {
            case SPROTO_TINTEGER:
            {
                if (args.extra) {
                    let v = args.value;
                    let vn = v;
                    value = vn / args.extra;
                } else {
                    value = args.value;
                }
                break;
            }
            case SPROTO_TBOOLEAN:
            {
                if (args.value == 1) {
                    value = true;
                } else if (args.value == 0) {
                    value = false;
                } else {
                    value = null;
                }
                break;
            }
            case SPROTO_TSTRING:
            {
                let arr = [];
                for (let i = 0; i < args.length; i++) {
                    arr.push(args.value[i]);
                }
                value = utf82string(arr);
                break;
            }
            case SPROTO_TSTRUCT:
            {
                let sub = Object.create(null);
                let r;
                sub.deep = self.deep + 1;
                sub.array_index = 0;
                sub.array_tag = null;
                sub.result = Object.create(null);
                if (args.mainindex >= 0) {
                    sub.mainindex_tag = args.mainindex;
                    r = sproto_decode(args.subtype, args.value, args.length, decode, sub);
                    if (r < 0 || r != args.length) {
                        return r;
                    }
                    value = sub.result;
                    break;
                } else {
                    sub.mainindex_tag = -1;
                    sub.key_index = 0;
                    r = sproto_decode(args.subtype, args.value, args.length, decode, sub);
                    if (r < 0) {
                        return SPROTO_CB_ERROR;
                    }
                    if (r != args.length)
                        return r;
                    value = sub.result;
                    break;
                }
            }
            default:
                alert('Invalid type');
            }

            if (args.index > 0) {
                self.result[args.tagname][args.index - 1] = value;
            } else {
                self.result[args.tagname] = value;
            }

            return 0;
        }

        function querytype (sp, typename) {
            let v = sp.tcache[typename];
            if (v === null || v === undefined) {
                v = sproto_type(sp, typename);
                sp.tcache[typename] = v;
            }
            return v;
        }

        function protocol (sp, pname) {
            let tag = null;
            let ret1 = null;

            if (typeof(pname) == 'number') {
                tag = pname;
                ret1 = sproto_protoname(sp, pname);
                if (ret1 === null)
                    return null;
            } else {
                tag = sproto_prototag(sp, pname);
                ret1 = tag;

                if (tag === -1)
                    return null;
            }

            let request = sproto_protoquery(sp, tag, SPROTO_REQUEST);
            let response = sproto_protoquery(sp, tag, SPROTO_RESPONSE);
            return {
                ret1: ret1,
                request: request,
                response: response
            };
        }

        function queryproto (sp, pname) {
            let v = sp.pcache[pname];
            if (v === null || v === undefined) {
                let ret = protocol(sp, pname);
                if (!ret) {
                    return undefined;
                }
                let tag = ret.ret1;
                let req = ret.request;
                let resp = ret.response;

                if (typeof(pname) === 'number') {
                    let tmp = tag;
                    tag = pname;
                    pname = tmp;
                }

                v = {
                    request: req,
                    response: resp,
                    name: pname,
                    tag: tag
                };

                sp.pcache[pname] = v;
                sp.pcache[tag] = v;
            }
            return v;
        }

        sp.objlen = function (type, inbuf) {
            let st = null;
            if (typeof(type) === 'string' || typeof(type) === 'number') {
                st = querytype(sp, type);
                if (st == null) {
                    return null;
                }
            } else {
                st = type;
            }

            let ud = Object.create(null);
            ud.array_tag = null;
            ud.deep = 0;
            ud.result = Object.create(null);
            return sproto_decode(st, inbuf, inbuf.length, decode, ud);
        };

        sp.encode = function (type, indata) {
            let self = Object.create(null);

            let st = null;
            if (typeof(type) === 'string' || typeof(type) === 'number') {
                st = querytype(sp, type);
                if (st == null)
                    return null;
            } else {
                st = type;
            }

            let tbl_index = 2;
            let enbuffer = [];
            let buffer_idx = 0;
            self.st = st;
            self.tbl_index = tbl_index;
            self.indata = indata;
            for (;;) {
                self.array_tag = null;
                self.array_index = 0;
                self.deep = 0;
                self.iter_index = tbl_index + 1;
                let r = sproto_encode(st, enbuffer, buffer_idx, encode, self);
                if (r < 0) {
                    return null;
                } else {
                    return enbuffer;
                }
            }
        };

        sp.decode = function (type, inbuf) {
            let st = null;
            if (typeof(type) === 'string' || typeof(type) === 'number') {
                st = querytype(sp, type);
                if (st == null) {
                    return null;
                }
            } else {
                st = type;
            }

            let buffer = inbuf;
            let sz = inbuf.length;
            let ud = Object.create(null);
            ud.array_tag = null;
            ud.deep = 0;
            ud.result = Object.create(null);
            let r = sproto_decode(st, buffer, sz, decode, ud);
            if (r < 0) {
                return null;
            }

            return ud.result;
        };

        sp.pack = function (inbuf) {
            return t.pack(inbuf);
        };

        sp.unpack = function (inbuf) {
            return t.unpack(inbuf);
        };

        sp.pencode = function (type, inbuf) {
            let obuf = sp.encode(type, inbuf);
            if (obuf == null) {
                return null;
            }
            return sp.pack(obuf);
        };

        sp.pdecode = function (type, inbuf) {
            let obuf = sp.unpack(inbuf);
            if (obuf == null) {
                return null;
            }
            return sp.decode(type, obuf);
        };

        sp.host = function (packagename) {
            function cla (packagename) {
                packagename = packagename ? packagename : 'package';
                this.proto = sp;
                this.package = querytype(sp, packagename);
                this.package = this.package ? this.package : 'package';
                this.session = {};
            }
            cla.prototype = host;

            return new cla(packagename);
        };

        host.attach = function (sp) {
            this.attachsp = sp;
            let self = this;
            return (name, args, session) => {
                let proto = queryproto(sp, name);

                header_tmp.type = proto.tag;
                header_tmp.session = session;

                let headerbuffer = sp.encode(self.package, header_tmp);
                if (session) {
                    self.session[session] = proto.response ? proto.response : true;
                }

                if (args) {
                    let databuffer = sp.encode(proto.request, args);
                    return sp.pack(arrayconcat(headerbuffer, databuffer));
                } else {
                    return sp.pack(headerbuffer);
                }
            };
        };

        function gen_response (self, response, session) {
            return function (args) {
                header_tmp.type = null;
                header_tmp.session = session;
                let headerbuffer = self.proto.encode(self.package, header_tmp);
                if (response) {
                    let databuffer = self.proto.encode(response, args);
                    return self.proto.pack(arrayconcat(headerbuffer, databuffer));
                } else {
                    return self.proto.pack(headerbuffer);
                }
            };
        }

        host.dispatch = function (buffer) {
            let sp = this.proto;
            let bin = sp.unpack(buffer);
            header_tmp.type = null;
            header_tmp.session = null;
            header_tmp = sp.decode(this.package, bin);

            let used_sz = sp.objlen(this.package, bin);
            let leftbuffer = bin.slice(used_sz, bin.length);
            if (header_tmp.type) {
                let proto = queryproto(sp, header_tmp.type);
                if (!proto) {
                    return {
                        type: 'UNKOWN',
                        pname: header_tmp.type,
                        session: header_tmp.session
                    };
                }

                let result;
                if (proto.request) {
                    result = sp.decode(proto.request, leftbuffer);
                }

                if (header_tmp.session) {
                    return {
                        type: 'REQUEST',
                        pname: proto.name,
                        result: result,
                        responseFunc: gen_response(this, proto.response, header_tmp.session),
                        session: header_tmp.session
                    };
                } else {
                    return {
                        type: 'REQUEST',
                        pname: proto.name,
                        result: result
                    };
                }
            } else {
                sp = this.attachsp;
                let session = header_tmp.session;
                let response = this.session[session];
                delete this.session[session];

                if (response === true) {
                    return {
                        type: 'RESPONSE',
                        session: session
                    };
                } else {
                    let result = sp.decode(response, leftbuffer);
                    return {
                        type: 'RESPONSE',
                        session: session,
                        result: result
                    };
                }
            }
        };

        return sp;
    };

    return t;
}());

module.exports = sproto;