import * as _ from 'lodash';
import {getAngularService} from '../../lib/ndmUtils';
import {kvasUiService} from './kvas-ui.service';

// Do not reference any services as the 'controller' parameters -- this will result in an injector error
export function PointToPointController() {
    const vm = this;

    const $q = getAngularService('$q');
    const notification = getAngularService('notification');

    vm.latestResponse = {};
    vm.connector = null;

    vm.ui = {
        isBackendSettingsBlockExpanded: false,
    };

    vm.l10n = {
        backend: {
            address: 'Backend address',
            username: 'Username',
            password: 'Password',
            testConnectionBtn: 'Test backend connection',
        },
        unblockList: {
            refresh: 'Refresh unblock list',
            addHost: 'Add host',
        },
        notification: {
            addressIsEmpty: 'Address is empty',
            successfullyConnected: 'Successfully connected to the backend',
            failedToConnectToBackend: 'Failed to connect to the backend',
        },
        backendSettings: {
            hide: 'Hide backend connection settings',
            show: 'Show backend connection settings',
        }
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

                return $q.reject('No address');
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
        }
    };

    vm.unblockList = {
        list: [],
        refresh: () => {
            return kvasUiService.getUnblockList(vm.connector)
                .then((response) => {
                    vm.latestResponse = response;

                    console.log(response);

                    vm.list = _.get(response, 'payload.list', []);
                });
        }
    };

    const init = () => {
        return kvasUiService.readBackendSettings()
            .then(backendConnectionSettings => {
                vm.backendConnection.data = backendConnectionSettings;

                if (!vm.backendConnection.data.address) {
                    vm.ui.isBackendSettingsBlockExpanded = true;
                    vm.progress = 100;

                    return;
                }

                vm.connector = kvasUiService.getBackendConnector(vm.backendConnection.data);

                vm.backendConnection.test()
                    .then(
                        () => readConfiguration(),
                        () => {
                            vm.ui.isBackendSettingsBlockExpanded = true;
                        },
                    )
                    .finally(() => {
                        vm.progress = 100;
                    });
            });
    }

    const readConfiguration = () => {
        return vm.unblockList.refresh();
    };

    init();

    vm.testBackendConnection = vm.backendConnection.test;
    vm.refreshUnblockList = vm.unblockList.refresh;
}
