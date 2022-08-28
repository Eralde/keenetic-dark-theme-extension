import * as _ from 'lodash';
import {getAngularService} from '../../lib/ndmUtils';
import {kvasUiService} from './kvas-ui.service';

// Do not reference any services as the 'controller' parameters -- this will result in an injector error
export function PointToPointController() {
    const vm = this;

    const notification = getAngularService('notification');

    vm.latestResponse = {};
    vm.connector = null;

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
        addressIsEmpty: 'Address is empty',
    };

    vm.backendConnection = {
        address: '',
        login: '',
        password: '',

        test: () => {
            const self = vm.backendConnection;

            console.log(1);

            if (self.address === '') {
                notification.info(vm.l10n.addressIsEmpty);

                return;
            }

            console.log(_.cloneDeep(self));

            vm.connector = kvasUiService.getBackendConnector(self);

            kvasUiService.testConnector(vm.connector)
                .then(
                    (...args) => {
                        console.log('success', args);
                        kvasUiService.storeBackendSettings(self);
                    },
                    (...args) => console.log('failure', args),
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
                vm.backendConnection = backendConnectionSettings;

                if (vm.backendConnection.address) {
                    vm.connector = kvasUiService.getBackendConnector(vm.backendConnection);

                    readConfiguration();
                }

                vm.progress = 100;
            });
    }

    const readConfiguration = () => {
        return vm.unblockList.refresh();
    };

    init();

    vm.testBackendConnection = vm.backendConnection.test;
    vm.refreshUnblockList = vm.unblockList.refresh;
}
