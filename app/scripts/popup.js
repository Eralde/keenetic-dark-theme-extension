import * as _ from 'lodash';

import {
    THEME_IS_ENABLED_KEY,
    MENU_ANIMATIONS_KEY,
    UI_EXTENSIONS_KEY,
} from './lib/constants';

import {
    hideElement,
    addCssClass,
    isElementVisible,
    isFirefox,
} from './lib/domUtils';

import {
    isModernVersion,
} from './lib/ndmUtils';

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

    if (_.get(bgPage, 'queryVersion')) {
        bgPage.queryVersion()
            .then(
                (response) => {
                    const version = _.get(response, 'response', '');

                    if (!isModernVersion(version)) {
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
        (val) => (bgPage.setThemeState || _.noop)(val)
    );

    processToggle(
        animationToggleInput,
        animationToggleLabel,
        MENU_ANIMATIONS_KEY,
        false,
        (val) => (bgPage.setAnimationsState || _.noop)(val)
    );

    processToggle(
        uiExtensionsToggleInput,
        uiExtensionsToggleLabel,
        UI_EXTENSIONS_KEY,
        true,
        (val) => (bgPage.setUiExtensionsState || _.noop)(val)
    );
});
