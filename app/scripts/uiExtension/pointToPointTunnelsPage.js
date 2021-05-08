import * as _ from 'lodash';
import template from '../../pages/ui/point-to-point-tunnels/point-to-point-tunnels.html';
import {getAngularService} from '../lib/ndmUtils';
import {OTHER_CONNECTIONS_STATE} from "../lib/constants";

const $stateRegistry = getAngularService('$stateRegistry');

const MY_INTERNET_GROUP = 'menu.myInternet';
const pointToPointService = (function(utils, router, interfaces) {
    const SHOW_INTERFACE_PATH = 'show.interface';
    const SHOW_RC_INTERFACE_PATH = 'show.rc.interface';
    const SHOW_INTERFACE_STAT = 'show.interface.stat';

    const TUNNEL_TYPES = ['IPIP', 'Gre', 'EoIP']
    const EMPTY_VAL_HTML = '&mdash;';

    const formatBytesColumn = val => {
        return isNaN(Number(val))
            ? EMPTY_VAL_HTML
            : utils.format.size(Number(val));
    };

    const formatUptime = (uptime, tunnelRow) => {
        return tunnelRow.isEnabled ? utils.getSplittedTime(uptime) : EMPTY_VAL_HTML;
    };

    const getInterfaceStatByIdData = (idList = []) => {
        const statQuery = idList.length > 0
            ? _.set({}, SHOW_INTERFACE_STAT, idList.map(id => ({name: id})))
            : {};

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
        })
    }

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
            }
        );
    };

    const toggleTunnelState = (tunnelId, state) => interfaces.toggleState(tunnelId, state);

    return {
        getTableDateQueries,
        destructureTableDataResponses,

        getTunnelsList,
        toggleTunnelState,

        getInterfaceStatByIdData,
        formatBytesColumn,
        formatUptime,
    };
})(...['utils', 'router', 'interfaces'].map(getAngularService));

function pointToPointController($scope, requesterFactory) {
    const vm = this;
    const requester = requesterFactory.createRequester();

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
                title: 'Type',
            },
            source: {
                title: 'Source',
            },
            destination: {
                title: 'Destination',
            },
            txbytes: {
                title: 'otherConnections.ppp.transmitted',
                modify: pointToPointService.formatBytesColumn
            },
            rxbytes: {
                title: 'otherConnections.ppp.received',
                modify: pointToPointService.formatBytesColumn
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
                        onToggle,
                    };
                });

                vm.table.dataIsLoaded = true;

                vm.progress = 100;
                vm.isReady = true;
            });
        },
    );

    requester.startPolling();

    $scope.$on('$destroy', () => {
        requester.clearCallbacks();
        requester.stopPolling();
    });
}


export const addPointToPointTunnelsPage = () => {
    const pointToPointTunnelsState = {
        name: 'controlPanel.pointToPoint',
        url: '/point-to-point',
        menuTitle: 'IPIP, GRE, EoIP ',
        views: {
            templateUrl: 'app/page/controlPanel/controlPanel.html',
            'cp-main': {
                controller: pointToPointController,
                controllerAs: 'vm',
                template: template,
            }
        }
    };


    $stateRegistry.register(pointToPointTunnelsState);

    const menuService = getAngularService('menuService');
    const origGetMenu = menuService.getMenu;

    menuService.getMenu = () => {
        return origGetMenu().then(menu => {
            const keys = Object.keys(menu);
            const otherConnectionsIndex = _.findIndex(keys, key => key === OTHER_CONNECTIONS_STATE);

            const before = keys.slice(0, otherConnectionsIndex + 1);
            const after = keys.slice(otherConnectionsIndex + 1);

            const stateData = {...pointToPointTunnelsState, sref: pointToPointTunnelsState.name};

            const _menu =  {
                ..._.pick(menu, before),
                [pointToPointTunnelsState.name]: stateData,
                ..._.pick(menu, after),
            }

            if (!_menu[MY_INTERNET_GROUP]) {
                return _menu;
            }

            _menu[MY_INTERNET_GROUP].points = {
                ..._.cloneDeep(_menu[MY_INTERNET_GROUP].points),
                [pointToPointTunnelsState.name]: stateData,
            };

            return _menu;
        });
    };

    menuService.updateMenu();
}
