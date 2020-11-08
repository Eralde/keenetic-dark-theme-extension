import * as _ from 'lodash';

import {
    DEVICE_SETTINGS_PROP,
    FLAG_DEFAULTS,
    FLAGS,
    LOCAL_STORAGE_KEY,
} from './constants';

let _FLAGS,
    _TAG,
    _flagsRead = false;

const setDefaultFlags = () => {
    _FLAGS = _.cloneDeep(FLAG_DEFAULTS);
    _FLAGS[DEVICE_SETTINGS_PROP] = {};

    _flagsRead = true;
};

const saveFlags = () => {
    return localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(_FLAGS));
};

const readFlags = (deviceServicetag) => {
    _TAG = String(deviceServicetag);

    const flagsJson = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!flagsJson) {
        setDefaultFlags();

        return;
    }

    try {
        _FLAGS = JSON.parse(flagsJson);
        _FLAGS[FLAGS.SHOW_FILTERS] = _.get(
            _FLAGS,
            [DEVICE_SETTINGS_PROP, _TAG],
            FLAG_DEFAULTS[FLAGS.SHOW_FILTERS],
        );

        _flagsRead = true;
    } catch (e) {
        setDefaultFlags();
    }
};

export const flags = {
    get: (prop) => {
        if (!_flagsRead) {
            console.warn('flags read before initialization');
        }

        return _FLAGS[prop];
    },

    set: (prop, val) => {
        if (prop === FLAGS.SHOW_FILTERS) {
            _FLAGS = _.set(_FLAGS, [DEVICE_SETTINGS_PROP, _TAG], val);
            _FLAGS[FLAGS.SHOW_FILTERS] = val;
        } else {
            _FLAGS[prop] = val;
        }

        saveFlags();
    },

    init: (deviceServicetag) => {
        readFlags(deviceServicetag);
    }
};

export const sharedData = (function() {
    let _state = {};

    return {
        get: (path) => _.get(_state, path),

        set: (path, val) => {
            _state = _.set(_state, path, val);
        },
    };
})();
