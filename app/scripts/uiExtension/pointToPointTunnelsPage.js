import * as _ from 'lodash';
import template from '../../pages/ui/point-to-point-tunnels/point-to-point-tunnels.html';
import {getAngularService} from '../lib/ndmUtils';
import {OTHER_CONNECTIONS_STATE} from "../lib/constants";

const $stateRegistry = getAngularService('$stateRegistry');

const MY_INTERNET_GROUP = 'menu.myInternet';
const SHOW_INTERFACE_PATH = 'show.interface';
const SHOW_RC_INTERFACE_PATH = 'show.rc.interface';

const TUNNEL_TYPES = ['IPIP', 'Gre', 'EoIP']

const pointToPointService = (function(utils, router, interfaces) {
    const getTableDateQueries = () => {
        return utils.toRciQueryList([
            SHOW_INTERFACE_PATH,
            SHOW_RC_INTERFACE_PATH],
        );
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
                const {id, type} = showInterfaceItem;
                const interfaceConfiguration = showRcInterface[id];

                return {
                    id: id,
                    type: type.toUpperCase(),
                    isEnabled: Boolean(interfaceConfiguration.up),
                    description: showInterfaceItem.description || id,
                    source: _.get(showInterfaceItem, 'tunnel-local-source', ''),
                    destination: _.get(showInterfaceItem, 'tunnel-remote-destination', ''),
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
            }
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

            vm.table.data = list.map(row => {
                if (rowsToPreserveToggleState[row.id]) {
                    row.isEnabled = rowsToPreserveToggleState[row.id];
                    rowsToPreserveToggleState = _.omit(rowsToPreserveToggleState, [row.id]);
                }

                const onToggle = (state) => {
                    rowsToPreserveToggleState[row.id] = state;
                    requester.stopPolling();

                    return pointToPointService.toggleTunnelState(row.id, state)
                        .finally(() => {
                            requester.startPolling();
                        });
                };

                return {
                    ...row,
                    onToggle,
                };
            });

            vm.table.dataIsLoaded = true;

            vm.progress = 100;
            vm.isReady = true;
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
