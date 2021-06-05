import * as _ from 'lodash';

import * as CONSTANTS from './lib/constants';
import * as ndmUtils from './lib/ndmUtils';

import {flags, sharedData} from './lib/state';

import {
    interceptMouseover,
} from './lib/domUtils';

import {extendMenu2x} from './uiExtension/extendMenu2x';
import {extendMenu3x} from './uiExtension/extendMenu3x';
import {addSaveLogButton} from './uiExtension/saveLogButton';

import {
    addDeviceListsFilters,
    cleanupDeviceListsFilters,
} from './uiExtension/filterDeviceLists';

import {
    addWifiClientsFilters,
    cleanupWifiClientsFilters,
} from './uiExtension/filterWifiClients';

import {
    modifyAppsService,
    revertAppsServiceModifications,
} from './uiExtension/addVpnStatLinks';

import {
    fixPolicies,
} from './uiExtension/policies';

import {
    gatherStatForPorts,
    revertGatherStatForPortsChanges,
} from './uiExtension/gatherStatForPorts';

import {
    overriderSandboxOptions,
    overrideSandboxesList,
    cancelComponentsSectionsWatchers,
} from './uiExtension/componentsListDelta';

import {
    extendDslStats,
    revertDslStatsChanges,
} from './uiExtension/extendDslStat';

import {
    addPointToPointTunnelSection,
} from './uiExtension/pointToPointTunnelsSection';
import {
    PointToPointController,
} from './uiExtension/pointToPointTunnels/point-to-point.controller';
import {
    PointToPointEditorController,
} from './uiExtension/pointToPointTunnels/point-to-point.editor.controller';
import {extendSystemSwitchportData} from './uiExtension/extendSystemSwitchportData';
import {DASHBOARD_SWITCHPORTS_TEMPLATE_PATH, SYSTEM_SWITCHPORTS_TEMPLATE_PATH} from './lib/constants';
import {logWarning} from './lib/log';

export const injectUiExtensions = () => {
    let $state;

    try {
        $state = ndmUtils.getAngularService('$state');
    } catch (e) {
        logWarning(`failed to access AngularJs service: ${e}`);
        return;
    }

    const $rootScope = ndmUtils.getAngularService('$rootScope');
    const $transitions = ndmUtils.getAngularService('$transitions');

    // We add controller to the $rootScope,
    // otherwise it won't be available on page load
    $rootScope.PointToPointController = PointToPointController;
    $rootScope.PointToPointEditorController = PointToPointEditorController;

    // Should be done BEFORE authentication
    const dashboardSwitchportsTemplate = ndmUtils.getSwitchportsTemplateChunks(DASHBOARD_SWITCHPORTS_TEMPLATE_PATH);
    const systemSwitchportsTemplate = ndmUtils.getSwitchportsTemplateChunks(SYSTEM_SWITCHPORTS_TEMPLATE_PATH);

    if (!dashboardSwitchportsTemplate) {
        console.log('Keenetic Dark Theme Extension: unsupported switchports template');
    } else {
        window.postMessage(
            {
                action: CONSTANTS.ORIGINAL_SWITCHPORTS_TEMPLATE,
                payload: {
                    dashboard: dashboardSwitchportsTemplate,
                    system: systemSwitchportsTemplate,
                },
            },
            '*',
        );
    }

    const ndmVersion = _.get(window, 'NDM.version', '');
    const ndwBranch = ndmVersion.substr(0, 3);

    let __TAG = '';

    let unbinder = null;

    window.addEventListener(
        'message',
        (event) => {
            const action = _.get(event, 'data.action', '');

            switch (action) {
                case CONSTANTS.TOGGLE_UI_EXTENSIONS_EVENT:
                    window.postMessage({action: CONSTANTS.TOGGLE_UI_EXTENSIONS_RECEIVED_EVENT}, '*');

                    const menuController = sharedData.get('menuController');

                    if (!menuController) {
                        return;
                    }

                    const uiExtensionsEnabled = Boolean(event.data.payload);

                    menuController.onItemClick = uiExtensionsEnabled
                        ? _.noop
                        : sharedData.get('originalMenuOnItemClick');

                    sharedData.set(CONSTANTS.UI_EXTENSIONS_KEY, uiExtensionsEnabled);

                    break;

                case CONSTANTS.RELOAD_DASHBOARD:
                    if ($state.current.name === CONSTANTS.DASHBOARD_STATE) {
                        window.location.reload();
                    }
                    break;

                case CONSTANTS.INITIAL_STORAGE_DATA:
                    const payload = _.get(event, 'data.payload');

                    const uiExtensionsToggleValue = _.get(
                        payload,
                        CONSTANTS.UI_EXTENSIONS_KEY,
                        CONSTANTS.TOGGLE_DEFAULT_VALUES[CONSTANTS.UI_EXTENSIONS_KEY],
                    );

                    sharedData.set(CONSTANTS.UI_EXTENSIONS_KEY, uiExtensionsToggleValue);

                    const replaceTextareaCursorValue = _.get(
                        payload,
                        CONSTANTS.REPLACE_TEXTAREA_CURSOR_STORAGE_KEY,
                        CONSTANTS.STORAGE_DEFAULTS[CONSTANTS.REPLACE_TEXTAREA_CURSOR_STORAGE_KEY],
                    );

                    ndmUtils.toggleNdmTextareaClass({
                        className: 'ndm-textarea__textarea--default-cursor',
                        insertAfterClass: 'ndm-textarea__textarea',
                        state: replaceTextareaCursorValue,
                    })

                    if (!ndmUtils.isSwitchportOverloadSupported(ndwBranch)) {
                        console.warn('Switchports template can be overloaded in web UI versions >= 3.4');

                        break;
                    }

                    const dashboardSwitchportsTemplate = _.get(payload, [CONSTANTS.SWITCHPORT_TEMPLATE_DATA_KEY, 'dashboard']);

                    ndmUtils.replaceSwitchportsTemplate(dashboardSwitchportsTemplate, DASHBOARD_SWITCHPORTS_TEMPLATE_PATH);

                    const systemSwitchportTemplate = _.get(payload, [CONSTANTS.SWITCHPORT_TEMPLATE_DATA_KEY, 'system']);

                    ndmUtils.replaceSwitchportsTemplate(systemSwitchportTemplate, SYSTEM_SWITCHPORTS_TEMPLATE_PATH);

                    break;
            }
        },
    );

    const initFlags = () => {
        if (__TAG !== CONSTANTS.NO_TAG) {
            flags.init(__TAG);

            if (unbinder) {
                unbinder();
            }
        } else if (!unbinder) {
            unbinder = $transitions.onSuccess({}, () => {
                ndmUtils.getServiceTag().then(tag => {
                    __TAG = tag;

                    initFlags();
                });
            });
        }
    }

    ndmUtils.waitUntilAuthenticated().then(() => ndmUtils.ensureServiceTag()).then((tag) => {
        __TAG = tag;
        initFlags();

        if (!$rootScope) {
            return;
        }


        let extendMenuFunction = _.noop;

        if (ndmUtils.is2xVersion(ndwBranch)) {
            extendMenuFunction = extendMenu2x;
            interceptMouseover('ndm-help');

        } else if (ndmUtils.is3xVersion(ndwBranch)) {
            extendMenuFunction = extendMenu3x;
        }

        setTimeout(extendMenuFunction, 500);

        ndmUtils.addUiExtension(
            CONSTANTS.DASHBOARD_STATE,
            modifyAppsService,
            revertAppsServiceModifications,
        );

        ndmUtils.addUiExtension(
            CONSTANTS.DEVICES_LIST_STATE,
            addDeviceListsFilters,
            cleanupDeviceListsFilters,
        );

        ndmUtils.addUiExtension(
            CONSTANTS.WIFI_CLIENTS_STATE,
            addWifiClientsFilters,
            cleanupWifiClientsFilters,
        );

        ndmUtils.addUiExtension(
            CONSTANTS.DIAGNOSTICS_LOG_STATE,
            addSaveLogButton,
        );

        ndmUtils.addUiExtension(
            CONSTANTS.POLICIES_STATE,
            fixPolicies,
        );

        if (ndmUtils.is3xVersion(ndwBranch)) {
            ndmUtils.addUiExtension(
                CONSTANTS.DIAGNOSTICS_STATE,
                extendDslStats,
                revertDslStatsChanges,
            );
        }

        overrideSandboxesList();

        if (ndmUtils.is3xVersion(ndwBranch)) {
            const components = _.get(window, 'NDM.profile.components', {});

            if (components.eoip || components.gre || components.ipip) {
                addPointToPointTunnelSection();
            }
        }

        ndmUtils.addUiExtension(
            CONSTANTS.CONTROL_SYSTEM_STATE,
            overriderSandboxOptions,
            cancelComponentsSectionsWatchers,
        )

        ndmUtils.addUiExtension(
            CONSTANTS.CONTROL_SYSTEM_STATE,
            extendSystemSwitchportData,
            revertGatherStatForPortsChanges,
        )

        if (ndmUtils.isSwitchportOverloadSupported(ndwBranch)) {
            ndmUtils.addUiExtension(
                CONSTANTS.DASHBOARD_STATE,
                gatherStatForPorts,
                revertGatherStatForPortsChanges,
            );
        }

        window.postMessage({action: CONSTANTS.INJECTED_JS_INITIALIZED, payload: true}, '*');
    });
};

injectUiExtensions();
