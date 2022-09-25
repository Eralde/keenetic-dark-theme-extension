import * as _ from 'lodash';
import {forceScopeDigest, getAngularService, getNdmPageScope} from '../../lib/ndmUtils';
import {kvasUiService} from './kvas-ui.service';
import {KVAS_UI_L10N, UI_ERROR} from './kvas-ui.constants';
import {RequestError} from "./kvas-ui.errors";

// Do not reference any services as the 'controller' parameters-- this will result in an injector error
export function KvasUiController() {
    const vm = this;

    const $q = getAngularService('$q');
    const notification = getAngularService('notification');

    vm.latestResponse = {};
    vm.connector = null;
    vm.l10n = _.cloneDeep(KVAS_UI_L10N);

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

    getNdmPageScope().then(async ($scope) => {
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
            savedList: [],

            isModified: false,

            refresh: () => {
                if (vm.ui.isLocked) {
                    return $q.reject(UI_ERROR.UI_IS_LOCKED);
                }

                return kvasUiService.getUnblockList(vm.connector)
                    .then((response) => {
                        vm.latestResponse = response;
                        vm.unblockList.list = _.get(response, 'payload.list', []);

                        vm.unblockList.setPristine();
                    });
            },

            addHost: () => {
                if (vm.ui.isLocked) {
                    return;
                }

                vm.unblockList.list = [
                    '',
                    ...vm.unblockList.list,
                ];
            },

            removeHost: (index) => {
                if (vm.ui.isLocked) {
                    return;
                }

                vm.unblockList.list = _.filter(
                    vm.unblockList.list,
                    (item, _index) => index !== _index,
                );

                forceScopeDigest($scope);
            },

            save: () => {
                const self = vm.unblockList;

                return vm.ui.lock()
                    .then(() => {
                        return kvasUiService.setUnblockList(
                            vm.connector,
                            self.list,
                            self.savedList,
                        );
                    })
                    .then(
                        () => self.setPristine(),
                        (error) => {
                            console.log(
                                error.response,
                                error.response.error,
                            );

                            if (error instanceof RequestError) {
                                notification.error(error.response.error);
                            } else {
                                notification.error(error);
                            }
                        },
                    )
                    .finally(() => vm.ui.unlock());
            },

            reset: () => {
                const self = vm.unblockList;

                self.list = _.cloneDeep(self.savedList);

                self.setPristine();
            },

            setPristine: () => {
                const self = vm.unblockList;

                self.savedList = _.cloneDeep(self.list);
                self.isModified = false;

                vm.footer.updateFlags();
            },
        };

        vm.footer = {
            isVisible: false,

            updateFlags: () => {
                vm.footer.isVisible = vm.unblockList.isModified;
            },

            save: () => {
                vm.unblockList.save();
            },

            reset: () => {
                vm.unblockList.reset();
            },
        };

        const init = () => {
            return kvasUiService.readBackendSettings()
                .then(backendConnectionSettings => {
                    vm.backendConnection.data = backendConnectionSettings;

                    if (!vm.backendConnection.data.address) {
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

        vm.testBackendConnection = vm.backendConnection.test;
        vm.refreshUnblockList = vm.unblockList.refresh;
        vm.addHostToUnblockList = vm.unblockList.addHost;
        vm.removeHostFromUnblockList = vm.unblockList.removeHost;

        init();

        $scope.$watch('vm.unblockList.list', (newValue) => {
            console.log(newValue);

            if (!_.isArray(newValue)) {
                return;
            }

            vm.unblockList.isModified = !_.isEqual(
                new Set(vm.unblockList.list),
                new Set(vm.unblockList.savedList),
            );

            console.log(vm.unblockList.isModified);

            vm.footer.updateFlags();
        });
    });
}
