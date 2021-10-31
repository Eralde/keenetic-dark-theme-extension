import * as _ from 'lodash';

import {
    FLAGS, FLAGS_CHANGE_EVENT,
    NDM_PAGE_HEADER_TEMPLATE_PATH,
} from '../lib/constants';

import {
    callOnPageLoad,
    getAngularService,
    getNdmPageScope,
    subscribeOnRootScopeEvent,
} from '../lib/ndmUtils';

import {
    hostFilterConstructor,
    processAclConfigurations,
} from '../lib/filters';

import {
    isElementVisible,
} from '../lib/domUtils';

import {flags} from '../lib/state';
import {logWarning} from '../lib/log';
import {injectStringIntoTemplate} from '../lib/ngTemplate';
import filterToggleTemplate from '../../pages/ui/wifi-clients/wifi-clients.filter-toggle.html';
import filtersTemplate from '../../pages/ui/wifi-clients/wifi-clients.filters.html';

/*
 * This UI extension adds filters to the 'Wi-Fi clients' page
 */

const $timeout = getAngularService('$timeout');
const $q = getAngularService('$q');

const wifiClients = getAngularService('wifiClients');
const wirelessAcl = getAngularService('wirelessAcl');

const origWifiClientsGetData = _.get(wifiClients, 'getData');

const NDM_TABLE_SHIFTED_CLASS = 'ndm-table--shifted';
const FILTERS_TOGGLE_SELECTOR = '.wifiClients__filter-toggle__checkbox';

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
                const areFiltersVisible = isElementVisible(document.querySelector(FILTERS_TOGGLE_SELECTOR));

                data.clients = (globalFlags.get(FLAGS.SHOW_FILTERS) && areFiltersVisible)
                    ? clients
                        .filter(x => !hideUnregisteredHosts || x.name)
                        .filter(filterFn)
                    : clients;

                return data;
            });
    };
};

const addWifiClientsFilters = () => {
    let __VARS = {};

    const getDataForFilters = () => {
        return $q
            .all([
                origWifiClientsGetData(),
                wirelessAcl.getAclConfiguration(),
            ])
            .spread((clientsData, aclCfg) => {
                const regHosts = clientsData.clients || [];

                __VARS = processAclConfigurations(__VARS, regHosts, aclCfg);

                modifyWifiClientsService(flags, __VARS);
            });

    };

    callOnPageLoad(() => {
        $timeout(async () => {
            const pollerElements = [...document.querySelectorAll('.ndm-page__content > [ng-transclude]')];
            const pollerEl = pollerElements[pollerElements.length - 1];

            if (!pollerEl) {
                logWarning('Failed to get Wi-Fi clients devices table DOM element');
                return;
            }

            const $scope = await getNdmPageScope();
            const tableEl = document.querySelector('.ndm-table');

            const toggleTableClass = (isClassEnabled) => {
                if (isClassEnabled) {
                    tableEl.classList.add(NDM_TABLE_SHIFTED_CLASS);
                } else {
                    tableEl.classList.remove(NDM_TABLE_SHIFTED_CLASS);
                }
            }

            subscribeOnRootScopeEvent(
                $scope,
                FLAGS_CHANGE_EVENT,
                ($event, {flag, value}) => {
                    if (flag !== FLAGS.SHOW_FILTERS) {
                        return;
                    }

                    toggleTableClass(value);
                },
            );

            getDataForFilters().then(() => toggleTableClass(flags.get(FLAGS.SHOW_FILTERS)));
        });
    });
};

const cleanupWifiClientsFilters = () => {
    wifiClients.getData = origWifiClientsGetData;
};

const injectFiltersToggleTemplate = () => {
    injectStringIntoTemplate(
        NDM_PAGE_HEADER_TEMPLATE_PATH,
        filterToggleTemplate,
        [
            '</ndm-help>',
            '</span>',
        ],
        'failed to determine proper place to inject filter toggle checkbox',
    );
};


const injectFiltersTemplate = () => {
    injectStringIntoTemplate(
        NDM_PAGE_HEADER_TEMPLATE_PATH,
        filtersTemplate,
        [
            '</ndm-notifications-container>',
            '</div>',
        ],
        'failed to determine proper place to inject filters for the "Wi-Fi clients" table',
    );
};

export const wifiClientsFilters = {
    onInit: () => {
        injectFiltersToggleTemplate();
        injectFiltersTemplate();
    },
    onLoad: addWifiClientsFilters,
    onDestroy: cleanupWifiClientsFilters,
};
