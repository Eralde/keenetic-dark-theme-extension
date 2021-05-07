import * as _ from 'lodash';

import {
    THEME_IS_ENABLED_KEY,
    THEME_IS_ENABLED_WINDOW_PROP,
    MENU_ANIMATIONS_KEY,
    MENU_ANIMATIONS_WINDOW_PROP,
    UI_EXTENSIONS_KEY,
    UI_EXTENSIONS_WINDOW_PROP,
    ENABLED_ICONS,
    DISABLED_ICONS,
    BACKGROUND_PAGE_INITIALIZED_EVENT,
} from './lib/constants';

const updateIcons = (themeIsEnabled) => {
    const icons = themeIsEnabled
        ? ENABLED_ICONS
        : DISABLED_ICONS;

    browser.browserAction.setIcon({path: icons});
};

window[THEME_IS_ENABLED_WINDOW_PROP] = undefined;
window[MENU_ANIMATIONS_WINDOW_PROP] = undefined;
window[UI_EXTENSIONS_WINDOW_PROP] = undefined;

const initFlag = (port, key, defaultValue, windowProp, onInit = _.noop) => {
    return browser.storage.local.get(key).then((res) => {
        const storageKeys = Object.keys(res);

        let keyVal;

        if (!storageKeys.includes(key)) {
            keyVal = defaultValue;
        } else {
            keyVal = res[key];
        }

        window[windowProp] = keyVal;
        onInit(keyVal);

        port.onMessage.addListener((request) => {
            if (request.msg === key) {
                port.postMessage({[key]: window[windowProp]});
            }
        });
    });
};

window.queryVersion = () => {
    return browser.tabs.query({active: true, currentWindow: true})
        .then((tabs) => {
            if (!tabs[0]) {
                return;
            }

            return browser.tabs.sendMessage(
                tabs[0].id,
                {ndmVersion: '?'}
            );
        });
};

browser.runtime.onConnect.addListener((port) => {
    window.setThemeState = (state) => {
        if (typeof state === 'undefined') {
            return;
        }

        window[THEME_IS_ENABLED_WINDOW_PROP] = state;
        browser.storage.local.set({[THEME_IS_ENABLED_KEY]: state});
        port.postMessage({[THEME_IS_ENABLED_KEY]: state});
        updateIcons(state);
    };

    window.setAnimationsState = (state) => {
        if (typeof state === 'undefined') {
            return;
        }

        window[MENU_ANIMATIONS_WINDOW_PROP] = state;
        browser.storage.local.set({[MENU_ANIMATIONS_KEY]: state});
        port.postMessage({[MENU_ANIMATIONS_KEY]: state});
    };

    window.setUiExtensionsState = (state) => {
        if (typeof state === 'undefined') {
            return;
        }

        window[UI_EXTENSIONS_WINDOW_PROP] = state;
        browser.storage.local.set({[UI_EXTENSIONS_KEY]: state});
        port.postMessage({[UI_EXTENSIONS_KEY]: state});
    };

    let isInitialized = false;

    const pingAfterInit = () => {
        port.postMessage({[BACKGROUND_PAGE_INITIALIZED_EVENT]: true});

        setTimeout(pingAfterInit, 1000);
    }

    const onInit = () => {
        if (isInitialized) {
            return;
        }

        isInitialized = true;

        setTimeout(() => {
            pingAfterInit();

            browser.tabs.onActivated.addListener(() => {
                setTimeout(() => {
                    window.setThemeState(window[THEME_IS_ENABLED_WINDOW_PROP]);
                    window.setAnimationsState(window[MENU_ANIMATIONS_KEY]);
                    window.setUiExtensionsState(window[UI_EXTENSIONS_KEY]);
                }, 200);
            });

            browser.commands.onCommand.addListener((command) => {
                if (command === 'toggle-theme') {
                    window.setThemeState(!window[THEME_IS_ENABLED_WINDOW_PROP]);
                }
            });
        }, 0);
    };


    initFlag(port, THEME_IS_ENABLED_KEY, true, THEME_IS_ENABLED_WINDOW_PROP, updateIcons)
        .then(() => initFlag(port, MENU_ANIMATIONS_KEY, false, MENU_ANIMATIONS_WINDOW_PROP))
        .then(() => initFlag(port, UI_EXTENSIONS_KEY, true, UI_EXTENSIONS_WINDOW_PROP))
        .then(() => {
            onInit();
        });

    setTimeout(onInit, 1000);
});
