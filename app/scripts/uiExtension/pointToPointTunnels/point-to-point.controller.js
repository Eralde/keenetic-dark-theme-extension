import * as _ from 'lodash';
import {getAngularService, onLanguageChange} from '../../lib/ndmUtils';
import {getL10n} from '../../lib/l10nUtils';
import {formatBytesColumn, formatIpData, formatUptime} from '../../lib/formatUtils';
import {logWarning} from '../../lib/log';
import {pointToPointService} from './point-to-point.service';

const ROOT_ELEMENT_SELECTOR = '.point-to-point-section';

// Do not reference any services as the 'controller' parameters -- this will result in an injector error
export function PointToPointController() {
    const vm = this;

    const element = angular.element(document.querySelector(ROOT_ELEMENT_SELECTOR));

    if (!element) {
        logWarning(`Failed to get section root element (${ROOT_ELEMENT_SELECTOR})`);

        return;
    }

    const $scope = element.scope();

    const otherConnectionsService = getAngularService('otherConnectionsService');
    const requester = otherConnectionsService.requester;

    vm.progress = 0;
    vm.isReady = false;

    vm.table = {
        columns: {
            'description': {
                title: 'otherConnections.ppp.connection',
                width: 180,
                directive: {
                    name: 'ndm-toggle',
                    options: {
                        'label-on': '{{row.description}}',
                        'label-off': '{{row.description}}',
                        'ng-attr-call-on-change': 'row.onToggle',
                        'name': 'tunnel-{{row.id}}-',
                        'model': 'row.isEnabled',
                        'description': 'row.status',
                    },
                },
            },
            type: {
                title: 'otherConnections.ppp.type',
            },
            source: {
                title: getL10n('PointToPointSource'),
                modify: formatIpData,
            },
            destination: {
                title: getL10n('PointToPointDestination'),
                modify: formatIpData,
            },
            txbytes: {
                title: 'otherConnections.ppp.transmitted',
                modify: formatBytesColumn,
            },
            rxbytes: {
                title: 'otherConnections.ppp.received',
                modify: formatBytesColumn,
            },
            uptime: {
                title: 'otherConnections.ppp.connected',
                modify: formatUptime,
            },
        },
        dataIsLoaded: false,
        data: [],
    };

    onLanguageChange(() => {
        vm.table.columns.source.title = getL10n('PointToPointSource');
        vm.table.columns.destination.title = getL10n('PointToPointDestination');
    });

    vm.editTunnel = (row) => {
        $scope.$broadcast(pointToPointService.EVENTS.OPEN_EDITOR, row);
    };

    let rowsToPreserveToggleState = {};

    // No need to dynamically check if UI extensions are enabled:
    // if any other section is visible on the 'Other connections' page,
    // `rci/show/interface` & `rci/interface` data will be polled regardless of UI extensions.
    requester.registerCallback(
        pointToPointService.getTableDateQueries(),
        (responses) => {
            const pollData = pointToPointService.destructureTableDataResponses(responses);
            const list = pointToPointService.getTunnelsList(pollData);
            const idList = _.map(list, 'id');

            const {showInterface} = pollData;

            vm.interfaceOptionsList = pointToPointService.getInterfaceOptionsList(showInterface);
            vm.defaultInterfaceId = pointToPointService.getDefaultInterfaceId(showInterface);
            vm.restrictedSubnetsList = pointToPointService.getRestrictedSubnetsList(pollData);

            return pointToPointService.getInterfaceStatByIdData(idList).then(statDataById => {
                vm.table.data = list.map(row => {
                    const {id} = row;

                    if (rowsToPreserveToggleState[id]) {
                        row.isEnabled = rowsToPreserveToggleState[id];
                        rowsToPreserveToggleState = _.omit(rowsToPreserveToggleState, [id]);
                    }

                    const statData = _.pick(statDataById[id], ['rxbytes', 'txbytes']);
                    const status = pointToPointService.determineTunnelStatus(row.rawData.showInterfaceItem);

                    const onToggle = (state) => {
                        rowsToPreserveToggleState[id] = state;
                        requester.stopPolling();

                        return pointToPointService.toggleTunnelState(id, state)
                            .finally(() => {
                                requester.startPolling();
                            });
                    };

                    return {
                        ...row,
                        ...statData,
                        status,
                        onToggle,
                    };
                });

                vm.table.dataIsLoaded = true;

                vm.progress = 100;
                vm.isReady = true;
            });
        },
    );
}
