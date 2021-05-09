import * as _ from 'lodash';
import template from '../../pages/ui/point-to-point-tunnels/point-to-point-tunnels-section.html';
import {getAngularService, getTemplate} from '../lib/ndmUtils';
import {OTHER_CONNECTIONS_TEMPLATE_PATH} from '../lib/constants';

const pointToPointService = (function() {
    const $q = getAngularService('$q');
    const utils = getAngularService('utils');
    const router = getAngularService('router');
    const interfaces = getAngularService('interfaces');

    const {
        INTERFACE_STATE,
        STATE_CATEGORY,
    } = interfaces.constants;

    const SHOW_INTERFACE_PATH = 'show.interface';
    const SHOW_RC_INTERFACE_PATH = 'show.rc.interface';
    const SHOW_INTERFACE_STAT = 'show.interface.stat';

    const TUNNEL_TYPES = ['IPIP', 'Gre', 'EoIP']
    const EMPTY_VAL_HTML = '&mdash;';

    const determineTunnelStatus = (
        showInterfaceData,
        showScheduleData = {},
    ) => {
        if (interfaces.isScheduleOff(showScheduleData)) {
            return interfaces.getInterfaceStatusObject(
                INTERFACE_STATE.DOWN_ON_SCHEDULE,
                STATE_CATEGORY.INFO,
                showInterfaceData,
            );
        }

        if (showInterfaceData.state === 'down') {
            return interfaces.getInterfaceStatusObject(
                INTERFACE_STATE.DOWN,
                STATE_CATEGORY.INFO,
                showInterfaceData,
            );
        }

        if (showInterfaceData.connected !== 'yes') {
            return interfaces.getInterfaceStatusObject(
                INTERFACE_STATE.NOT_READY,
                STATE_CATEGORY.INFO,
                showInterfaceData,
            );
        }

        return interfaces.getInterfaceStatusObject(
            INTERFACE_STATE.CONNECTED,
            STATE_CATEGORY.OK,
            showInterfaceData,
        );
    };

    const formatBytesColumn = val => {
        return isNaN(Number(val))
            ? EMPTY_VAL_HTML
            : utils.format.size(Number(val));
    };

    const formatUptime = (uptime, tunnelRow) => {
        return tunnelRow.isEnabled
            ? utils.getSplittedTime(uptime)
            : EMPTY_VAL_HTML;
    };

    const formatIpData = (ip) => {
        return ip === '0.0.0.0'
            ? EMPTY_VAL_HTML
            : ip;
    };

    const getInterfaceStatByIdData = (idList = []) => {
        if (idList.length === 0) {
            return $q.when({});
        }

        const statQuery = _.set({}, SHOW_INTERFACE_STAT, idList.map(id => ({name: id})));

        return router.postToRciRoot(statQuery).then(response => {
            const showInterfaceStat = _.get(response, SHOW_INTERFACE_STAT, []);

            return idList.reduce(
                (acc, id, index) => {
                    return {
                        ...acc,
                        [id]: _.get(showInterfaceStat, [index], {}),
                    };
                },
                {},
            );
        });
    };

    const getTableDateQueries = () => {
        return utils.toRciQueryList([
            SHOW_INTERFACE_PATH,
            SHOW_RC_INTERFACE_PATH,
        ]);
    };

    const destructureTableDataResponses = (responses) => {
        const showInterface = _.get(responses, `[0].${SHOW_INTERFACE_PATH}`, {});
        const showRcInterface = _.get(responses, `[1].${SHOW_RC_INTERFACE_PATH}`, {});

        return {
            showInterface,
            showRcInterface,
        };
    };

    const getTunnelsList = ({showInterface, showRcInterface}) => {
        const matchingShowInterfaceObjects = _.pickBy(
            showInterface,
            ({type}) => TUNNEL_TYPES.includes(type),
        );

        return _.map(
            matchingShowInterfaceObjects,
            (showInterfaceItem) => {
                const {id, uptime, type} = showInterfaceItem;
                const interfaceConfiguration = showRcInterface[id];

                return {
                    id: id,
                    type: type.toUpperCase(),
                    isEnabled: Boolean(interfaceConfiguration.up),
                    description: showInterfaceItem.description || id,
                    source: _.get(showInterfaceItem, 'tunnel-local-source', ''),
                    destination: _.get(showInterfaceItem, 'tunnel-remote-destination', ''),
                    uptime: uptime || 0,
                    data: {
                        status: showInterfaceItem,
                        configuration: interfaceConfiguration,
                    },
                };
            },
        );
    };

    const toggleTunnelState = (tunnelId, state) => {
        return interfaces.toggleState(tunnelId, state);
    };

    return {
        getTableDateQueries,
        destructureTableDataResponses,

        getTunnelsList,
        toggleTunnelState,

        getInterfaceStatByIdData,

        formatBytesColumn,
        formatUptime,
        formatIpData,

        determineTunnelStatus,
    };
})();

function PointToPointController($scope, otherConnectionsService) {
    const vm = this;
    const requester = otherConnectionsService.requester;

    vm.progress = 0;
    vm.isReady = false;

    vm.table = {
        columns: {
            'description': {
                title: 'Name',
                width: 180,
                directive: {
                    name: 'ndm-toggle',
                    options: {
                        'label-on': '{{row.description | escapeHtml}}',
                        'label-off': '{{row.description | escapeHtml}}',
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
                title: 'Source',
                modify: pointToPointService.formatIpData,
            },
            destination: {
                title: 'Destination',
                modify: pointToPointService.formatIpData,
            },
            txbytes: {
                title: 'otherConnections.ppp.transmitted',
                modify: pointToPointService.formatBytesColumn,
            },
            rxbytes: {
                title: 'otherConnections.ppp.received',
                modify: pointToPointService.formatBytesColumn,
            },
            uptime: {
                title: 'otherConnections.ppp.connected',
                modify: pointToPointService.formatUptime,
            },
        },
        dataIsLoaded: false,
        data: [],
    };

    let rowsToPreserveToggleState = {};

    requester.registerCallback(
        pointToPointService.getTableDateQueries(),
        (responses) => {
            const pollData = pointToPointService.destructureTableDataResponses(responses);
            const list = pointToPointService.getTunnelsList(pollData);
            const idList = _.map(list, 'id');

            return pointToPointService.getInterfaceStatByIdData(idList).then(statDataById => {
                vm.table.data = list.map(row => {
                    const {id} = row;

                    if (rowsToPreserveToggleState[id]) {
                        row.isEnabled = rowsToPreserveToggleState[id];
                        rowsToPreserveToggleState = _.omit(rowsToPreserveToggleState, [id]);
                    }

                    const statData = _.pick(statDataById[id], ['rxbytes', 'txbytes']);
                    const status = pointToPointService.determineTunnelStatus(row.data.status);

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

export const addPointToPointTunnelSection = () => {
    const $templateCache = getAngularService('$templateCache');
    const otherConnectionsTemplate = getTemplate(OTHER_CONNECTIONS_TEMPLATE_PATH);

    if (otherConnectionsTemplate.includes('PointToPointController')) {
        return;
    }

    const previousSectionIncludeIndex = otherConnectionsTemplate.indexOf('wireguard.section.html');
    const closingTag = '</div>';
    const injectIndex = otherConnectionsTemplate.indexOf(closingTag, previousSectionIncludeIndex) + closingTag.length;

    const prefix = otherConnectionsTemplate.substr(0, injectIndex);
    const suffix = otherConnectionsTemplate.substr(injectIndex);

    $templateCache.put(OTHER_CONNECTIONS_TEMPLATE_PATH, prefix + template + suffix);

    const $rootScope = getAngularService('$rootScope');

    // We add controller to the $rootScope,
    // otherwise it won't be available on page load
    $rootScope.PointToPointController = PointToPointController;
}
