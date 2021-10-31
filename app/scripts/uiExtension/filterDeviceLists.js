import * as _ from 'lodash';

import {
    FLAGS,
    HIDDEN_TABLE_ROW_CLASS,
    DEVICES_LIST_TEMPLATE_PATH,
    FLAGS_CHANGE_EVENT,
    NDM_PAGE_HEADER_TEMPLATE_PATH,
    SHOW_IP_HOTSPOT,
    UI_EXTENSIONS_KEY,
    FILTERS_ARE_VISIBLE_CLASS,
} from '../lib/constants';

import {
    getAngularService,
    requestContainsPath,
    getPathIndexInRequest,
    forceScopeDigest,
    callOnPageLoad,
    getNdmPageScope,
    subscribeOnRootScopeEvent,
} from '../lib/ndmUtils';

import {
    processAclConfigurations,
    hostFilterConstructor,
} from '../lib/filters';

import {
    toggleCssClass,
    isElementVisible,
} from '../lib/domUtils';

import {flags, sharedData} from '../lib/state';
import {injectStringIntoTemplate} from '../lib/ngTemplate';

import registeredDeviceFiltersTemplate from '../../pages/ui/device-lists/device-lists.registered-devices.filters.html';
import unregisteredDeviceFiltersTemplate from '../../pages/ui/device-lists/device-lists.unregistered-devices.filters.html';
import filterToggleTemplate from '../../pages/ui/device-lists/device-lists.filter-toggle.html';
import {logWarning} from '../lib/log';

/*
 * This UI extension adds filters to device lists on the 'Device lists' page
 */

const CTX_NAME = 'DevicesList';
const MAC_REGEXP = /^[0-9a-f]{1}[02468ace]{1}(?:[\:\- ]?[0-9a-f]{2}){5}$/i;
const FILTERS_TOGGLE_SELECTOR = '.devices-lists__filter-toggle__checkbox';

const $timeout = getAngularService('$timeout');
const $q = getAngularService('$q');
const $rootScope = getAngularService('$rootScope');

const router = getAngularService('router');
const wirelessAcl = getAngularService('wirelessAcl');

const origPost = _.get(router, 'post');
const origPostToRciRoot = _.get(router, 'postToRciRoot');

let _MACS_TO_HIDE = [];
let _MAC_BY_NAME = {};

/**
 * Replaces router.post & routerService.postToRciRoot methods
 * with a function that modifies 'show ip hotspot' data
 */
const modifyShowIpHotspotData = (globalFlags, __VARS, routerService) => {
    const filterFn = hostFilterConstructor(
        globalFlags,
        host => host.link === 'down',
        host => _.includes(__VARS.blockedInSomeSegment, host.mac),
    );

    const getHosts = (hosts) => {
        _MAC_BY_NAME = hosts.reduce(
            (acc, item) => {
                if (!item.name) {
                    return acc;
                }

                return {
                    ...acc,
                    [item.name]: item.mac,
                };
            },
            {},
        );

        const hideUnregisteredHosts = globalFlags.get(FLAGS.HIDE_UNREGISTERED_HOSTS);

        const filtersToggleCheckbox = document.querySelector(FILTERS_TOGGLE_SELECTOR);
        const areFiltersVisible = isElementVisible(filtersToggleCheckbox);

        const shouldApplyFilters = globalFlags.get(FLAGS.SHOW_FILTERS) && areFiltersVisible;

        if (!shouldApplyFilters) {
            _MACS_TO_HIDE = [];

            return hosts;
        }

        const filteredHosts = hosts
            .filter(filterFn)
            .filter(x => !hideUnregisteredHosts || x.registered);

        _MACS_TO_HIDE = hosts
            .filter(host => !filteredHosts.some(fhost => fhost.mac === host.mac))
            .map(row => row.mac);

        return hosts;
    };

    const getThenFn = (hostsPath, deferred) => {
        return (data) => {
            const hosts = _.get(data, hostsPath, {}).host || [];

            data = _.set(
                data,
                hostsPath,
                {
                    host: getHosts(hosts),
                },
            );

            deferred.resolve(data);
        }
    };

    routerService.postToRciRoot = (...args) => {
        const req = args[0];

        if (!requestContainsPath(req, SHOW_IP_HOTSPOT)) {
            return origPostToRciRoot(...args);
        }

        const deferred = $q.defer();
        const pathIndex = getPathIndexInRequest(req, SHOW_IP_HOTSPOT);
        const thenFn = getThenFn(`${pathIndex}.${SHOW_IP_HOTSPOT}`, deferred);

        origPostToRciRoot(...args)
            .then(thenFn);

        return deferred.promise;
    };

    routerService.post = (...args) => {
        const req = args[0];

        if (!requestContainsPath(req, SHOW_IP_HOTSPOT)) {
            return origPost.apply(routerService, args);
        }

        const deferred = $q.defer();
        const thenFn = getThenFn(SHOW_IP_HOTSPOT, deferred);

        origPost(...args)
            .then(thenFn);

        return deferred.promise;
    }
};

const addDeviceListsFilters = () => {
    let __VARS = {};

    const getRowsToHide = () => {
        return $q
            .all([
                router.get(SHOW_IP_HOTSPOT.replace(/\./g, '/')),
                wirelessAcl.getAclConfiguration(),
            ])
            .then(([hotspot, aclCfg]) => {
                const hosts = hotspot.host || [];
                const regHosts = _.uniqBy(hosts.filter(x => x.registered), 'mac');

                __VARS = processAclConfigurations(__VARS, regHosts, aclCfg);

                modifyShowIpHotspotData(flags, __VARS, router);
            });

    };

    callOnPageLoad(() => {
        $timeout(async () => {
            const tableHeaders = [...document.querySelectorAll('.ndm-title')];

            if (tableHeaders.length < 2) {
                logWarning('Failed to get DOM element for one of the table headers');
                return;
            }

            const toggleTableHeaderClasses = (areFiltersVisible) => {
                toggleCssClass(tableHeaders, FILTERS_ARE_VISIBLE_CLASS, areFiltersVisible);
            };

            const $scope = await getNdmPageScope();

            const applyFilters = (ipCells, filterInputValue = '') => {
                const hostRows = ipCells
                    .map(cell => [cell, cell.innerText.split('\n')])
                    .filter(([, lines]) => lines.some(line => MAC_REGEXP.test(line)));

                const [toHide, toShow] = _.partition(
                    hostRows,
                    ([, lines]) => {
                        if (!sharedData.get(UI_EXTENSIONS_KEY)) {
                            return false;
                        }

                        if (lines.some(line => _MACS_TO_HIDE.includes(line))) {
                            return true;
                        }

                        if (!filterInputValue) {
                            return false;
                        }

                        const macsFilteredByName = _.filter(
                            _MAC_BY_NAME,
                            (mac, name) => !name.toLocaleLowerCase().includes(filterInputValue.toLocaleLowerCase()),
                        );

                        return lines.some(line => macsFilteredByName.includes(line));
                    },
                );

                const rowsToHide = toHide.map(el => el[0].closest('tr'));
                toggleCssClass(rowsToHide, HIDDEN_TABLE_ROW_CLASS, true);

                const rowsToShow = toShow.map(el => el[0].closest('tr'));
                toggleCssClass(rowsToShow, HIDDEN_TABLE_ROW_CLASS, false);
            };

            const onFiltersChange = (nameFilterValue) => {
                const ipCells = [
                    ...document.querySelectorAll('.table-ip')
                ];

                applyFilters(ipCells, nameFilterValue);
                forceScopeDigest($scope);
            };

            $rootScope.kdte.registerCallback(
                CTX_NAME,
                'filterDevicesList',
                (filterValue) => onFiltersChange(filterValue),
            );

            const filterInputModelName = 'nameFilter'

            $rootScope.kdte.registerModel(
                CTX_NAME,
                filterInputModelName,
                '',
            );

            subscribeOnRootScopeEvent(
                $scope,
                FLAGS_CHANGE_EVENT,
                ($event, {flag, value}) => {
                    if (flag !== FLAGS.SHOW_FILTERS) {
                        $timeout(() => {
                            onFiltersChange($rootScope.kdte.getModelValue(CTX_NAME, filterInputModelName, ''));
                        });
                    } else {
                        toggleTableHeaderClasses(value);
                    }
                },
            );

            $scope.$watch(
                'DevicesList.registeredDevices',
                () => onFiltersChange($rootScope.kdte.getModelValue(CTX_NAME, filterInputModelName, '')),
            );

            getRowsToHide().then(() => {
                toggleTableHeaderClasses(flags.get(FLAGS.SHOW_FILTERS));
            });
        });
    });
};

const cleanupDeviceListsFilters = () => {
    _MACS_TO_HIDE = [];

    router.post = origPost;
    router.postToRciRoot = origPostToRciRoot;

    $rootScope.kdte.cleanUpContext(CTX_NAME);
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


const injectRegisteredDevicesFiltersTemplate = () => {
    injectStringIntoTemplate(
        DEVICES_LIST_TEMPLATE_PATH,
        registeredDeviceFiltersTemplate,
        [
            'label="devices-list.registered-devices.header"',
            '</ndm-title>',
        ],
        'failed to determine proper place to inject filters for the "Registered devices" table',
    );
};

const injectUnregisteredDevicesFiltersTemplate = () => {
    injectStringIntoTemplate(
        DEVICES_LIST_TEMPLATE_PATH,
        unregisteredDeviceFiltersTemplate,
        [
            'label="devices-list.not-registered-devices.header"',
            '</ndm-title>',
        ],
        'failed to determine proper place to inject filters for the "Unregistered devices" table',
    );
};

export const deviceListFilters = {
    onInit: () => {
        injectFiltersToggleTemplate();
        injectRegisteredDevicesFiltersTemplate();
        injectUnregisteredDevicesFiltersTemplate();
    },
    onLoad: addDeviceListsFilters,
    onDestroy: cleanupDeviceListsFilters,
};
