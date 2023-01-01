import * as _ from 'lodash';

import {
    callOnPageLoad,
    getAngularService,
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
const NDW_EVENTS = _.get(CONSTANT, 'events', {});

const router = getAngularService('router');

window.downloadLog = () => window.location.assign(router.constants.CI_URL + '/log.txt');

const addSaveLogButton = () => {
    const $rootScope = getAngularService('$rootScope');
    const $timeout = getAngularService('$timeout');

    callOnPageLoad(() => {
        $timeout(() => {
            const logPopupEls = [...document.querySelectorAll('.diagnostics-log-popup [init-scroll]')];
            const logPopupEl = logPopupEls[0];

            if (logPopupEl) {
                logPopupEl.setAttribute('noscroll', true);
            }
        });
    });

    const unbinder = $rootScope.$on(NDW_EVENTS.POPUP_OPENED, () => {
        unbinder();

        $timeout(() => {
            const panels = [...document.querySelectorAll('.diagnostics-log-popup__panel')];
            const panelEl = panels[0];

            if (!panelEl) {
                console.warn('Failed to get popup panel DOM element');
                return;
            }

            const buttons = [...panelEl.querySelectorAll('button')];

            if (buttons.length > 1) { // 'Save to computer' button already present in the web UI
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

export const saveLogButton = {
    onLoad: addSaveLogButton,
};
