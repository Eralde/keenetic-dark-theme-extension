import {
    THEME_IS_ENABLED_KEY,
    MENU_ANIMATIONS_KEY,
    FW3X_BRANCHES,
    UI_EXTENSIONS_KEY,
} from './lib/constants';

import {
    getProp,
    NOOP,
} from './lib/ndmUtils';

import {
    hideElement,
    addCssClass,
    isElementVisible,
    isFirefox,
} from './lib/domUtils';

import {
    startsWith,
} from './lib/utils';

const processToggle = (
    toggleSelector,
    toggleLabelSelector,
    storageKey,
    defaultValue,
    onToggleClick,
) => {
    if (!isElementVisible(toggleSelector)) {
        return;
    }

    browser.storage.local.get(storageKey).then((res) => {
        const storageKeys = Object.keys(res);

        let toggleVal;

        if (!storageKeys.includes(storageKey)) {
            toggleVal = defaultValue;
        } else {
            toggleVal = res[storageKey];
        }

        toggleSelector.checked = toggleVal;
    });

    toggleLabelSelector.addEventListener('click', () => {
        const val = !toggleSelector.checked;

        onToggleClick(val);
        setTimeout(() => {
            toggleSelector.checked = val;
        });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    let bgPage;

    if (browser) {
        bgPage = browser.extension.getBackgroundPage();
    } else {
        bgPage = chrome
            ? chrome.extension.getBackgroundPage()
            : {};
    }

    const toggleWrapper = document.getElementById('animationsToggle-wrapper');

    if (getProp(bgPage, 'queryVersion')) {
        bgPage.queryVersion()
            .then(
                (response) => {
                    const version = getProp(response, 'response', '');
                    const is3xVersion = FW3X_BRANCHES.some(branch => startsWith(version, branch));

                    if (!is3xVersion) {
                        console.log('old version', response);
                        hideElement(toggleWrapper);
                    }
                },
                () => {
                    console.log('failed to get version');
                    hideElement(toggleWrapper)
                }
            );
    } else {
        console.log('failed to query version');
        hideElement(toggleWrapper);
    }

    const cssToggleInput = document.getElementById('cssToggle');
    const cssToggleLabel = document.querySelector('.css-toggle__label');

    const animationToggleInput = document.getElementById('animationsToggle');
    const animationToggleLabel = document.querySelector('.animation-toggle__label');

    const uiExtensionsToggleInput = document.getElementById('uiExtensionsToggle');
    const uiExtensionsToggleLabel = document.querySelector('.ui-extensions-toggle__label');

    if (isFirefox()) {
        addCssClass(
            [
                cssToggleLabel,
                animationToggleLabel,
                uiExtensionsToggleLabel,
            ],
            'toggle__label--ff'
        );
    }

    processToggle(
        cssToggleInput,
        cssToggleLabel,
        THEME_IS_ENABLED_KEY,
        true,
        (val) => (bgPage.setThemeState || NOOP)(val)
    );

    processToggle(
        animationToggleInput,
        animationToggleLabel,
        MENU_ANIMATIONS_KEY,
        false,
        (val) => (bgPage.setAnimationsState || NOOP)(val)
    );

    processToggle(
        uiExtensionsToggleInput,
        uiExtensionsToggleLabel,
        UI_EXTENSIONS_KEY,
        true,
        (val) => (bgPage.setUiExtensionsState || NOOP)(val)
    );
});
