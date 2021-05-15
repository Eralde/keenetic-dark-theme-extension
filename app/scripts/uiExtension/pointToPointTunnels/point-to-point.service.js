import {getAngularService} from "../../lib/ndmUtils";
import * as _ from "lodash";

export const pointToPointService = (function() {
    const $q = getAngularService('$q');
    const utils = getAngularService('utils');
    const router = getAngularService('router');
    const interfaces = getAngularService('interfaces');
    const CONSTANT = getAngularService('CONSTANT');
    // const wifiOptions = getAngularService('wifiOptions');
    // const Ipv6To4Service = getAngularService('Ipv6To4Service');

    const {
        INTERFACE_STATE,
        STATE_CATEGORY,
    } = interfaces.constants;

    const SHOW_INTERFACE_PATH = 'show.interface';
    const SHOW_RC_INTERFACE_PATH = 'show.rc.interface';
    const SHOW_INTERFACE_STAT = 'show.interface.stat';

    const NO = {no: true};

    const INTERFACE_CMD = 'interface';
    const TUNNEL_DESTINATION_PROP = 'tunnel.destination';
    const TUNNEL_EOIP_ID_PROP = 'tunnel.eoip.id';
    const IP_ADDRESS_PROP = 'ip.address';
    const IP_ADDRESS_ADDRESS_PROP = 'ip.address.address';
    const IP_ADDRESS_MASK_PROP = 'ip.address.mask';

    const TUNNEL_TYPE = {
        IPIP: 'IPIP',
        GRE: 'Gre',
        EOIP: 'EoIP',
    };

    const TUNNEL_TYPES_LIST = [
        TUNNEL_TYPE.IPIP,
        TUNNEL_TYPE.GRE,
        TUNNEL_TYPE.EOIP,
    ];

    const EMPTY_VAL_HTML = '&mdash;';
    const IS_IPSEC_AVAILABLE = 0 && _.has(window, 'NDM.profile.components.ipsec');

    const EVENTS = {
        OPEN_EDITOR: 'POINT_TO_POINT_OPEN_EDITOR',
    };

    const getInterfaceDescriptionQuery = (interfaceId, description) => {
        return _.set({}, [INTERFACE_CMD, interfaceId], {description});
    };

    // const {AP_IFACE_PREFIX} = wifiOptions;
    // const {TUNNEL_6_TO_4_TYPE} = Ipv6To4Service;

    // const canBeGlobal = ({global}) => !_.isUndefined(global);
    // const isAccessPoint = ({type}) => type === AP_IFACE_PREFIX;
    // const indexIsLessThen2 = ({id}) => Number(id.split(AP_IFACE_PREFIX)[1]) <= 1;
    // const isTunnel6to4 = ({type}) => type === TUNNEL_6_TO_4_TYPE;
    const isPointToPoint = ({type}) => TUNNEL_TYPES_LIST.includes(type);

    const getInterfaceOptionsList = (showInterfaceData) => {
        return interfaces.getInterfaceOptions(showInterfaceData)
            .filter(item => !isPointToPoint(item));

        // return [
        //     ...options
        //         .filter(canBeGlobal)
        //         .filter(option => !isAccessPoint(option) || indexIsLessThen2(option)),
        //
        //     ...options.filter(isTunnel6to4)
        // ];
    };

    const getDefaultInterfaceId = (showInterfaceData) => {
        const defaultGwInterface = _.find(showInterfaceData, item => item.defaultgw === true);
        const maxPriorityInterface = _.maxBy(showInterfaceData, 'priority');
        const globalInterface = _.find(showInterfaceData, item => item.global === true);

        return _.get(defaultGwInterface, 'id')
            || _.get(maxPriorityInterface, 'id')
            || _.get(globalInterface, 'id', '');
    };

    const getNextFreeId = (type) => {
        const query = _.set({}, SHOW_INTERFACE_PATH, {});

        return router.postToRciRoot(query).then(response => {
            const showInterface = _.get(response, SHOW_INTERFACE_PATH, {});
            const existingIndexes = _.filter(showInterface, item => item.type === type)
                .map(item => Number(item.id.replace(type, '')));

            const unusedIndex = utils.firstUnusedId(existingIndexes);

            return `${type}${unusedIndex}`;
        });
    };

    const getTunnelTypeOptions = () => {
        return TUNNEL_TYPES_LIST.map(item => ({id: item, label: item}));
    };

    const getDefaultTunnelModel = (defaultInterfaceId) => {
        return {
            isNew: true,
            id: '',
            description: '',
            type: TUNNEL_TYPE.IPIP,
            address: '',
            mask: CONSTANT.DEFAULT_NETMASK,
            eoipId: '',
            destinationAddress: '',
            interfaceId: defaultInterfaceId,

            ipsec: {
                isServer: true,
                isEnabled: false,
                presharedKey: '',
            },
        };
    };

    const saveTunnel = (model) => {
        const id$ = model.isNew
            ? getNextFreeId(model.type)
            : $q.when(model.id)

        return id$.then(id => {
            const prefix = `${INTERFACE_CMD}.${id}`;

            const descriptionQuery = getInterfaceDescriptionQuery(id, model.description);
            const ipAddressQuery = _.set(
                {},
                `${prefix}.${IP_ADDRESS_PROP}`,
                _.pick(model, ['address', 'mask']),
            );

            const eoipIdQuery = model.type === TUNNEL_TYPE.EOIP
                ? _.set({}, `${prefix}.${TUNNEL_EOIP_ID_PROP}`, model.eoipId)
                : {};

            const tunnelDestinationQuery = _.set(
                {},
                `${prefix}.${TUNNEL_DESTINATION_PROP}`,
                model.destinationAddress,
            );

            const queries = [
                descriptionQuery,
                upQuery,
                ipAddressQuery,
                eoipIdQuery,
                tunnelDestinationQuery,
            ];

            return router.postAndSave(queries);
        });
    }

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

    const getRestrictedSubnetsList = ({showInterface, showRcInterface}) => {
        const labelByIfaceId = interfaces.getInterfaceIdToLabelMap(showInterface);

        const usedSubnets = interfaces.getAllUsedSubnets(
            showInterface,
            showRcInterface,
        );

        return usedSubnets.map(subnet => ({...subnet, label: labelByIfaceId[subnet.ifaceId]}));
    }

    const getTunnelsList = ({showInterface, showRcInterface}) => {
        const matchingShowInterfaceObjects = _.pickBy(
            showInterface,
            ({type}) => TUNNEL_TYPES_LIST.includes(type),
        );

        return _.map(
            matchingShowInterfaceObjects,
            (showInterfaceItem) => {
                const {id, uptime, type} = showInterfaceItem;
                const interfaceConfiguration = showRcInterface[id];

                const description = showInterfaceItem.description || id;

                return {
                    id: id,
                    type: type.toUpperCase(),
                    isEnabled: Boolean(interfaceConfiguration.up),
                    description,
                    source: _.get(showInterfaceItem, 'tunnel-local-source', ''),
                    destination: _.get(showInterfaceItem, 'tunnel-remote-destination', ''),
                    uptime: uptime || 0,
                    data: {
                        status: showInterfaceItem,
                        configuration: interfaceConfiguration,
                    },
                    model: {
                        isNew: false,
                        id,
                        type,
                        description,
                        address: _.get(interfaceConfiguration, IP_ADDRESS_ADDRESS_PROP),
                        mask: _.get(interfaceConfiguration, IP_ADDRESS_MASK_PROP),
                        destinationAddress: _.get(interfaceConfiguration, TUNNEL_DESTINATION_PROP)
                    }
                };
            },
        );
    };

    const toggleTunnelState = (tunnelId, state) => {
        return interfaces.toggleState(tunnelId, state);
    };

    const deleteTunnel = (tunnelId) => {
        const query = _.set({}, [INTERFACE_CMD, tunnelId], NO);

        return router.postAndSave(query);
    };

    return {
        EVENTS,
        TUNNEL_TYPE,
        IS_IPSEC_AVAILABLE,

        getInterfaceOptionsList,
        getRestrictedSubnetsList,
        getDefaultInterfaceId,
        getTableDateQueries,
        destructureTableDataResponses,

        getTunnelsList,

        toggleTunnelState,
        deleteTunnel,
        saveTunnel,

        getInterfaceStatByIdData,

        formatBytesColumn,
        formatUptime,
        formatIpData,

        determineTunnelStatus,

        getTunnelTypeOptions,
        getDefaultTunnelModel,
    };
})();
