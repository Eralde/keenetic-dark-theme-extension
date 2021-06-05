import * as _ from 'lodash';

import {
    THEME_IS_ENABLED_KEY,
    MENU_ANIMATIONS_KEY,
    UI_EXTENSIONS_KEY,
    TOGGLE_DEFAULT_VALUES,
    LEGACY_STYLES,
    STYLES_2X,
    STYLES_3X,
    NDM_LAYOUT_THEME_CLASS,
    TOGGLE_UI_EXTENSIONS_EVENT,
    TOGGLE_UI_EXTENSIONS_RECEIVED_EVENT,
    BACKGROUND_PAGE_INITIALIZED_EVENT,
    ORIGINAL_SWITCHPORTS_TEMPLATE,
    RELOAD_PAGES_WITH_OVERRIDDEN_SWITCHPORTS,
    INJECTED_JS_INITIALIZED,
    INITIAL_STORAGE_DATA,
    DASHBOARD_SWITCHPORT_TEMPLATE_ORIGINAL_KEY,
    SWITCHPORT_TEMPLATE_DATA_KEY,
    SYSTEM_SWITCHPORT_TEMPLATE_ORIGINAL_KEY,
} from './lib/constants';

import {
    is2xVersion,
    is3xVersion,
} from './lib/ndmUtils';

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
let injectedJsInitialized = false;
let backgroundMessageListenerRegistered = false;
let ndmVersion;

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

const onMessage = (request) => {
    onMessageCallbacks.forEach(item => {
        item.callback(request);
    });

    onMessageCallbacks = onMessageCallbacks.filter(item => !item.runOnce);
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

    if (!backgroundMessageListenerRegistered) {
        backgroundMessageListenerRegistered = true;

        bgConnect.onMessage.addListener((request) => {
            if (!isScriptReady) {
                if (request) {
                    messagesQueue.push(request);
                }

                return;
            }

            // Clear queue
            let msg = messagesQueue.pop();

            while (msg) {
                onMessage(msg);
                msg = messagesQueue.pop();
            }

            // Process new message
            setTimeout(() => {
                onMessage(request);
            });
        });
    }
};

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

browser.runtime.onMessage.addListener(request => {
    if (request.ndmVersion) {
        return Promise.resolve({response: ndmVersion});
    }
});

const processNdmVerMessage = (event) => {
    const version = event.data.payload;

    ndmVersion = version;

    if (version.startsWith('0')) {
        stylesToInject = stylesObjectToArray(LEGACY_STYLES);
    } else if (is3xVersion(version)) {
        stylesToInject = stylesObjectToArray(STYLES_3X);
    } else if (is2xVersion(version)) {
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
                const state = _.get(data, UI_EXTENSIONS_KEY, TOGGLE_DEFAULT_VALUES[UI_EXTENSIONS_KEY]);

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
};
const processSwitchportsTemplateMessage = async (event) => {
    const payload = _.get(event, 'data.payload');
    const dashboardData = _.get(payload, 'dashboard', {});
    const systemData = _.get(payload, 'system', {});

    const storageData = {};

    if (!_.isEmpty(dashboardData)) {
        storageData[DASHBOARD_SWITCHPORT_TEMPLATE_ORIGINAL_KEY] = dashboardData;
    }

    if (!_.isEmpty(systemData)) {
        storageData[SYSTEM_SWITCHPORT_TEMPLATE_ORIGINAL_KEY] = systemData;
    }

    await browser.storage.local.set(storageData);
};

const sendStorageUntilJsInitialized = () => {
    const send = () => {
        setTimeout(() => {
            browser.storage.local.get().then((data) => {
                window.postMessage(
                    {
                        action: INITIAL_STORAGE_DATA,
                        payload: data,
                    },
                    {
                        origin: '*',
                    },
                );


                if (!injectedJsInitialized) {
                    setTimeout(send, 100);
                }
            });
        });
    }

    send();
}

window.addEventListener(
    'message',
    async (event) => {
        const action = _.get(event, 'data.action');


        switch (action) {
            case 'NDM_VER': // intentionally not a constant
                processNdmVerMessage(event);
                break;

            case ORIGINAL_SWITCHPORTS_TEMPLATE:
                await processSwitchportsTemplateMessage(event);
                break;

            case INJECTED_JS_INITIALIZED:
                injectedJsInitialized = true;
                break;
        }
    },
    false,
);

browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') {
        return;
    }

    if (!_.has(changes, SWITCHPORT_TEMPLATE_DATA_KEY)) {
        return;
    }

    window.postMessage(
        {
            action: RELOAD_PAGES_WITH_OVERRIDDEN_SWITCHPORTS,
            payload: true,
        },
        {
            origin: '*',
        },
    );
});

injectScript('scripts/main.js');
connectToExtension();
sendStorageUntilJsInitialized();
