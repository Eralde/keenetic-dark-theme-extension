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
} from '../lib/constants';

import {
    getAngularService,
    getL10n,
    onLanguageChange,
    addLinkToMenuSection,
} from '../lib/ndmUtils';

import {
    getMenuElementItem,
    clickOnTheRebootButton,
} from '../lib/domUtils';

import {
    sharedData
} from "../lib/state";

/*
 * This UI extension adds some items to the web UI side menu.
 * It should be used only for the 3.x firmware versions
 */

const $rootScope = getAngularService('$rootScope');
const $state = getAngularService('$state');
const $q = getAngularService('$q');

const CONSTANT = getAngularService('CONSTANT');
const PAGE_LOADED = _.get(CONSTANT, 'events.PAGE_LOADED');
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

const forceScopeDigest = ($scope) => {
    if (!['$apply', '$digest'].includes(_.get($scope, '$root.$$phase'))) {
        $scope.$apply();
    }
};

export const extendMenu3x = () => {
    clearExtendMenuTimeout();

    const $menuEl = angular.element(document.querySelector(NDM_MENU_SELECTOR));
    const $scope = $menuEl.scope();

    if (!$scope) {
        setExtendMenuTimeout();
        return;
    }

    $scope.$watch('vm.menuHierarchy', (newVal) => {
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

    if (_.isObject($scope.vm) && !sharedData.get('menuObjectSaved')) {
        sharedData.set('originalMenuOnItemClick', _.get($scope.vm, 'onItemClick'));
        sharedData.set('menuController', $scope.vm);
        sharedData.set('menuObjectSaved', true);
    }

    // TODO: refactor code below
    let dupNode;

    try {
        const menuGroups = [...document.querySelectorAll('.ndm-menu__group')];
        const firstGroup = menuGroups[0];
        const {dupNodeEl, linkEl} = getMenuElementItem(
            firstGroup,
            getL10n(DASHBOARD_TITLE),
            {
                itemSelector: '.ndm-menu__item',
                classToAdd: LOG_LINK_CLASS,
                activeItemClass: 'foo', // ndm-menu__item--active',
            }
        );

        dupNode = linkEl;
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
    link.innerText = getL10n(REBOOT_LINK_TITLE);

    onLanguageChange(() => {
        link.innerText = getL10n(REBOOT_LINK_TITLE);
    });

    link.addEventListener('click', ($event) => {
        if (!$rootScope.menuIsOpen) {
            return;
        }

        $event.preventDefault();
        $event.stopPropagation();

        const currentState = $state.current.name;
        const promise = currentState === CONTROL_SYSTEM_STATE
            ? $q.when(true)
            : $state.go(CONTROL_SYSTEM_STATE);

        return promise
            .then(() => {
                if ($rootScope) {
                    $rootScope.menuIsOpenOverlayed = false;
                }

                let promise = $q.when(true);

                if (currentState !== CONTROL_SYSTEM_STATE) {
                    const deferred = $q.defer();
                    promise = deferred.promise;

                    const unbinder = $rootScope.$on(PAGE_LOADED, () => {
                        unbinder();
                        deferred.resolve();
                    });
                }

                promise.then(clickOnTheRebootButton);
            });
    });

    logoutSection.prepend(link);

    setExtendMenuTimeout();
};
