import * as _ from 'lodash';
import * as CONSTANTS from './lib/constants';

import {
    compareVersions,
    isLegacyVersion,
    isModernVersion,
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
        window.postMessage({action: CONSTANTS.TOGGLE_UI_EXTENSIONS_EVENT, payload: state}, '*');

        if (awaitResponse && !responseReceived) {
            setTimeout(sendMessage, 500);
        }
    };

    const listener = (event) => {
        const action = _.get(event, 'data.action', '');

        if (action !== CONSTANTS.TOGGLE_UI_EXTENSIONS_RECEIVED_EVENT) {
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
    toggleLayoutClass(state, CONSTANTS.NDM_LAYOUT_THEME_CLASS);

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
        stylesToInject = stylesObjectToArray(CONSTANTS.LEGACY_STYLES);
    } else if (isModernVersion(version)) {
        stylesToInject = stylesObjectToArray(CONSTANTS.STYLES_3X);
    } else if (isLegacyVersion(version)) {
        stylesToInject = stylesObjectToArray(CONSTANTS.STYLES_2X);
    } else {
        console.warn(`Unsupported ndw version: ${version}`);

        return;
    }

    const additionalStyles = _
        .chain(CONSTANTS.EXTRA_STYLES)
        .filter(item => {
            const lowerBound = !item.from
                || compareVersions(item.from, version) !== 1;

            const upperBound = !item.to
                || compareVersions(version, item.to) !== 1;

            return lowerBound && upperBound;
        })
        .flatMap(item => item.files)
        .value();

    if (additionalStyles.length > 0) {
        stylesToInject.push(additionalStyles);
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

        if (!keys.includes(CONSTANTS.BACKGROUND_PAGE_INITIALIZED_EVENT)) {
            return;
        }

        deregisterCallback(initCallbackId);

        setTimeout(() => {
            browser.storage.local.get().then(data => {
                const defaultValue = CONSTANTS.TOGGLE_DEFAULT_VALUES[CONSTANTS.UI_EXTENSIONS_KEY];
                const state = _.get(data, CONSTANTS.UI_EXTENSIONS_KEY, defaultValue);

                sendUiExtensionsState(state, true);
            });
        }, 100);
    });

    createStateController({
        portObj: bgConnect,
        sendMsgFn: sendMsg,
        queryMsg: CONSTANTS.THEME_IS_ENABLED_KEY,
        keyInResponse: CONSTANTS.THEME_IS_ENABLED_KEY,
        onStateChange: onThemeToggle,
    });

    createStateController({
        portObj: bgConnect,
        sendMsgFn: sendMsg,
        queryMsg: CONSTANTS.MENU_ANIMATIONS_KEY,
        keyInResponse: CONSTANTS.MENU_ANIMATIONS_KEY,
        onStateChange: toggleAnimationsCss,
    });

    createStateController({
        portObj: bgConnect,
        sendMsgFn: sendMsg,
        queryMsg:CONSTANTS.UI_EXTENSIONS_KEY,
        keyInResponse: CONSTANTS.UI_EXTENSIONS_KEY,
        onStateChange: hideUiExtensions,
    });

    injectScript('scripts/injectUiExtensions.js');

    isScriptReady = true;
};
const processSwitchportsTemplateMessage = async (event) => {
    const payload = _.get(event, 'data.payload');
    const dashboardData = _.get(payload, 'dashboard', {});
    const systemData = _.get(payload, 'system', {});
    const cableDiagnosticsData = _.get(payload, 'cableDiagnostics', {});

    const storageData = {};

    if (!_.isEmpty(dashboardData)) {
        storageData[CONSTANTS.DASHBOARD_SWITCHPORT_TEMPLATE_ORIGINAL_KEY] = dashboardData;
    }

    if (!_.isEmpty(systemData)) {
        storageData[CONSTANTS.SYSTEM_SWITCHPORT_TEMPLATE_ORIGINAL_KEY] = systemData;
    }

    if (!_.isEmpty(cableDiagnosticsData)) {
        storageData[CONSTANTS.CABLE_DIAGNOSTICS_TEMPLATE_ORIGINAL_KEY] = cableDiagnosticsData;
    }

    await browser.storage.local.set(storageData);
};

const sendStorageUntilJsInitialized = () => {
    const send = () => {
        setTimeout(() => {
            browser.storage.local.get().then((data) => {
                window.postMessage(
                    {
                        action: CONSTANTS.INITIAL_STORAGE_DATA,
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

            case CONSTANTS.ORIGINAL_SWITCHPORTS_TEMPLATE:
                await processSwitchportsTemplateMessage(event);
                break;

            case CONSTANTS.INJECTED_JS_INITIALIZED:
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

    if (!_.has(changes, CONSTANTS.SWITCHPORT_TEMPLATE_DATA_KEY)) {
        return;
    }

    window.postMessage(
        {
            action: CONSTANTS.RELOAD_PAGES_WITH_OVERRIDDEN_SWITCHPORTS,
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
