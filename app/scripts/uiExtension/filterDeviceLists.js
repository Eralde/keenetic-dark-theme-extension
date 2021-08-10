import * as _ from 'lodash';

import {
    FILTERS_ARE_VISIBLE_CLASS,
    FLAGS,
    FLEX_ROW_CLASS,
    HIDE_CLASS,
    REG_DEVICES_FLAGS,
    UNREG_DEVICES_FLAGS,
    FILTERS_TOGGLE_CLASS,
    HIDDEN_TABLE_ROW_CLASS,
    DEVICES_LIST_TEMPLATE_PATH,
    FLAGS_CHANGE_EVENT,
} from '../lib/constants';

import {
    getAngularService,
    requestContainsPath,
    getPathIndexInRequest,
    forceScopeDigest,
    callOnPageLoad,
    getNdmPageController,
    getNdmPageScope,
    getTemplate,
} from '../lib/ndmUtils';

import {
    processAclConfigurations,
    hostFilterConstructor,
} from '../lib/filters';

import {
    addCssClass,
    addFlagCheckbox,
    addFiltersToggleCheckbox,
    addStylesToDevicesListTableHeader,
    createDiv,
    getPageHeaderEl,
    toggleCssClass,
    isElementVisible,
} from '../lib/domUtils';

import {flags, sharedData} from '../lib/state';
import {logWarning} from '../lib/log';

import filterTemplate from '../../pages/ui/device-lists-input-filter.html';
import * as CONSTANTS from '../lib/constants';

/*
 * This UI extension adds filters to device lists on the 'Device lists' page
 */

const $timeout = getAngularService('$timeout');
const $q = getAngularService('$q');
const $rootScope = getAngularService('$rootScope');

const router = getAngularService('router');
const wirelessAcl = getAngularService('wirelessAcl');

const origPost = _.get(router, 'post');
const origPostToRciRoot = _.get(router, 'postToRciRoot');

const macRegexp = /^[0-9a-f]{1}[02468ace]{1}(?:[\:\- ]?[0-9a-f]{2}){5}$/i;

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
    const path = 'show.ip.hotspot';

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
        const areFiltersVisible = isElementVisible(__VARS.filtersToggleCheckbox); //.display !== 'none';
        const applyFilters = globalFlags.get(FLAGS.SHOW_FILTERS) && areFiltersVisible;

        if (!applyFilters) {
            _MACS_TO_HIDE = [];

            return hosts;
        }

        const filteredHosts = (globalFlags.get(FLAGS.SHOW_FILTERS) && areFiltersVisible)
            ? hosts
                .filter(filterFn)
                .filter(x => !hideUnregisteredHosts || x.registered)
            : [];

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

        if (!requestContainsPath(req, path)) {
            return origPostToRciRoot(...args);
        }

        const deferred = $q.defer();
        const pathIndex = getPathIndexInRequest(req, path);
        const thenFn = getThenFn(`${pathIndex}.${path}`, deferred);

        origPostToRciRoot(...args)
            .then(thenFn);

        return deferred.promise;
    };

    routerService.post = (...args) => {
        const req = args[0];

        if (!requestContainsPath(req, path)) {
            return origPost.apply(routerService, args);
        }

        const deferred = $q.defer();
        const thenFn = getThenFn(path, deferred);

        origPost(...args)
            .then(thenFn);

        return deferred.promise;
    }
};

const addDeviceListsFilters = () => {
    let __VARS = {};

    const getRowsToHide = (regTableHeader, unregTableHeader, pageHeaderEl) => {
        // TODO: use cache if possible?
        $q
            .all([
                router.get('show/ip/hotspot'),
                wirelessAcl.getAclConfiguration(),
            ])
            .spread((hotspot, aclCfg) => {
                const hosts = hotspot.host || [];
                const regHosts = _.uniqBy(hosts.filter(x => x.registered), 'mac');

                __VARS = processAclConfigurations(__VARS, regHosts, aclCfg);

                modifyShowIpHotspotData(flags, __VARS, router);

                const regFlexContainer = createDiv('devices-list-toolbar dark-theme__reg-devices-filters');
                regTableHeader.append(regFlexContainer);
                const regHeaderEl = addStylesToDevicesListTableHeader(regFlexContainer, FLEX_ROW_CLASS);

                REG_DEVICES_FLAGS.forEach(flag => {
                    addFlagCheckbox(
                        flags,
                        {
                            parentEl: regFlexContainer,
                            flagName: flag,
                            flagLabelL10nId: flag,
                            cbk: (value) => {
                                $rootScope.$broadcast(FLAGS_CHANGE_EVENT, {flag, value});
                            },
                        },
                    );
                });

                const unregFlexContainer = createDiv('devices-list-toolbar dark-theme__unreg-devices-filters');
                unregTableHeader.append(unregFlexContainer);
                const unregHeaderEl = addStylesToDevicesListTableHeader(unregFlexContainer, FLEX_ROW_CLASS);

                UNREG_DEVICES_FLAGS.forEach(flag => {
                    addFlagCheckbox(
                        flags,
                        {
                            parentEl: unregFlexContainer,
                            flagName: flag,
                            flagLabelL10nId: flag,
                            cbk: (value) => {
                                $rootScope.$broadcast(FLAGS_CHANGE_EVENT, {flag, value});
                            },
                        },
                    )
                });

                const containers = [regFlexContainer, unregFlexContainer];
                const headers = [regHeaderEl, unregHeaderEl];

                const filtersToggleEl = addFiltersToggleCheckbox(
                    flags,
                    __VARS,
                    pageHeaderEl,
                    containers,
                    headers,
                    (value) => {
                        $rootScope.$broadcast(FLAGS_CHANGE_EVENT, {flag: FLAGS.SHOW_FILTERS, value});
                    },
                );

                __VARS.filtersToggleCheckbox = filtersToggleEl.closest(`.${FILTERS_TOGGLE_CLASS}`);

                if (!flags.get(FLAGS.SHOW_FILTERS)) {
                    addCssClass(containers, HIDE_CLASS);
                } else {
                    addCssClass(headers, FILTERS_ARE_VISIBLE_CLASS);
                }
            });

    };

    callOnPageLoad(() => {
        $timeout(async () => {
            const tables = [...document.querySelectorAll('.ndm-title [ng-transclude]')];
            const regTableEl = tables[1];
            const unregTableEl = tables[0];

            if (!regTableEl) {
                logWarning('Failed to get registered devices table DOM element');
                return;
            }

            if (!unregTableEl) {
                logWarning('Failed to get unregistered devices table DOM element');
                return;
            }

            const ctrl = await getNdmPageController();
            const $scope = await getNdmPageScope();

            ctrl.extensionFlags = flags.getAll();

            $scope.$on(
                '$destroy',
                $rootScope.$on(FLAGS_CHANGE_EVENT, ($event, {flag, value}) => {
                    ctrl.extensionFlags[flag] = value;
                }),
            );

            const applyFilters = (ipCells, filterInputValue = '') => {
                const hostRows = ipCells
                    .map(cell => [cell, cell.innerText.split('\n')])
                    .filter(([cell, lines]) => lines.some(line => macRegexp.test(line)));

                const [toHide, toShow] = _.partition(
                    hostRows,
                    ([cell, lines]) => {
                        if (!sharedData.get(CONSTANTS.UI_EXTENSIONS_KEY)) {
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
            }

            $scope.$watch('DevicesList.registeredDevices', () => {
                const ipCells = [
                    ...document.querySelectorAll('.table-ip')
                ];

                applyFilters(ipCells, $rootScope.devicesListNameFilter);
                forceScopeDigest($scope);
            });

            __VARS.ctrlName = 'DevicesListController';
            window[__VARS.ctrlName] = ctrl;

            getRowsToHide(regTableEl, unregTableEl, getPageHeaderEl());

            $rootScope.filterDevicesList = (filterValue) => {
                const ipCells = [
                    ...document.querySelectorAll('.table-ip')
                ];

                applyFilters(ipCells, filterValue);
                forceScopeDigest($scope);
            };
        });
    });
};

const cleanupDeviceListsFilters = () => {
    _MACS_TO_HIDE = [];

    router.post = origPost;
    router.postToRciRoot = origPostToRciRoot;
};

const injectFilterInputTemplate = () => {
    const $templateCache = getAngularService('$templateCache');
    const devicesListTemplate = getTemplate(DEVICES_LIST_TEMPLATE_PATH);

    const regTableHeaderOpenTagIndex = devicesListTemplate.indexOf('label="devices-list.registered-devices.header"');
    const errMsg = 'failed to determine proper place to inject filter input';

    if (regTableHeaderOpenTagIndex === -1) {
        logWarning(errMsg);

        return;
    }

    const injectionIndex = devicesListTemplate.indexOf('</ndm-title>', regTableHeaderOpenTagIndex);

    if (injectionIndex === -1) {
        logWarning(errMsg);

        return;
    }

    const prefix = devicesListTemplate.substr(0, injectionIndex);
    const suffix = devicesListTemplate.substr(injectionIndex);

    $templateCache.put(DEVICES_LIST_TEMPLATE_PATH, prefix + filterTemplate + suffix);
};

export const deviceListFilters = {
    onInit: injectFilterInputTemplate,
    onLoad: addDeviceListsFilters,
    onDestroy: cleanupDeviceListsFilters,
};
