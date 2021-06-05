import {getAngularService} from '../../lib/ndmUtils';
import * as _ from 'lodash';

export const pointToPointService = (function() {
    const $q = getAngularService('$q');
    const utils = getAngularService('utils');
    const router = getAngularService('router');
    const interfaces = getAngularService('interfaces');
    const CONSTANT = getAngularService('CONSTANT');

    const {
        INTERFACE_STATE,
        STATE_CATEGORY,
    } = interfaces.constants;

    const {DEFAULT_NETMASK} = CONSTANT;

    const SHOW_INTERFACE_PATH = 'show.interface';
    const SHOW_RC_INTERFACE_PATH = 'show.rc.interface';
    const SHOW_INTERFACE_STAT = 'show.interface.stat';

    const NO = {no: true};

    const INTERFACE_CMD = 'interface';
    const IP_ADDRESS_PROP = 'ip.address';
    const IP_ADDRESS_ADDRESS_PROP = 'ip.address.address';
    const IP_ADDRESS_MASK_PROP = 'ip.address.mask';
    const TUNNEL_EOIP_ID_PROP = 'tunnel.eoip.id';
    const TUNNEL_DESTINATION_PROP = 'tunnel.destination';
    const TUNNEL_SOURCE_ADDRESS_PROP = 'tunnel.source.address';
    const TUNNEL_SOURCE_INTERFACE_PROP = 'tunnel.source.interface';
    const TUNNEL_SOURCE_PROP = 'tunnel.source';
    const IPSEC_PRESHARED_KEY_PROP = 'ipsec.preshared-key';
    const IPSEC_IKEV2_PROP = 'ipsec.ikev2';
    const IPSEC_IGNORE_PROP = 'ipsec.ignore';
    const IPSEC_PRESHARED_KEY_KEY_PROP = 'ipsec.preshared-key.key';

    const SECURITY_LEVEL = {
        PUBLIC: 'public',
        PROTECTED: 'protected',
        PRIVATE: 'private',
    };

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

    const COMPONENT_DEPENDENCIES = {
        [TUNNEL_TYPE.IPIP]: 'ipip',
        [TUNNEL_TYPE.GRE]: 'gre',
        [TUNNEL_TYPE.EOIP]: 'eoip',
    }

    const EMPTY_VAL_HTML = '&mdash;';
    const IS_IPSEC_AVAILABLE = _.has(window, 'NDM.profile.components.ipsec');

    const EVENTS = {
        OPEN_EDITOR: 'POINT_TO_POINT_OPEN_EDITOR',
    };

    const isPointToPoint = ({type}) => TUNNEL_TYPES_LIST.includes(type);
    const isPort = ({type}) => type === 'Port';

    const getInterfaceDescriptionQuery = (interfaceId, description) => {
        return _.set({}, [INTERFACE_CMD, interfaceId], {description});
    };

    const getInterfaceSecurityLevelQuery = (interfaceId, securityLevel) => {
        const value = {
            'security-level': {
                [securityLevel]: true,
            },
        };

        return _.set({}, [INTERFACE_CMD, interfaceId], value);
    };

    const getInterfaceOptionsList = (showInterfaceData) => {
        return interfaces.getInterfaceOptions(showInterfaceData)
            .filter(item => !isPointToPoint(item))
            .filter(item => !isPort(item));
    };

    const getDefaultInterfaceId = (showInterfaceData) => {
        const defaultGwInterface = _.find(showInterfaceData, item => item.defaultgw === true);
        const maxPriorityInterface = _.maxBy(showInterfaceData, 'priority');
        const globalInterface = _.find(showInterfaceData, item => item.global === true);

        return _.get(defaultGwInterface, 'id')
            || _.get(maxPriorityInterface, 'id')
            || _.get(globalInterface, 'id', '');
    };

    /**
     * @param {string} type
     * @returns {Promise<string>}
     */
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
        return _
            .chain(TUNNEL_TYPE)
            .pickBy(type => {
                return _.has(window, ['NDM', 'profile', 'components', COMPONENT_DEPENDENCIES[type]]);
            })
            .map(item => ({id: item, label: item}))
            .value();
    };

    const getDefaultTunnelModel = (defaultInterfaceId) => {
        return {
            isNew: true,
            id: '',
            description: '',
            type: TUNNEL_TYPE.IPIP,
            address: '',
            mask: DEFAULT_NETMASK,
            eoipId: '',
            destinationAddress: '',

            ipsec: {
                isEnabled: false,
                isServer: true,
                presharedKey: '',
                tunnelSourceIsInterface: true,
                tunnelSourceInterfaceId: defaultInterfaceId,
                tunnelSourceAddress: '',
                tunnelDestination: '',
            },
        };
    };

    const getTunnelEditorModel = ({
        interfaceConfiguration,
        showInterfaceItem,
        interfaceOptionsList,
        defaultInterfaceId,
    }) => {
        const {id, type} = showInterfaceItem;
        const description = showInterfaceItem.description || id;

        const address = _.get(interfaceConfiguration, IP_ADDRESS_ADDRESS_PROP, '');
        const mask = _.get(interfaceConfiguration, IP_ADDRESS_MASK_PROP, DEFAULT_NETMASK);

        const eoipId = _.get(interfaceConfiguration, TUNNEL_EOIP_ID_PROP, '');

        const destinationAddress = _.get(interfaceConfiguration, TUNNEL_DESTINATION_PROP, '');

        // IPsec
        const isIpsecEnabled = _.has(interfaceConfiguration, 'ipsec')
            && !_.get(interfaceConfiguration, IPSEC_IGNORE_PROP, false);

        const presharedKey = _.get(interfaceConfiguration, IPSEC_PRESHARED_KEY_KEY_PROP, '');
        const isServer = _.has(interfaceConfiguration, TUNNEL_SOURCE_PROP);

        const tunnelSourceIsInterface = _.has(interfaceConfiguration, TUNNEL_SOURCE_INTERFACE_PROP);

        const sourceInterface = _.get(interfaceConfiguration, TUNNEL_SOURCE_INTERFACE_PROP, '');
        const tunnelSourceOption = _.find(
            interfaceOptionsList,
                option => option.id === sourceInterface || option.name === sourceInterface
        );

        const tunnelSourceInterfaceId = _.get(tunnelSourceOption, 'id', defaultInterfaceId);
        const tunnelSourceAddress = _.get(interfaceConfiguration, TUNNEL_SOURCE_ADDRESS_PROP, '');

        return {
            isNew: false,
            id,
            type,
            description,
            eoipId,
            address,
            mask,
            destinationAddress,
            ipsec: {
                isEnabled: isIpsecEnabled,
                isServer,
                presharedKey,
                tunnelSourceIsInterface,
                tunnelSourceInterfaceId,
                tunnelSourceAddress,
                tunnelDestination: destinationAddress,
            },
        };
    };

    const getTunnelIpsecQueries = (model, id) => {
        if (!IS_IPSEC_AVAILABLE) {
            return [];
        }

        const prefix = `${INTERFACE_CMD}.${id}`;

        let tunnelDestinationQuery;

        if (!model.ipsec.isEnabled) {
            tunnelDestinationQuery = {};
        } else {
            const value = model.ipsec.isServer
                ? NO
                : model.ipsec.tunnelDestination;

            tunnelDestinationQuery = _.set(
                {},
                `${prefix}.${TUNNEL_DESTINATION_PROP}`,
                value,
            );
        }

        let tunnelSourceQuery;

        if (!model.ipsec.isEnabled || !model.ipsec.isServer) {
            tunnelSourceQuery = _.set(
                {},
                `${prefix}.${TUNNEL_SOURCE_PROP}`,
                NO
            );
        } else {
            if (model.ipsec.tunnelSourceIsInterface) {
                tunnelSourceQuery = _.set(
                    {},
                    `${prefix}.${TUNNEL_SOURCE_INTERFACE_PROP}`,
                    model.ipsec.tunnelSourceInterfaceId,
                );
            } else {
                tunnelSourceQuery = _.set(
                    {},
                    `${prefix}.${TUNNEL_SOURCE_ADDRESS_PROP}`,
                    model.ipsec.tunnelSourceAddress,
                );
            }
        }

        const ipsecPresharedKeyQuery = model.ipsec.isEnabled
                ? _.set({}, `${prefix}.${IPSEC_PRESHARED_KEY_PROP}`, {key: model.ipsec.presharedKey})
                : _.set({}, `${prefix}.${IPSEC_PRESHARED_KEY_PROP}`, NO);

        const ipsecIkev2Query = _.set({}, `${prefix}.${IPSEC_IKEV2_PROP}`, model.ipsec.isEnabled)
        const ipsecIgnoreQuery = _.set({}, `${prefix}.${IPSEC_IGNORE_PROP}`, !model.ipsec.isEnabled);

        return [
            tunnelDestinationQuery,
            tunnelSourceQuery,
            ipsecPresharedKeyQuery,
            ipsecIkev2Query,
            ipsecIgnoreQuery,
        ];
    }

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

            const securityLevelQuery = getInterfaceSecurityLevelQuery(id, SECURITY_LEVEL.PRIVATE);

            const eoipIdQuery = model.type === TUNNEL_TYPE.EOIP
                ? _.set({}, `${prefix}.${TUNNEL_EOIP_ID_PROP}`, model.eoipId)
                : {};


            const tunnelDestinationQuery = model.ipsec.isEnabled
                ? {} // another query will be returned from the `getTunnelIpsecQueries` function
                : _.set({}, `${prefix}.${TUNNEL_DESTINATION_PROP}`, model.destinationAddress);

            const ipsecQueries = getTunnelIpsecQueries(model, id);

            const queries = [
                descriptionQuery,
                securityLevelQuery,
                ipAddressQuery,
                eoipIdQuery,
                tunnelDestinationQuery,
                ...ipsecQueries,
            ];

            return router.postAndSave(queries.filter(item => !_.isEmpty(item)));
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
        const matchingShowInterfaceObjects = _.pickBy(showInterface, isPointToPoint);

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
                    rawData: {
                        showInterfaceItem,
                        interfaceConfiguration,
                    },
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
        getTunnelEditorModel,

        toggleTunnelState,
        deleteTunnel,
        saveTunnel,

        getInterfaceStatByIdData,

        determineTunnelStatus,

        getTunnelTypeOptions,
        getDefaultTunnelModel,
    };
})();
