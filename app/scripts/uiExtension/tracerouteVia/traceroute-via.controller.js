import * as _ from 'lodash';
import {logWarning} from '../../lib/log';
import {getAncestorScopeProperty, getAngularService, onLanguageChange} from '../../lib/ndmUtils';
import {getL10n} from '../../lib/l10nUtils';

const $timeout = getAngularService('$timeout');
const router = getAngularService('router');
const interfaces = getAngularService('interfaces');
const diagnosticsTools = getAngularService('diagnosticsTools');

const origStartTool = diagnosticsTools.startTool;

const ROOT_ELEMENT_SELECTOR = '.traceroute-via';
const VIA_ANY_INTERFACE = '__VIA_ANY_INTERFACE__';

export function TracerouteViaController() {
    const element = angular.element(document.querySelector(ROOT_ELEMENT_SELECTOR));

    if (!element) {
        logWarning(`Failed to get toolbar root element (${ROOT_ELEMENT_SELECTOR})`);

        return;
    }

    const $scope = element.scope();

    $scope.$on('$destroy', () => {
        $timeout.cancel(vm.updateShowInterfaceTimer$);

        diagnosticsTools.startTool = origStartTool;
    })

    const vm = this;
    const pageController = getAncestorScopeProperty($scope, 'diagnostics');

    const getViaAnyOption = () => {
        return {
            id: VIA_ANY_INTERFACE,
            label: vm.l10n.viaAnyOption,
        };
    };

    vm.pageController = pageController;
    vm.l10n = {};
    vm.viaInterfaceOptions = [getViaAnyOption()];
    vm.viaInterface = VIA_ANY_INTERFACE;
    vm.showInterfaceData = {};
    vm.updateShowInterfaceTimer$ = null;

    diagnosticsTools.startTool = (toolName, data) => {
        if (toolName !== 'traceroute') {
            return origStartTool(toolName, data);
        }

        const queryData = _.pick(data, ['max-ttl', 'host', 'type']);

        if (data.packetsize) {
            queryData['packet-size'] = data.packetsize
        }

        if (vm.viaInterface !== VIA_ANY_INTERFACE) {
            queryData['source-address'] = vm.viaInterface;
        }

        return router.post({
            url: `tools/${toolName}`,
            data: queryData,
        });
    };

    const updateInterfaceOptions = (showInterfaceData) => {
        const options = _.invoke(interfaces, 'getInterfaceOptions', showInterfaceData) || [];

        const suitableOptions = options
            .filter(option => {
                const status = _.get(showInterfaceData, [option.id], {});

                return _.has(status, 'address')
                    && _.get(status, 'security-level', '') !== 'private';
            })
            .map(option => {
                const status = _.get(showInterfaceData, [option.id], {});

                return {
                    id: _.get(status, 'address', ''),
                    label: option.label,
                };
            });

        vm.viaInterfaceOptions = [
            getViaAnyOption(),
            ...suitableOptions,
        ];
    }

    const updateL10n = () => {
        vm.l10n = {
            viaInterfaceLabel: getL10n('tracerouteViaLabel'),
            viaAnyOption: getL10n('tracerouteViaAnyOption'),
        };

        updateInterfaceOptions(vm.showInterfaceData);
    };

    updateL10n();
    onLanguageChange(() => updateL10n());

    const updateShowInterfaceData = () => {
        router.cached('show.interface').then((showInterfaceData) => {
            vm.showInterfaceData = showInterfaceData;

            updateInterfaceOptions(vm.showInterfaceData);

            vm.updateShowInterfaceTimer$ = $timeout(updateShowInterfaceData, 10000);
        });
    }

    updateShowInterfaceData();
}