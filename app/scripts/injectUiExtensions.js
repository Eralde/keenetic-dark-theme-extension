import * as _ from 'lodash';

import {
    FW2X_BRANCHES,
    FW3X_BRANCHES,
    DIAGNOSTICS_LOG_STATE,
    DEVICES_LIST_STATE,
    WIFI_CLIENTS_STATE,
    DASHBOARD_STATE,
    NO_TAG,
    TOGGLE_UI_EXTENSIONS_EVENT,
    TOGGLE_UI_EXTENSIONS_RECEIVED_EVENT,
    POLICIES_STATE,
} from './lib/constants';

import {
    ensureServiceTag,
    getServiceTag,
    getAngularService,
    waitUntilAuthenticated,
    addUiExtension,
    NOOP,
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
    cleanupPoliciesFix,
} from './uiExtension/policies';

import {flags, sharedData} from './lib/state';

export const injectUiExtensions = () => {
    try {
        getAngularService('$state');
    } catch (e) {
        console.warn(`Keenetic Dark Theme Extension: failed to access AngularJs service: ${e}`);
        return;
    }

    const $rootScope = getAngularService('$rootScope');
    const $transitions = getAngularService('$transitions');

    const ndmVersion = _.get(window, 'NDM.version', '');
    const ndwBranch = ndmVersion.substr(0, 3);

    let __TAG = '';
    let unbinder = null;

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

                        menuController.onItemClick = event.data.payload
                            ? _.noop
                            : sharedData.get('originalMenuOnItemClick');

                        break;
                }
            },
        );


        if (!$rootScope) {
            return;
        }

        let extendMenuFunction = NOOP;

        if (_.includes(FW2X_BRANCHES, ndwBranch)) {
            extendMenuFunction = extendMenu2x;
            interceptMouseover('ndm-help');

        } else if (_.includes(FW3X_BRANCHES, ndwBranch)) {
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
    });
};

injectUiExtensions();
