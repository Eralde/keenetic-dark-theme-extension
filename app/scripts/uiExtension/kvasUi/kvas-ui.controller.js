import * as _ from 'lodash';
import {getAngularService} from '../../lib/ndmUtils';
import {kvasUiService} from './kvas-ui.service';
import {KVAS_UI_L10N, UI_ERROR} from './kvas-ui.constants';

// Do not reference any services as the 'controller' parameters -- this will result in an injector error
export function KvasUiController() {
    const vm = this;

    const $q = getAngularService('$q');
    const utils = getAngularService('utils');
    const notification = getAngularService('notification');

    vm.latestResponse = {};
    vm.connector = null;
    vm.l10n = KVAS_UI_L10N;

    vm.ui = {
        isBackendSettingsBlockExpanded: false,
        isDebugBlockExpanded: false,
        isLocked: false,

        lock() {
            vm.ui.isLocked = true;

            return $q.when(vm.ui.isLocked);
        },

        unlock() {
            vm.ui.isLocked = false;

            return $q.when(vm.ui.isLocked);
        },
    };

    vm.backendConnection = {
        data: {
            address: '',
            login: '',
            password: '',
        },

        isConfigured: false,

        test: () => {
            const self = vm.backendConnection;

            if (self.data.address === '') {
                notification.info(vm.l10n.notification.addressIsEmpty);

                return $q.reject(UI_ERROR.NO_BACKEND_ADDRESS);
            }

            vm.connector = kvasUiService.getBackendConnector(self.data);

            return kvasUiService.testConnector(vm.connector)
                .then(
                    () => {
                        notification.success(vm.l10n.notification.successfullyConnected);
                        kvasUiService.storeBackendSettings(self.data);

                        self.isConfigured = true;
                    },
                    (...args) => {
                        notification.info(vm.l10n.notification.failedToConnectToBackend);
                        console.warn('testConnector: failure', args)

                        self.isConfigured = false;
                    },
                );
        },
    };

    vm.unblockList = {
        list: [],
        refresh: () => {
            if (vm.ui.isLocked) {
                return $q.reject(UI_ERROR.UI_IS_LOCKED);
            }

            return kvasUiService.getUnblockList(vm.connector)
                .then((response) => {
                    vm.latestResponse = response;

                    vm.list = _.get(response, 'payload.list', []);
                });
        },

        addHost: () => {
            if (vm.ui.isLocked) {
                return;
            }

            vm.unblockList.list.push('');
        },

        removeHost: (index) => {
            console.log(index, vm.ui.isLocked);

            if (vm.ui.isLocked) {
                return;
            }

            vm.unblockList.list = vm.unblockList.list
                .filter((item, _index) => index !== _index);

            utils.forceScopeDigest($scope);
        },
    };

    const init = () => {
        return kvasUiService.readBackendSettings()
            .then(backendConnectionSettings => {
                vm.backendConnection.data = backendConnectionSettings;

                if (!vm.backendConnection.data.address) {
                    vm.ui.isBackendSettingsBlockExpanded = true;
                    vm.progress = 100;

                    return $q.reject(UI_ERROR.NO_BACKEND_ADDRESS);
                }

                vm.connector = kvasUiService.getBackendConnector(vm.backendConnection.data);

                return vm.backendConnection.test();
            })
            .then(
                () => vm.unblockList.refresh(),
                () => {
                    vm.ui.isBackendSettingsBlockExpanded = true;
                },
            )
            .finally(() => {
                vm.progress = 100;
            });
    }

    init();

    vm.testBackendConnection = vm.backendConnection.test;
    vm.refreshUnblockList = vm.unblockList.refresh;
    vm.addHostToUnblockList = vm.unblockList.addHost;
    vm.removeHostFromUnblockList = vm.unblockList.removeHost;
}
