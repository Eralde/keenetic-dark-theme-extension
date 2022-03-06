import * as _ from 'lodash';

import * as CONSTANTS from './lib/constants';
import * as ndmUtils from './lib/ndmUtils';
import {flags, sharedData} from './lib/state';
import {interceptMouseover,} from './lib/domUtils';

import {logWarning} from './lib/log';
import {getSwitchportsTemplateChunks} from './lib/ngTemplate';
import {l10n} from './lib/l10n';
import {onLanguageChange} from './lib/ndmUtils';
import {
    DEVICES_LIST_STATE,
    FLAGS_CHANGE_EVENT,
    WIFI_CLIENTS_STATE
} from './lib/constants';

import {extendMenu2x} from './uiExtension/extendMenu2x';
import {extendMenu3x} from './uiExtension/extendMenu3x';

import {saveLogButton} from './uiExtension/saveLogButton';
import {fixedPolicyEditorHeader} from './uiExtension/policies';
import {deviceListFilters} from './uiExtension/filterDeviceLists';
import {wifiClientsFilters} from './uiExtension/filterWifiClients';
import {addVpnStatLinks} from './uiExtension/addVpnStatLinks';
import {extendedDashboardSwitchportsData} from './uiExtension/gatherStatForPorts';
import {extendedSystemSwitchportsData} from './uiExtension/extendSystemSwitchportData';
import {overrideDeltaL10n} from './uiExtension/componentsListDeltaDashboard';
import {addDeltaSandbox} from './uiExtension/componentsListDelta';
import {extendedDslStat} from './uiExtension/extendDslStat';
import {additionalWolButton} from './uiExtension/additionalWolButton';
import {rssiValueInConnectionInfo} from './uiExtension/rssiValueInConnectionInfo';

import {pointToPointSection} from './uiExtension/pointToPointTunnelsSection';
import {PointToPointController} from './uiExtension/pointToPointTunnels/point-to-point.controller';
import {PointToPointEditorController} from './uiExtension/pointToPointTunnels/point-to-point.editor.controller';

import {routesToolbarExtension} from './uiExtension/routesToolbar';
import {IpLookupController} from './uiExtension/routesToolbar/ip-lookup.controller';
import {RoutesToolbarController} from './uiExtension/routesToolbar/routes-toolbar.controller';
import {RoutesImportPopupController} from './uiExtension/routesToolbar/routes-import-popup.controller';
import {extendedCableDiagnosticsSwitchportsData} from './uiExtension/extendCableDiagnosticsSwitchportData';
import {rebootSchedule} from './uiExtension/rebootSchedule';

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
    const utils = ndmUtils.getAngularService('utils');

    // We assign additional controllers directly to the $rootScope,
    // otherwise they will not be accessible inside additional templates
    $rootScope.PointToPointController = PointToPointController;
    $rootScope.PointToPointEditorController = PointToPointEditorController;
    $rootScope.RoutesToolbarController = RoutesToolbarController;
    $rootScope.RoutesImportPopupController = RoutesImportPopupController;
    $rootScope.IpLookupController = IpLookupController;

    $rootScope.kdte = {
        L10N: l10n,
        STATE: {
            DEVICES_LIST_STATE,
            WIFI_CLIENTS_STATE,
        },
        currentLanguage: utils.getCurrentLanguage(),
        currentState: $state.current.name,

        getToggleFlagFn: (flag) => {
            return (value) => {
                flags.set(flag, value);
                $rootScope.$broadcast(FLAGS_CHANGE_EVENT, {flag, value});
            };
        },

        callback: {},
        controller: {},
        model: {},
        registerCallback: (contextName, callbackName, callback) => {
          const name = `${contextName}__${callbackName}`;

          $rootScope.kdte.callback[name] = callback;
        },
        registerModel: (contextName, modelName, value) => {
            const name = `${contextName}__${modelName}`;

            $rootScope.kdte.model[name] = value;
        },
        getModelValue: (contextName, modelName, defaultValue) => {
            return _.get($rootScope.kdte.model, `${contextName}__${modelName}`, defaultValue);
        },

        cleanUpContext: (contextName) => {
            const self = $rootScope.kdte;

            self.controller = _.omit(self, [contextName]);

            self.callback = _.pickBy(
                self.callback,
                (callback, name) => !name.startsWith(contextName)
            );

            self.model = _.pickBy(
                self.model,
                (value, name) => !name.startsWith(contextName)
            );
        },
    };

    onLanguageChange(() => {
        $rootScope.kdte.currentLanguage = utils.getCurrentLanguage();
    });

    $transitions.onSuccess({}, (transition) => {
        $rootScope.kdte.currentState = transition.to().name;
    });

    // Should be done BEFORE authentication
    const dashboardSwitchportsTemplate = getSwitchportsTemplateChunks(CONSTANTS.DASHBOARD_SWITCHPORTS_TEMPLATE_PATH);
    const systemSwitchportsTemplate = getSwitchportsTemplateChunks(CONSTANTS.SYSTEM_SWITCHPORTS_TEMPLATE_PATH);
    const cableDiagnosticsTemplate = getSwitchportsTemplateChunks(CONSTANTS.CABLE_DIAGNOSTICS_TEMPLATE_PATH);

    const STATES_WITH_OVERLOADED_TEMPLATES = [
        CONSTANTS.DASHBOARD_STATE,
        CONSTANTS.CONTROL_SYSTEM_STATE,
        CONSTANTS.DIAGNOSTICS_STATE,
    ];

    if (!dashboardSwitchportsTemplate) {
        console.log('Keenetic Dark Theme Extension: unsupported switchports template');
    } else {
        window.postMessage(
            {
                action: CONSTANTS.ORIGINAL_SWITCHPORTS_TEMPLATE,
                payload: {
                    dashboard: dashboardSwitchportsTemplate,
                    system: systemSwitchportsTemplate,
                    cableDiagnostics: cableDiagnosticsTemplate,
                },
            },
            '*',
        );
    }

    /** UI extensions initialization */

    /* EoIP / IPIP / GRE section ('Other connections') */
    const ndmVersion = _.get(window, 'NDM.version', '');
    const ndwBranch = ndmVersion.substr(0, 3);

    if (
        ndmUtils.is3xVersion(ndwBranch)
        && ndmUtils.isAnyComponentInstalled(['eoip', 'ipip', 'gre'])
    ) {
        pointToPointSection.onInit();
    }

    $rootScope.kdte.ifInputFilterComponentAvailable = ndmUtils.is3xVersion(ndwBranch);

    deviceListFilters.onInit();
    wifiClientsFilters.onInit();
    routesToolbarExtension.onInit();
    addDeltaSandbox.onInit();
    rebootSchedule.onInit();

    /** END of UI extensions initialization */

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
                    if (STATES_WITH_OVERLOADED_TEMPLATES.includes($state.current.name)) {
                        window.location.reload();
                    }
                    break;

                case CONSTANTS.INITIAL_STORAGE_DATA:
                    const payload = _.get(event, 'data.payload');

                    const showRssiValue = _.get(
                        payload,
                        CONSTANTS.SHOW_RSSI_VALUE,
                        CONSTANTS.STORAGE_DEFAULTS[CONSTANTS.SHOW_RSSI_VALUE],
                    );

                    sharedData.set(CONSTANTS.SHOW_RSSI_VALUE, showRssiValue);

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
                    });

                    if (ndmUtils.is2xVersion(ndwBranch)) {
                        return;
                    }

                    // Show warning for 3.1.x / 3.2.x / 3.3.x firmware
                    if (!ndmUtils.isSwitchportOverloadSupported(ndwBranch)) {
                        console.warn('Switchports template can be overloaded in web UI versions >= 3.4');

                        break;
                    }

                    ndmUtils.extractAndReplaceSwitchportsTemplate(
                        payload,
                        'dashboard',
                        CONSTANTS.DASHBOARD_SWITCHPORTS_TEMPLATE_PATH,
                    );

                    ndmUtils.extractAndReplaceSwitchportsTemplate(
                        payload,
                        'system',
                        CONSTANTS.SYSTEM_SWITCHPORTS_TEMPLATE_PATH,
                    );

                    ndmUtils.extractAndReplaceSwitchportsTemplate(
                        payload,
                        'cableDiagnostics',
                        CONSTANTS.CABLE_DIAGNOSTICS_TEMPLATE_PATH,
                    );

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

        $rootScope.kdte.flags = flags.getAll();

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
                extendedDslStat.onLoad,
                extendedDslStat.onDestroy,
            );
        }

        /* 'delta' sandbox option for older models */
        ndmUtils.addUiExtension(
            CONSTANTS.CONTROL_SYSTEM_STATE,
            addDeltaSandbox.onLoad,
            addDeltaSandbox.onDestroy,
        );

        /* 'Reboot schedule' selectbox */
        ndmUtils.addUiExtension(
            CONSTANTS.CONTROL_SYSTEM_STATE,
            rebootSchedule.onLoad,
        );

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
            );

            ndmUtils.addUiExtension(
                CONSTANTS.DIAGNOSTICS_STATE,
                extendedCableDiagnosticsSwitchportsData.onLoad,
                extendedCableDiagnosticsSwitchportsData.onDestroy,
            );
        }

        /* Adds 'WoL' button next to an offline registered host name */
        ndmUtils.addUiExtension(
            CONSTANTS.DEVICES_LIST_STATE,
            additionalWolButton.onLoad,
        );

        /* Show RSSI value for wireless devices */
        ndmUtils.addUiExtension(
            CONSTANTS.DEVICES_LIST_STATE,
            rssiValueInConnectionInfo.onLoad,
            rssiValueInConnectionInfo.onDestroy,
        );

        /* Show 'Delta' auto-update channel on dashboard */
        ndmUtils.addUiExtension(
            CONSTANTS.DASHBOARD_STATE,
            overrideDeltaL10n.onLoad,
            overrideDeltaL10n.onDestroy,
        );

        window.postMessage({action: CONSTANTS.INJECTED_JS_INITIALIZED, payload: true}, '*');
    });
};

injectUiExtensions();
