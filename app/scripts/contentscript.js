import * as _ from 'lodash';

import {
    THEME_IS_ENABLED_KEY,
    MENU_ANIMATIONS_KEY,
    UI_EXTENSIONS_KEY,
    LEGACY_STYLES,
    STYLES_2X,
    STYLES_3X,
    FW3X_BRANCHES,
    NDM_LAYOUT_THEME_CLASS,
    TOGGLE_UI_EXTENSIONS_EVENT,
    TOGGLE_UI_EXTENSIONS_RECEIVED_EVENT,
    BACKGROUND_PAGE_INITIALIZED_EVENT,
} from './lib/constants';

import {
    startsWith,
} from './lib/utils';

const stylesObjectToArray = (stylesObject) => {
    return Object.entries(stylesObject)
        .map(([key, value]) => ([value, key]));
};


const reloadTab = () => {
    browser.tabs.getSelected().then((tab) => {
        const code = 'window.location.reload();';
        browser.tabs.executeScript(tab.id, {code: code});
    });
};

let injectedStyles = {};
let stylesToInject = [];
let stylesInjected = false;
let bgConnect;
let sendMsg = _.noop;
let onMessageCallbacks = [];
let messagesQueue = [];
let isScriptReady = false;

const injectStyle = (fileName, stylesMapKey, node = 'body') => {
    const filePath = browser.extension.getURL(fileName);
    const parentEl = document.getElementsByTagName(node)[0];
    const linkEl = document.createElement('link');

    linkEl.setAttribute('rel', 'stylesheet');
    linkEl.setAttribute('href', filePath);
    parentEl.appendChild(linkEl);

    injectedStyles[stylesMapKey] = {parentEl, linkEl};
};

const injectScript = (fileName, node = 'body') => {
    const filePath = browser.extension.getURL(fileName);
    const parentEl = document.getElementsByTagName(node)[0];
    const scriptEl = document.createElement('script');

    scriptEl.setAttribute('type', 'module');
    scriptEl.setAttribute('src', filePath);
    parentEl.appendChild(scriptEl);
};

const toggleCss = (state, filterFn) => {
    try {
        const keys = Object.keys(injectedStyles);
        const cssKeys = keys.filter(filterFn);

        if (cssKeys[0]) {
            const key = cssKeys[0];
            const {parentEl, linkEl} = injectedStyles[key];

            if (!parentEl) {
                reloadTab();
                return;
            }

            if (state) {
                parentEl.appendChild(linkEl);
            } else if (parentEl.contains(linkEl)) {
                parentEl.removeChild(linkEl);
            }
        }

        return true;
    } catch (e) {
        console.warn('toggleCss: ', e);
        return false;
    }
};

const createStateController = ({portObj, sendMsgFn, queryMsg, keyInResponse, onStateChange}) => {
    let _controller = {
        _interval: null,
        _timeout: null,
        _lastState: undefined,
    };

    const queryState = () => sendMsgFn(queryMsg);

    queryState();
    _controller._interval = setInterval(queryState, 100);

    registerCallback((request) => {
        const keys = Object.keys(request);

        if (!keys.includes(keyInResponse)) {
            return;
        }

        if (_controller._interval) {
            clearInterval(_controller._interval);
            _controller._interval = null;
        }

        if (_controller._timeout) {
            clearTimeout(_controller._timeout);
            _controller._timeout = null;
        }

        const newVal = request[keyInResponse];

        if (newVal !== _controller._lastState) {
            const stateChangeRslt = onStateChange(newVal);

            if (stateChangeRslt) {
                _controller._lastState = newVal;
            }
        }

        _controller._timeout = setTimeout(queryState, 300);
    });
};

const getUniqueId = () => Date.now() + Math.floor(Math.random() * 100);

const registerCallback = (callback, runOnce = false) => {
    const uid = getUniqueId();

    onMessageCallbacks.push({
        callback,
        uid,
        runOnce,
    });

    return uid;
};

const deregisterCallback = (uid) => {
    onMessageCallbacks = onMessageCallbacks.filter(item => item.uid !== uid);
};

const reconnectToExtension = () => {
    bgConnect = null;
    sendMsg = _.noop;
    setTimeout(connectToExtension, 1000);
};

const connectToExtension = () => {
    bgConnect = browser.runtime.connect({name: 'injector'});
    bgConnect.onDisconnect.addListener(reconnectToExtension);

    sendMsg = (msg) => {
        if (bgConnect) {
            return bgConnect.postMessage({from: 'injector', msg});
        } else {
            console.warn('Failed to connect to extension\'s background page');
            return false;
        }
    }
};

connectToExtension();

const onMessage = (request) => {
    onMessageCallbacks.forEach(item => {
        item.callback(request);
    });

    onMessageCallbacks = onMessageCallbacks.filter(item => !item.runOnce);
};

bgConnect.onMessage.addListener((request) => {
    if (!isScriptReady) {
        if (request) {
            messagesQueue.push(request);
        }

        return;
    }

    let msg = messagesQueue.pop();

    while (msg) {
        onMessage(msg);
        msg = messagesQueue.pop();
    }

    setTimeout(() => {
        onMessage(request);
    });
});

const sendUiExtensionsState = (state, awaitResponse = false) => {
    let responseReceived = false;

    const sendMessage = () => {
        window.postMessage({action: TOGGLE_UI_EXTENSIONS_EVENT, payload: state}, '*');

        if (awaitResponse && !responseReceived) {
            setTimeout(sendMessage, 500);
        }
    };

    const listener = (event) => {
        const action = _.get(event, 'data.action', '');

        if (action !== TOGGLE_UI_EXTENSIONS_RECEIVED_EVENT) {
            return;
        }

        window.removeEventListener('message', listener);

        responseReceived = true;
    }

    window.addEventListener('message', listener);

    sendMessage();
};

const toggleThemeCss = (state) => toggleCss(state, css => css.includes('theme'));
const toggleAnimationsCss = (state) => toggleCss(!state, css => css.includes('no-menu-animation'));
const hideUiExtensions = (state) => {
    sendUiExtensionsState(state);

    return toggleCss(!state, css => css.includes('hideUi'));
}


const toggleLayoutClass = (state, className) => {
    const layoutElement = document.querySelector('.ndm-layout');

    if (!layoutElement) {
        return;
    }

    layoutElement.classList[state ? 'add' : 'remove'](className);
};

const onThemeToggle = (state) => {
    toggleLayoutClass(state, NDM_LAYOUT_THEME_CLASS);

    return toggleThemeCss(state);
};

let ndmVersion;

browser.runtime.onMessage.addListener(request => {
    if (request.ndmVersion) {
        return Promise.resolve({response: ndmVersion});
    }
});

injectScript('scripts/main.js');

window.addEventListener(
    'message',
    (event) => {
        if (event.data.action !== 'NDM_VER') {
            return;
        }

        const version = event.data.payload;
        const firstSymbol = version ? version[0] : '';

        const isLegacyVersion = firstSymbol === '0';
        const is2xVersion = firstSymbol === '1'; // 2.15, 2.14
        const is3xVersion = FW3X_BRANCHES.some(branch => startsWith(version, branch));

        ndmVersion = version;

        if (isLegacyVersion) {
            stylesToInject = stylesObjectToArray(LEGACY_STYLES);
        } else if (is3xVersion) {
            stylesToInject = stylesObjectToArray(STYLES_3X);
        } else if (is2xVersion) {
            stylesToInject = stylesObjectToArray(STYLES_2X);
        } else {
            console.warn(`Unsupported ndw version: ${version}`);

            return;
        }

        registerCallback(
            () => {
                stylesToInject.forEach(args => {
                    injectStyle(...args);
                });

                stylesInjected = true;
            },
            true,
        );

        const initCallbackId = registerCallback((request) => {
            const keys = Object.keys(request);

            if (!keys.includes(BACKGROUND_PAGE_INITIALIZED_EVENT)) {
                return;
            }

            deregisterCallback(initCallbackId);

            setTimeout(() => {
                browser.storage.local.get().then(data => {
                    const state = _.get(data, UI_EXTENSIONS_KEY, true);

                    sendUiExtensionsState(state, true);
                });
            }, 100);
        });

        createStateController({
            portObj: bgConnect,
            sendMsgFn: sendMsg,
            queryMsg: THEME_IS_ENABLED_KEY,
            keyInResponse: THEME_IS_ENABLED_KEY,
            onStateChange: onThemeToggle,
        });

        createStateController({
            portObj: bgConnect,
            sendMsgFn: sendMsg,
            queryMsg: MENU_ANIMATIONS_KEY,
            keyInResponse: MENU_ANIMATIONS_KEY,
            onStateChange: toggleAnimationsCss,
        });

        createStateController({
            portObj: bgConnect,
            sendMsgFn: sendMsg,
            queryMsg: UI_EXTENSIONS_KEY,
            keyInResponse: UI_EXTENSIONS_KEY,
            onStateChange: hideUiExtensions,
        });

        injectScript('scripts/injectUiExtensions.js');

        isScriptReady = true;
    },
    false,
);
