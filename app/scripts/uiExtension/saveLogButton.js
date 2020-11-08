import {
    getAngularService,
    getProp,
} from '../lib/ndmUtils';

import {
    createElement,
} from '../lib/domUtils';

import {
    SAVE_LOG_BTN_CLASS,
} from '../lib/constants';

/*
 * This UI extension adds 'Save log' button to the 'System log' popup
 */

const CONSTANT = getAngularService('CONSTANT');
const EVENTS = getProp(CONSTANT, 'events', {});

const router = getAngularService('router');

window.downloadLog = () => window.location.assign(router.constants.CI_URL + '/log.txt');

export const addSaveLogButton = () => {
    const $rootScope = getAngularService('$rootScope');
    const $timeout = getAngularService('$timeout');

    const pageUnbinder = $rootScope.$on(EVENTS.PAGE_LOADED, () => {
        pageUnbinder();

        $timeout(() => {
            const logPopupEls = [...document.querySelectorAll('.diagnostics-log-popup [init-scroll]')];
            const logPopupEl = logPopupEls[0];

            if (logPopupEl) {
                logPopupEl.setAttribute('noscroll', true);
            }
        });
    });

    const unbinder = $rootScope.$on(EVENTS.POPUP_OPENED, () => {
        unbinder();

        $timeout(() => {
            const panels = [...document.querySelectorAll('.diagnostics-log-popup__panel')];
            const panelEl = panels[0];

            if (!panelEl) {
                console.warn('Failed to get popup panel DOM element');
                return;
            }

            const btnTitle = getAngularService('$translate').instant('diagnostics.log.popup-log.save-local');
            const saveLogBtn = createElement(
                `<button class="btn" onclick="downloadLog();">${btnTitle}</button>`,
                SAVE_LOG_BTN_CLASS,
            );
            panelEl.append(saveLogBtn);
        });
    });
};
