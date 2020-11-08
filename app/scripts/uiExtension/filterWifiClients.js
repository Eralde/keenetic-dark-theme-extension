import {
    FILTERS_TOGGLE_CLASS,
    FLAGS,
    HIDE_CLASS,
    NDM_PAGE_SELECTOR,
    REG_DEVICES_FLAGS,
    UNREG_DEVICES_FLAGS,
} from '../lib/constants';

import {
    getAngularService,
    getProp,
} from '../lib/ndmUtils';

import {
    isHostInAcl,
    hostFilterConstructor,
} from '../lib/filters';

import {
    addFlagCheckbox,
    addFiltersToggleCheckbox,
    createDiv,
} from '../lib/domUtils';

import {
    flags,
} from '../lib/state';

/*
 * This UI extension adds filters to the 'Wi-Fi clients' page
 */

const $rootScope = getAngularService('$rootScope');
const $timeout = getAngularService('$timeout');
const $q = getAngularService('$q');
const _ = getAngularService('_');

const wifiClients = getAngularService('wifiClients');
const wirelessAcl = getAngularService('wirelessAcl');

const origWifiClientsGetData = getProp(wifiClients, 'getData');

const CONSTANT = getAngularService('CONSTANT');
const PAGE_LOADED = getProp(CONSTANT, 'events.PAGE_LOADED');

const NDM_TABLE_SHIFTED_CLASS = 'ndm-table--shifted';

/**
 * Replaces wifiClients.getData method with a function that modifies data received via the original fn
 */
const modifyWifiClientsService = (globalFlags, __VARS) => {
    const filterFn = hostFilterConstructor(
        globalFlags,
        host => host.isOffline,
        host => _.includes(__VARS.blockedInSomeSegment, host.mac),
    );

    wifiClients.getData = () => {
        return origWifiClientsGetData()
            .then(data => {
                const clients = data.clients.slice() || [];
                const hideUnregisteredHosts = globalFlags.get(FLAGS.HIDE_UNREGISTERED_HOSTS);
                const areFiltersVisible = getComputedStyle(__VARS.filtersToggleCheckbox).display !== 'none';

                data.clients = (globalFlags.get(FLAGS.SHOW_FILTERS) && areFiltersVisible)
                    ? clients
                        .filter(x => !hideUnregisteredHosts || x.name)
                        .filter(filterFn)
                    : clients;

                return data;
            });
    };
};

export const addWifiClientsFilters = () => {
    let __VARS = {};

    const getRowsToHide = (elToAppendTo, pageHeaderEl, tableEl) => {
        $q
            .all([
                origWifiClientsGetData(),
                wirelessAcl.getAclConfiguration(),
            ])
            .spread((clientsData, aclCfg) => {
                const regHosts = clientsData.clients || [];
                const acls = _.filter(aclCfg.segments, x => x.acl.type !== 'none');

                __VARS.blockedInSegment = {};
                __VARS.showBlockedInSegment = {};
                __VARS.blockedInSomeSegment = [];

                _.forEach(acls, segmentAcl => {
                    const acl = segmentAcl.acl;

                    __VARS.blockedInSegment[segmentAcl.id] = {
                        hosts: regHosts
                            .filter(h => isHostInAcl(h, acl))
                            .map(h => h.mac),

                        description: segmentAcl.description
                    };

                    __VARS.showBlockedInSegment[segmentAcl.id] = true;
                });

                modifyWifiClientsService(flags, __VARS);

                _.forEach(__VARS.blockedInSegment, data => {
                    __VARS.blockedInSomeSegment = __VARS.blockedInSomeSegment.concat(data.hosts);
                });

                __VARS.blockedInSomeSegment = _.uniqBy(__VARS.blockedInSomeSegment, angular.identity);

                const flexContainer = createDiv('devices-list-toolbar dark-theme__wifi-clients-filters');
                pageHeaderEl.appendChild(flexContainer);

                REG_DEVICES_FLAGS.forEach(flag => {
                    addFlagCheckbox(
                        flags,
                        {
                            parentEl: flexContainer,
                            flagName: flag,
                            flagLabelL10nId: flag,
                            ctrlName: __VARS.ctrlName,
                        },
                    );
                });

                UNREG_DEVICES_FLAGS.forEach(flag => {
                    addFlagCheckbox(
                        flags,
                        {
                            parentEl: flexContainer,
                            flagName: flag,
                            flagLabelL10nId: flag,
                            ctrlName: __VARS.ctrlName,
                        },
                    );
                });

                const filtersToggleEl = addFiltersToggleCheckbox(
                    flags,
                    __VARS,
                    pageHeaderEl,
                    [flexContainer],
                    [],
                    (val) => {
                        const fnName = val ? 'add' : 'remove';

                        tableEl.classList[fnName](NDM_TABLE_SHIFTED_CLASS);
                    }
                );

                __VARS.filtersToggleCheckbox = filtersToggleEl.closest(`.${FILTERS_TOGGLE_CLASS}`);

                if (!flags.get(FLAGS.SHOW_FILTERS)) {
                    flexContainer.classList.add(HIDE_CLASS);
                } else {
                    tableEl.classList.add(NDM_TABLE_SHIFTED_CLASS);
                }
            });

    };

    const unbinder = $rootScope.$on(PAGE_LOADED, () => {
        unbinder();

        $timeout(() => {
            const pollerElements = [...document.querySelectorAll('.ndm-page__content > [ng-transclude]')];
            const pollerEl = pollerElements[pollerElements.length - 1];

            if (!pollerEl) {
                console.warn('Failed to get Wi-Fi clients devices table DOM element');
                return;
            }

            const ctrl = angular.element(document.querySelector(NDM_PAGE_SELECTOR)).controller();

            __VARS.ctrlName = 'WifiClientsController';
            window[__VARS.ctrlName] = ctrl;

            const parentEl = document.querySelector('.ndm-page-header');
            const tableEl = document.querySelector('.ndm-table');

            getRowsToHide(pollerEl, parentEl, tableEl);
        });
    });
};

export const cleanupWifiClientsFilters = () => {
    wifiClients.getData = origWifiClientsGetData;
};
