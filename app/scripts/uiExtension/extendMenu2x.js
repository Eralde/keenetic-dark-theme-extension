import * as _ from 'lodash';

import {
    DIAGNOSTICS_LOG_STATE,
    LOG_LINK_CLASS,
    LOG_LINK_TITLE,
    REBOOT_LINK_TITLE,
    CONTROL_SYSTEM_STATE,
    WEBCLI_STATE,
} from '../lib/constants';

import {
    getAngularService,
    getNgL10n,
    onLanguageChange,
    addLinkToMenuSection,
} from '../lib/ndmUtils';

import {
    getMenuElementItem,
    clickOnTheRebootButton,
    getSpecialMenuItemClickListener,
} from '../lib/domUtils';

/*
 * This UI extension adds some items to the web UI side menu.
 * It should be used only for the 2.x firmware versions
 */

const $state = getAngularService('$state');

const FIRST_MENU_GROUP = 'menu.dashboard';
const SYSTEM_MENU_GROUP = 'menu.control';

const forceScopeDigest = ($scope) => {
    if (!['$apply', '$digest'].includes(_.get($scope, '$root.$$phase'))) {
        $scope.$apply();
    }
};

let watcherIsSet = false,
    extendMenuTimeout = null;

const setExtendMenuTimeout = () => {
    if (extendMenuTimeout) {
        return;
    }

    extendMenuTimeout = setTimeout(extendMenu2x, 1000);
};

const clearExtendMenuTimeout = () => {
    extendMenuTimeout = null
};

export const extendMenu2x = () => {
    clearExtendMenuTimeout();

    if (!$state.get(DIAGNOSTICS_LOG_STATE)) {
        return;
    }

    const $menuEl = angular.element(document.querySelector('.ndm-menu'));
    const $scope = $menuEl.scope();

    if (!$scope) {
        setExtendMenuTimeout();
        return;
    }

    if (!watcherIsSet) {
        $scope.$parent.$watch('menu.menuHierarchy', (newVal) => {
            addLinkToMenuSection({
                menu: newVal,
                menuSectionId: FIRST_MENU_GROUP,
                linkTitle: LOG_LINK_TITLE,
                linkSref: DIAGNOSTICS_LOG_STATE,
            });

            addLinkToMenuSection({
                menu: newVal,
                menuSectionId: SYSTEM_MENU_GROUP,
                linkTitle: 'WebCLI',
                linkSref: WEBCLI_STATE,
            });

            forceScopeDigest($scope);
        });

        watcherIsSet = true;
    }

    setExtendMenuTimeout();

    const logoutSection = document.querySelector('.ndm-menu ul[ng-if]');

    if (!logoutSection) {
        return;
    }

    const logLinkExists = [...document.querySelectorAll(`.${LOG_LINK_CLASS}`)].length > 0;

    if (logLinkExists) {
        setExtendMenuTimeout();
        return;
    }

    const firstGroup = [...document.querySelectorAll('.ndm-menu .ss-content ul')][0]; // firstGroupTitle.closest('.ndm-menu__group');

    if (!firstGroup) {
        return;
    }

    const {dupNode, linkEl} = getMenuElementItem(
        firstGroup,
        getNgL10n(LOG_LINK_TITLE),
        {
            href: '/controlPanel/diagnostics/log'
        });

    if (!dupNode) {
        return;
    }

    const rebootNode = dupNode.cloneNode(true);
    const link = rebootNode.querySelector('a');

    link.setAttribute('href', '/controlPanel/system');
    link.innerText = getNgL10n(REBOOT_LINK_TITLE);

    onLanguageChange(() => {
        link.innerText = getNgL10n(REBOOT_LINK_TITLE);
    });

    link.addEventListener(
        'click',
        getSpecialMenuItemClickListener({
            callback: clickOnTheRebootButton,
            stateName: CONTROL_SYSTEM_STATE,
            menuActionOnStateChange: ($rootScope) => {
                $rootScope.menuIsOpen = false;
            },
        }),
    );

    logoutSection.prepend(rebootNode);
};
