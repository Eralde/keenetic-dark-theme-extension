import * as _ from 'lodash';
import {getAngularService, getNgL10n, onLanguageChange} from '../../lib/ndmUtils';
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

    const {IPSEC_SUFFIX, TYPE_L10N_ID} = pointToPointService;

    const $scope = element.scope();

    vm.l10n = {};

    const updateL10n = () => {
        vm.l10n = {
            header: getL10n('otherConnections_pointToPoint_header'),
            description: getL10n('otherConnections_pointToPoint_description'),
            table_any: getL10n('otherConnections_pointToPoint_table_any'),
            table_column_connection: getL10n('otherConnections_pointToPoint_table_column_connection'),
            table_column_type: getL10n('otherConnections_pointToPoint_table_column_type'),
            table_column_source: getL10n('otherConnections_pointToPoint_table_column_source'),
            table_column_destination: getL10n('otherConnections_pointToPoint_table_column_destination'),
            table_column_sent: getL10n('otherConnections_pointToPoint_table_column_sent'),
            table_column_received: getL10n('otherConnections_pointToPoint_table_column_received'),
            table_column_uptime: getL10n('otherConnections_pointToPoint_table_column_uptime'),

            TUNNEL_TYPE: TYPE_L10N_ID,
        };
    };

    updateL10n();

    const otherConnectionsService = getAngularService('otherConnectionsService');
    const interfaces = getAngularService('interfaces');

    const {
        ANY_PPP_INSTALLED,
        WIREGUARD_INSTALLED,
    } = otherConnectionsService;

    vm.HR_IS_VISIBLE = ANY_PPP_INSTALLED || WIREGUARD_INSTALLED;

    vm.requester = otherConnectionsService.requester;
    vm.rowsToPreserveToggleState = {};

    vm.progress = 0;
    vm.isReady = false;

    vm.table = {
        columns: {
            'description': {
                title: vm.l10n.table_column_connection,
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
                title: vm.l10n.table_column_type,
                modify: (type, row) => {
                    const suffix = row.isIpsecEnabled ? IPSEC_SUFFIX : '';

                    return `${vm.l10n.TUNNEL_TYPE[type]}${suffix}`;
                },
            },
            source: {
                title: vm.l10n.table_column_source,
                modify: formatIpData,
            },
            destination: {
                title: vm.l10n.table_column_destination,
                modify: formatIpData,
            },
            txbytes: {
                title: vm.l10n.table_column_sent,
                modify: formatBytesColumn,
            },
            rxbytes: {
                title: vm.l10n.table_column_received,
                modify: formatBytesColumn,
            },
            uptime: {
                title: vm.l10n.table_column_uptime,
                modify: formatUptime,
            },
        },
        dataIsLoaded: false,
        data: [],
    };

    onLanguageChange(() => {
        updateL10n();

        vm.table.columns.description.title = vm.l10n.table_column_connection;
        vm.table.columns.type.title = vm.l10n.table_column_type;
        vm.table.columns.source.title = vm.l10n.table_column_source;
        vm.table.columns.destination.title = vm.l10n.table_column_destination;
        vm.table.columns.txbytes.title = vm.l10n.table_column_sent;
        vm.table.columns.rxbytes.title = vm.l10n.table_column_received;
        vm.table.columns.uptime.title = vm.l10n.table_column_uptime;
    });

    vm.editTunnel = (row) => {
        $scope.$broadcast(pointToPointService.EVENTS.OPEN_EDITOR, row);
    };

    const getOnToggleCallback = (row) => {
        return (val) => {
            const {id} = row;

            vm.requester.stopPolling();

            vm.rowsToPreserveToggleState[id] = val;

            return interfaces.toggleState(id, val)
                .finally(() => {
                    if (!val) {
                        row.status = interfaces.determineInterfaceState({state: 'down'});
                    }

                    vm.requester.startPolling();
                });
        };
    };

    pointToPointService.registerPollRequest(
        vm.requester,
        pollData => {
            vm.showSchedule = pollData.showSchedule;
            vm.usedSubnets = pollData.usedSubnets;
            vm.interfaceOptions = pollData.interfaceOptions;
            vm.interfaceIdToLabelMap = pollData.interfaceIdToLabelMap;

            const idList = _.map(pollData.tableData, 'id');

            return pointToPointService.getInterfaceStatByIdData(idList).then(statDataById => {
                vm.table.data = pollData.tableData.map(row => {
                    const {id} = row;
                    let {isEnabled} = row;

                    if (_.has(vm.rowsToPreserveToggleState, id)) {
                        isEnabled = vm.rowsToPreserveToggleState[id];
                        vm.rowsToPreserveToggleState = _.omit(vm.rowsToPreserveToggleState, [id]);
                    }

                    const statData = _.pick(statDataById[id], ['rxbytes', 'txbytes']);

                    return {
                        ...row,
                        ...statData,
                        isEnabled,
                        onToggle: getOnToggleCallback(row),
                    };
                });

                vm.table.dataIsLoaded = true;
            });
        },
    )
}
