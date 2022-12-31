import * as _ from 'lodash';
import * as ndmUtils from '../../lib/ndmUtils';
import {routesToolsService} from './routes-tools.service';
import {getL10n} from '../../lib/l10nUtils';
import {logWarning} from '../../lib/log';

const ROOT_ELEMENT_SELECTOR = '.routes-ip-lookup';

export function IpLookupController() {
    const element = angular.element(document.querySelector(ROOT_ELEMENT_SELECTOR));

    if (!element) {
        logWarning(`Failed to get toolbar root element (${ROOT_ELEMENT_SELECTOR})`);

        return;
    }

    const vm = this;

    const $scope = element.scope();
    const notification = ndmUtils.getAngularService('notification');
    const $rootScope = ndmUtils.getAngularService('$rootScope');

    const pageController = ndmUtils.getAncestorScopeProperty($scope, 'SRC');
    const {routesTable} = pageController;

    vm.l10n = {};

    const updateL10n = () => {
        vm.l10n = {
            nslookupLabel: getL10n('RoutesToolbarNslookupLabel'),
            nslookupDomainPlaceholder: getL10n('RoutesToolbarNslookupDomainPlaceholder'),
            nslookupQueryIpBtnLabel: getL10n('RoutesToolbarNslookupQueryIpBtnLabel'),
            nslookupClearBtnLabel: getL10n('RoutesToolbarNslookupClearBtnLabel'),

            nslookupResultsHeader: getL10n('RoutesToolbarNslookupResultsLabel'),
            nslookupEmptyResults: getL10n('RoutesToolbarNslookupResultsAreEmpty'),

            nslookupCreateRouteLabel: getL10n('RoutesToolbarNslookupCreateRouteLabel'),
            nslookupCreateRouteBtnLabel: getL10n('RoutesToolbarNslookupCreateRouteBtnLabel'),
            nslookupTimeoutNotification: getL10n('RoutesToolbarNslookupQueryTimeoutNotification'),
        };
    };

    updateL10n();
    ndmUtils.onLanguageChange(updateL10n);

    vm.domain = '';
    vm.isDomainValid = false;
    vm.interfaceOptions = [];
    vm.interfaceId = '';
    vm.subnetsList = [];
    vm.isLookupResultEmpty = false;
    vm.isUiLocked = false;

    vm.is2xFirmware = ndmUtils.isLegacyVersion(_.get($rootScope, 'kdte.ndwBranch', ''));

    vm.lockUi = () => {
        vm.isUiLocked = true;
    };

    vm.unlockUi = () => {
        vm.isUiLocked = false;
    };

    vm.onDomainValidationEnd = ndmUtils.getDebouncedCallback((isValid) => {
        vm.isDomainValid = isValid;
    });

    vm.clearLookupResults = () => {
        vm.interfaceId = '';
        vm.subnetsList = [];

        vm.isLookupResultEmpty = false;
    };

    vm.reset = () => {
        vm.domain = '';
        vm.isDomainValid = false;

        vm.clearLookupResults();
    };

    vm.createRoutes = () => {
        vm.lockUi();

        const routes = vm.subnetsList.map(subnet => {
            const commonData = {
                comment: vm.domain,
                'interface': vm.interfaceId,
            };

            if (subnet.length === 1) {
                return {host: subnet.ipList[0], ...commonData}
            } else {
                return {
                    network: subnet.network,
                    mask: subnet.mask,
                    ...commonData,
                };
            }
        });

        return routesToolsService.saveRoutes(routes)
            .then(() => routesTable.loadRoutes())
            .finally(() => {
                vm.unlockUi();
                vm.reset();
            });
    };

    vm.queryIp = () => {
        vm.lockUi();
        vm.clearLookupResults();

        return routesToolsService.getIpListForDomain(vm.domain, 100)
            .then(
                (ipList) => {
                    if (ipList.length > 0) {
                        vm.subnetsList = routesToolsService.splitIntoSubnets(ipList);
                    } else {
                        vm.isLookupResultEmpty = true;
                    }
                },
                () => {
                    notification.info(vm.l10n.nslookupTimeoutNotification);
                },
            )
            .finally(() => vm.unlockUi());
    };

    routesToolsService.getShowInterfaceData().then(showInterfaceData => {
        vm.interfaceOptions = routesToolsService.getSuitableInterfaceOptions(showInterfaceData);
    });
}
