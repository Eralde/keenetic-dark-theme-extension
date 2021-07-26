import * as _ from 'lodash';

import {
    LOG_LINK_CLASS,
    LOG_LINK_TITLE,
    REBOOT_LINK_CLASS,
    REBOOT_LINK_TITLE,
    CONTROL_SYSTEM_STATE,
    DIAGNOSTICS_LOG_STATE,
    DASHBOARD_TITLE,
    NDM_MENU_SELECTOR,
    WEBCLI_STATE,
    DIAGNOSTICS_STATE,
    DSL_DIAGNOSTICS_LINK_CLASS,
} from '../lib/constants';

import {
    getAngularService,
    getNgL10n,
    onLanguageChange,
    addLinkToMenuSection,
    forceScopeDigest,
} from '../lib/ndmUtils';

import {
    getMenuElementItem,
    getSpecialMenuItemClickListener,
    clickOnTheRebootButton,
    goToDslTab,
} from '../lib/domUtils';

import {
    sharedData
} from '../lib/state';

/*
 * This UI extension adds some items to the web UI side menu.
 * It should be used only for the 3.x firmware versions
 */

const utils = getAngularService('utils');

const FIRST_MENU_GROUP = 'menu.dashboard';
const SYSTEM_MENU_GROUP = 'menu.control';

let extendMenuTimeout = null;

const setExtendMenuTimeout = () => {
    if (extendMenuTimeout) {
        return;
    }

    extendMenuTimeout = setTimeout(extendMenu3x, 1000);
};

const clearExtendMenuTimeout = () => {
    extendMenuTimeout = null
};

const getDslDiagnosticsLinkTitle = () => {
    return `${utils.getTranslation('menu.diagnostics')} -> ${utils.getTranslation('diagnostics.tabs.dsl')}`;
}

export const extendMenu3x = () => {
    clearExtendMenuTimeout();

    const $menuEl = angular.element(document.querySelector(NDM_MENU_SELECTOR));
    const $scope = $menuEl.scope();

    const NDM = _.get(window, 'NDM', {});
    const isDslDevice = _.has(NDM, 'profile.components.dsl')
        || _.get(NDM, 'DSL_ALWAYS_PRESENT', false);

    if (!$scope) {
        setExtendMenuTimeout();
        return;
    }

    const $stateRegistry = getAngularService('$stateRegistry');
    const logState = _.get($stateRegistry, ['states', DIAGNOSTICS_STATE], {});

    // 'tab' parameter is added since 3.7B2
    const hasTabParam = !_.isEmpty(logState.params);

    $scope.$watch('vm.menuHierarchy', (newVal) => {
        const logLinkParams = hasTabParam
            ? {tab: utils.getTranslation('diagnostics.tabs.main')}
            : {};

        addLinkToMenuSection({
            menu: newVal,
            menuSectionId: FIRST_MENU_GROUP,
            linkTitle: LOG_LINK_TITLE,
            linkSref: DIAGNOSTICS_LOG_STATE,
            srefParams: logLinkParams,
        });

        addLinkToMenuSection({
            menu: newVal,
            menuSectionId: SYSTEM_MENU_GROUP,
            linkTitle: 'WebCLI',
            linkSref: WEBCLI_STATE,
        });

        if (isDslDevice) {
            const title = getDslDiagnosticsLinkTitle();

            addLinkToMenuSection({
                menu: newVal,
                menuSectionId: FIRST_MENU_GROUP,
                linkTitle: title,
                linkSref: DIAGNOSTICS_STATE,
            });
        }

        forceScopeDigest($scope);
    });

    if (_.isObject($scope.vm) && !sharedData.get('menuObjectSaved')) {
        sharedData.set('originalMenuOnItemClick', _.get($scope.vm, 'onItemClick'));
        sharedData.set('menuController', $scope.vm);
        sharedData.set('menuObjectSaved', true);
    }

    const menuSeparator = document.querySelector('.ndm-menu__separator:not([ng-click])');

    if (menuSeparator) {
        menuSeparator.style.cursor = 'pointer';
        menuSeparator.addEventListener('click', () => _.invoke($scope, 'vm.toggle'));
    }

    // TODO: refactor code below
    let dupNode;
    let dslDiagnosticsElement;

    try {
        const menuGroups = [...document.querySelectorAll('.ndm-menu__group')];
        const firstGroup = menuGroups[0];
        const {dupNodeEl, linkEl} = getMenuElementItem(
            firstGroup,
            getNgL10n(DASHBOARD_TITLE),
            {
                itemSelector: '.ndm-menu__item',
                classToAdd: LOG_LINK_CLASS,
                activeItemClass: 'foo', // ndm-menu__item--active',
            }
        );

        dupNode = linkEl;

        const dslDiagnosticsSelector = `[data-ui-sref="${DIAGNOSTICS_STATE}(point.srefParams)"]`;
        dslDiagnosticsElement = firstGroup.querySelector(dslDiagnosticsSelector);

        if (isDslDevice && !dslDiagnosticsElement) {
            throw new Error('Failed to get DSL diagnostics selector element');
        }

    } catch (e) {
        setExtendMenuTimeout();
        return;
    }

    const rebootLinkExists = [...document.querySelectorAll(`.${REBOOT_LINK_CLASS}`)].length > 0;

    if (!dupNode || rebootLinkExists) {
        setExtendMenuTimeout();
        return;
    }

    const logoutSection = document.querySelector('.ndm-menu__logout');

    if (!logoutSection) {
        setExtendMenuTimeout();
        return;
    }

    logoutSection.style['height'] = 'auto';

    const link = dupNode.cloneNode(true);

    link.classList.add(REBOOT_LINK_CLASS);
    link.innerText = getNgL10n(REBOOT_LINK_TITLE);

    onLanguageChange(() => {
        link.innerText = getNgL10n(REBOOT_LINK_TITLE);
    });

    const closeOverlayMenu = ($rootScope, menuScope, isSameState) => {
        if (!isSameState) {
            $rootScope.menuIsOpenOverlayed = false;

            return;
        }

        if (_.has(menuScope, 'vm.onOverlayClick')) {
            _.invoke(menuScope, 'vm.onOverlayClick');
        } else {
            $rootScope.menuIsOpenOverlayed = false;
        }
    };

    link.addEventListener(
        'click',
        getSpecialMenuItemClickListener({
            callback: clickOnTheRebootButton,
            stateName: CONTROL_SYSTEM_STATE,
            menuActionOnStateChange: closeOverlayMenu,
            menuScope: $scope,
        }),
    );

    logoutSection.prepend(link);

    if (dslDiagnosticsElement) {
        dslDiagnosticsElement.classList.add(DSL_DIAGNOSTICS_LINK_CLASS);
        dslDiagnosticsElement.addEventListener(
            'click',
            getSpecialMenuItemClickListener({
                callback: goToDslTab,
                stateName: DIAGNOSTICS_STATE,
                menuActionOnStateChange: closeOverlayMenu,
                menuScope: $scope,
            }),
        );
    }

    setExtendMenuTimeout();
};
