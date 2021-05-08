import * as _ from 'lodash';

import {
    DIAGNOSTICS_LOG_STATE,
    DIAGNOSTICS_STATE,
    DEVICES_LIST_STATE,
    WIFI_CLIENTS_STATE,
    DASHBOARD_STATE,
    NO_TAG,
    TOGGLE_UI_EXTENSIONS_EVENT,
    TOGGLE_UI_EXTENSIONS_RECEIVED_EVENT,
    POLICIES_STATE,
    ORIGINAL_SWITCHPORTS_TEMPLATE,
    RELOAD_DASHBOARD,
    INJECTED_JS_INITIALIZED,
    INITIAL_STORAGE_DATA,
    CONTROL_SYSTEM_STATE,
    SWITCHPORT_TEMPLATE_STORAGE_KEY,
    REPLACE_TEXTAREA_CURSOR_STORAGE_KEY,
    TOGGLE_DEFAULT_VALUES,
    UI_EXTENSIONS_KEY,
} from './lib/constants';

import {flags, sharedData} from './lib/state';

import {
    ensureServiceTag,
    getServiceTag,
    getAngularService,
    waitUntilAuthenticated,
    addUiExtension,
    getDashboardSwitchportsTemplate,
    setDashboardSwitchportsTemplate,
    is2xVersion,
    is3xVersion,
    isSwitchportOverloadSupported,
    toggleNdmTextareaClass,
} from './lib/ndmUtils';

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
    addPointToPointTunnelsPage,
} from './uiExtension/pointToPointTunnelsPage';

export const injectUiExtensions = () => {
    let $state;

    try {
        $state = getAngularService('$state');
    } catch (e) {
        console.warn(`Keenetic Dark Theme Extension: failed to access AngularJs service: ${e}`);
        return;
    }

    const $rootScope = getAngularService('$rootScope');
    const $transitions = getAngularService('$transitions');

    // Should be done BEFORE authentication
    const originalSwitchportsTemplate = getDashboardSwitchportsTemplate();

    if (!originalSwitchportsTemplate) {
        console.log('Keenetic Dark Theme Extension: unsupported switchports template');
    } else {
        window.postMessage(
            {
                action: ORIGINAL_SWITCHPORTS_TEMPLATE,
                payload: originalSwitchportsTemplate,
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
                case TOGGLE_UI_EXTENSIONS_EVENT:
                    window.postMessage({action: TOGGLE_UI_EXTENSIONS_RECEIVED_EVENT}, '*');

                    const menuController = sharedData.get('menuController');

                    if (!menuController) {
                        return;
                    }

                    const uiExtensionsEnabled = Boolean(event.data.payload);

                    menuController.onItemClick = uiExtensionsEnabled
                        ? _.noop
                        : sharedData.get('originalMenuOnItemClick');

                    sharedData.set(UI_EXTENSIONS_KEY, uiExtensionsEnabled);

                    break;

                case RELOAD_DASHBOARD:
                    if ($state.current.name === DASHBOARD_STATE) {
                        window.location.reload();
                    }
                    break;

                case INITIAL_STORAGE_DATA:
                    const payload = _.get(event, 'data.payload');

                    const uiExtensionsToggleValue = _.get(
                        payload,
                        UI_EXTENSIONS_KEY,
                        TOGGLE_DEFAULT_VALUES[UI_EXTENSIONS_KEY],
                    );

                    sharedData.set(UI_EXTENSIONS_KEY, uiExtensionsToggleValue);

                    toggleNdmTextareaClass({
                        className: 'ndm-textarea__textarea--default-cursor',
                        insertAfterClass: 'ndm-textarea__textarea',
                        state: payload[REPLACE_TEXTAREA_CURSOR_STORAGE_KEY],
                    })

                    if (!isSwitchportOverloadSupported(ndwBranch)) {
                        console.warn('Switchports template can be overloaded in web UI versions >= 3.4');

                        break;
                    }

                    const switchportTemplate = _.get(payload, SWITCHPORT_TEMPLATE_STORAGE_KEY);

                    if (switchportTemplate) {
                        setDashboardSwitchportsTemplate(switchportTemplate);
                    }
                    break;
            }
        },
    );

    const initFlags = () => {
        if (__TAG !== NO_TAG) {
            flags.init(__TAG);

            if (unbinder) {
                unbinder();
            }
        } else if (!unbinder) {
            unbinder = $transitions.onSuccess({}, () => {
                getServiceTag().then(tag => {
                    __TAG = tag;

                    initFlags();
                });
            });
        }
    }

    waitUntilAuthenticated().then(() => ensureServiceTag()).then((tag) => {
        __TAG = tag;
        initFlags();

        if (!$rootScope) {
            return;
        }


        let extendMenuFunction = _.noop;

        if (is2xVersion(ndwBranch)) {
            extendMenuFunction = extendMenu2x;
            interceptMouseover('ndm-help');

        } else if (is3xVersion(ndwBranch)) {
            extendMenuFunction = extendMenu3x;
        }

        setTimeout(extendMenuFunction, 500);

        addUiExtension(
            DASHBOARD_STATE,
            modifyAppsService,
            revertAppsServiceModifications,
        );

        addUiExtension(
            DEVICES_LIST_STATE,
            addDeviceListsFilters,
            cleanupDeviceListsFilters,
        );

        addUiExtension(
            WIFI_CLIENTS_STATE,
            addWifiClientsFilters,
            cleanupWifiClientsFilters,
        );

        addUiExtension(
            DIAGNOSTICS_LOG_STATE,
            addSaveLogButton,
        );

        addUiExtension(
            POLICIES_STATE,
            fixPolicies,
        );

        if (is3xVersion(ndwBranch)) {
            addUiExtension(
                DIAGNOSTICS_STATE,
                extendDslStats,
                revertDslStatsChanges,
            );
        }

        overrideSandboxesList();

        addPointToPointTunnelsPage();

        addUiExtension(
            CONTROL_SYSTEM_STATE,
            overriderSandboxOptions,
            cancelComponentsSectionsWatchers,
        )

        if (isSwitchportOverloadSupported(ndwBranch)) {
            addUiExtension(
                DASHBOARD_STATE,
                gatherStatForPorts,
                revertGatherStatForPortsChanges,
            );
        }

        window.postMessage({action: INJECTED_JS_INITIALIZED, payload: true}, '*');
    });
};

injectUiExtensions();
