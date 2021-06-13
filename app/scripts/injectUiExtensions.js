import * as _ from 'lodash';

import * as CONSTANTS from './lib/constants';
import * as ndmUtils from './lib/ndmUtils';
import {flags, sharedData} from './lib/state';
import {interceptMouseover,} from './lib/domUtils';

import {extendMenu2x} from './uiExtension/extendMenu2x';
import {extendMenu3x} from './uiExtension/extendMenu3x';

import {saveLogButton} from './uiExtension/saveLogButton';
import {fixedPolicyEditorHeader} from './uiExtension/policies';
import {deviceListFilters} from './uiExtension/filterDeviceLists';
import {wifiClientsFilters} from './uiExtension/filterWifiClients';
import {addVpnStatLinks} from './uiExtension/addVpnStatLinks';
import {extendedDashboardSwitchportsData} from './uiExtension/gatherStatForPorts';
import {extendedSystemSwitchportsData} from './uiExtension/extendSystemSwitchportData';
import {addDeltaSandbox, overrideSandboxesList} from './uiExtension/componentsListDelta';
import {extendedDslStats} from './uiExtension/extendDslStat';

import {injectPointToPointSectionTemplate,} from './uiExtension/pointToPointTunnelsSection';
import {PointToPointController} from './uiExtension/pointToPointTunnels/point-to-point.controller';
import {PointToPointEditorController} from './uiExtension/pointToPointTunnels/point-to-point.editor.controller';

import {logWarning} from './lib/log';
import {getSwitchportsTemplateChunks} from './lib/ngTemplate';

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
    const dashboardSwitchportsTemplate = getSwitchportsTemplateChunks(CONSTANTS.DASHBOARD_SWITCHPORTS_TEMPLATE_PATH);
    const systemSwitchportsTemplate = getSwitchportsTemplateChunks(CONSTANTS.SYSTEM_SWITCHPORTS_TEMPLATE_PATH);

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

                case CONSTANTS.RELOAD_PAGES_WITH_OVERRIDDEN_SWITCHPORTS:
                    if ([CONSTANTS.DASHBOARD_STATE, CONSTANTS.CONTROL_SYSTEM_STATE].includes($state.current.name)) {
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

                    if (ndmUtils.is2xVersion(ndwBranch)) {
                        return;
                    }

                    // Show warning for 3.1.x / 3.2.x / 3.3.x firmware
                    if (!ndmUtils.isSwitchportOverloadSupported(ndwBranch)) {
                        console.warn('Switchports template can be overloaded in web UI versions >= 3.4');

                        break;
                    }

                    const dashboardSwitchportsTemplate = _.get(payload, [CONSTANTS.SWITCHPORT_TEMPLATE_DATA_KEY, 'dashboard']);

                    ndmUtils.replaceSwitchportsTemplate(dashboardSwitchportsTemplate, CONSTANTS.DASHBOARD_SWITCHPORTS_TEMPLATE_PATH);

                    const systemSwitchportTemplate = _.get(payload, [CONSTANTS.SWITCHPORT_TEMPLATE_DATA_KEY, 'system']);

                    ndmUtils.replaceSwitchportsTemplate(systemSwitchportTemplate, CONSTANTS.SYSTEM_SWITCHPORTS_TEMPLATE_PATH);

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

        /* Adds 'Connection statistics' links to the VPN server apps (Dashboard) */
        ndmUtils.addUiExtension(
            CONSTANTS.DASHBOARD_STATE,
            addVpnStatLinks.onLoad,
            addVpnStatLinks.onDestroy,
        );

        /* Adds filters to the 'Device lists' page (main mode) */
        ndmUtils.addUiExtension(
            CONSTANTS.DEVICES_LIST_STATE,
            deviceListFilters.onLoad,
            deviceListFilters.onDestroy,
        );

        /* Adds filters to the 'Wi-Fi clients' page (non-routing modes) */
        ndmUtils.addUiExtension(
            CONSTANTS.WIFI_CLIENTS_STATE,
            wifiClientsFilters.onLoad,
            wifiClientsFilters.onDestroy,
        );

        /* Adds 'Save to computer' button to the 'System log' popup */
        ndmUtils.addUiExtension(
            CONSTANTS.DIAGNOSTICS_LOG_STATE,
            saveLogButton.onLoad,
        );

        /* Fixes 'Select policy' (to assign consumers to) dropdown menu */
        ndmUtils.addUiExtension(
            CONSTANTS.POLICIES_STATE,
            fixedPolicyEditorHeader.onLoad,
        );

        /* Additional data in the DSL connection statistics ('Diagnostics' -> 'DSL') */
        if (ndmUtils.is3xVersion(ndwBranch)) {
            ndmUtils.addUiExtension(
                CONSTANTS.DIAGNOSTICS_STATE,
                extendedDslStats.onLoad,
                extendedDslStats.onDestroy,
            );
        }

        /* EoIP / IPIP / GRE section ('Other connections') */
        if (
            ndmUtils.is3xVersion(ndwBranch)
            && ndmUtils.isAnyComponentInstalled(['eoip', 'ipip', 'gre'])
        ) {
            injectPointToPointSectionTemplate();
        }

        /* 'delta' sandbox option for older models */
        overrideSandboxesList();

        ndmUtils.addUiExtension(
            CONSTANTS.CONTROL_SYSTEM_STATE,
            addDeltaSandbox.onLoad,
            addDeltaSandbox.onDestroy,
        )

        /* switchports template overload (dashboard, 'General settings') */
        if (ndmUtils.isSwitchportOverloadSupported(ndwBranch)) {
            ndmUtils.addUiExtension(
                CONSTANTS.DASHBOARD_STATE,
                extendedDashboardSwitchportsData.onLoad,
                extendedDashboardSwitchportsData.onDestroy,
            );

            ndmUtils.addUiExtension(
                CONSTANTS.CONTROL_SYSTEM_STATE,
                extendedSystemSwitchportsData.onLoad,
                extendedSystemSwitchportsData.onDestroy,
            )
        }

        window.postMessage({action: CONSTANTS.INJECTED_JS_INITIALIZED, payload: true}, '*');
    });
};

injectUiExtensions();
