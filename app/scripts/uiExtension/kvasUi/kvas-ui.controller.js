import * as _ from 'lodash';
import {getAngularService} from '../../lib/ndmUtils';
import {kvasUiService} from './kvas-ui.service';

// Do not reference any services as the 'controller' parameters -- this will result in an injector error
export function PointToPointController() {
    const vm = this;

    const notification = getAngularService('notification');

    vm.l10n = {
        testBackendConnectionBtn: 'Test backend connection',
        addressIsEmpty: 'Address is empty',
    };

    vm.settings = {
        address: '',
        login: '',
        password: '',
    };

    vm.connector = null;

    vm.list = [];
    vm.latestResponse = {};

    vm.testBackendConnection = () => {
        if (vm.settings.address === '') {
            notification.info(vm.l10n.addressIsEmpty);

            return;
        }

        vm.connector = kvasUiService.getBackendConnector(vm.settings);

        kvasUiService.testConnector(vm.connector)
            .then(
                (...args) => {
                    console.log('success', args);
                    kvasUiService.storeBackendSettings(vm.settings);
                },
                (...args) => console.log('failure', args),
            );
    }

    const init = () => {
        return kvasUiService.readBackendSettings()
            .then(settings => {
                vm.settings = settings;

                if (vm.settings.address) {
                    vm.connector = kvasUiService.getBackendConnector(vm.settings);

                    readConfiguration();
                }

                vm.progress = 100;
            });
    }

    const readConfiguration = () => {
        return kvasUiService.getUnblockList(vm.connector)
            .then((response) => {
                vm.latestResponse = response;
                vm.list = _.get(response, 'payload.list', []);
            });
    };

    init();
}
