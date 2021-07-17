import {getAngularService, isComponentInstalled} from '../../lib/ndmUtils';
import * as _ from 'lodash';
import {SHOW_INTERFACE, SHOW_RC_INTERFACE, SHOW_SCHEDULE, SHOW_INTERFACE_STAT} from '../../lib/constants';
import {getL10n} from '../../lib/l10nUtils';

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

    const NO = {no: true};
    const NO_GLOBAL_VALUE = -1;

    const INTERFACE_CMD = 'interface';

    const IP_ADDRESS_PROP = 'ip.address';
    const IP_ADDRESS_ADDRESS_PROP = 'ip.address.address';
    const IP_ADDRESS_MASK_PROP = 'ip.address.mask';
    const IP_GLOBAL = 'ip.global';
    const IP_GLOBAL_ORDER = 'ip.global.order';

    const TUNNEL_EOIP_ID_PROP = 'tunnel.eoip.id';
    const TUNNEL_DESTINATION_PROP = 'tunnel.destination';
    const TUNNEL_SOURCE_ADDRESS_PROP = 'tunnel.source.address';
    const TUNNEL_SOURCE_INTERFACE_PROP = 'tunnel.source.interface';
    const TUNNEL_SOURCE_PROP = 'tunnel.source';

    const IPSEC_PRESHARED_KEY_PROP = 'ipsec.preshared-key';
    const IPSEC_IKEV2_PROP = 'ipsec.ikev2';
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

    const TYPE_L10N_ID = {
        [TUNNEL_TYPE.IPIP]: getL10n('otherConnections_pointToPoint_editor_field_type_option_ipip'),
        [TUNNEL_TYPE.GRE]: getL10n('otherConnections_pointToPoint_editor_field_type_option_gre'),
        [TUNNEL_TYPE.EOIP]: getL10n('otherConnections_pointToPoint_editor_field_type_option_eoip'),
    };

    const COMPONENT_DEPENDENCIES = {
        [TUNNEL_TYPE.IPIP]: 'ipip',
        [TUNNEL_TYPE.GRE]: 'gre',
        [TUNNEL_TYPE.EOIP]: 'eoip',
    };

    const LOCAL_SOURCE = {
        AUTO: 'auto',
        MANUAL: 'manual',
    };

    const IS_IPSEC_AVAILABLE = _.has(components, 'ipsec');
    const IPSEC_SUFFIX = '/IPsec';

    const EVENTS = {
        OPEN_EDITOR: 'POINT_TO_POINT_OPEN_EDITOR',
    };

    const isPointToPoint = ({type}) => TUNNEL_TYPES_LIST.includes(type);
    const isPort = ({type}) => type === 'Port';

    const getSuitableInterfaceOptions = (showInterfaceData) => {
        return interfaces.getInterfaceOptions(showInterfaceData)
            .filter(item => !isPointToPoint(item))
            .filter(item => !isPort(item));
    };

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

    /**
     * @param {string} type
     * @returns {Promise<string>}
     */
    const getNextFreeId = (type) => {
        const query = _.set({}, SHOW_INTERFACE, {});

        return router.postToRciRoot(query).then(response => {
            const showInterface = _.get(response, SHOW_INTERFACE, {});
            const existingIndexes = _.filter(showInterface, item => item.type === type)
                .map(item => Number(item.id.replace(type, '')));

            const unusedIndex = utils.firstUnusedId(existingIndexes);

            return `${type}${unusedIndex}`;
        });
    };

    const getTunnelTypeOptions = () => {
        return _
            .chain(TUNNEL_TYPE)
            .pickBy(type => isComponentInstalled(COMPONENT_DEPENDENCIES[type]))
            .map(item => {
                return {
                    id: item,
                    label: TYPE_L10N_ID[item],
                };
            })
            .value();
    };

    const isIpsecEnabled = (interfaceConfiguration) => {
        return _.has(interfaceConfiguration, 'ipsec');
    };

    const isServer = (interfaceConfiguration) => {
        const sourceAddress = _.get(interfaceConfiguration, TUNNEL_SOURCE_ADDRESS_PROP, '');
        const sourceInterface = _.get(interfaceConfiguration, TUNNEL_SOURCE_INTERFACE_PROP, '');

        return isIpsecEnabled(interfaceConfiguration) && Boolean(sourceAddress || sourceInterface);
    };

    const getTunnelSourceData = (interfaceConfiguration, interfaceOptionsList) => {
        let source;
        let sourceIp = '';

        const sourceInterface = _.get(interfaceConfiguration, TUNNEL_SOURCE_INTERFACE_PROP, '');
        const sourceAddress = _.get(interfaceConfiguration, TUNNEL_SOURCE_ADDRESS_PROP, '');

        if (sourceInterface) {
            const tunnelSourceOption = _.find(
                interfaceOptionsList,
                option => option.id === sourceInterface || option.name === sourceInterface
            );

            source = _.get(tunnelSourceOption, 'id', LOCAL_SOURCE.AUTO);
        } else if (sourceAddress) {
            source = LOCAL_SOURCE.MANUAL;
            sourceIp = sourceAddress;
        } else {
            source = LOCAL_SOURCE.AUTO;
        }

        return {
            source,
            sourceIp,
        };
    };

    const getNewTunnelModel = () => {
        const defaultType = _.get(getTunnelTypeOptions(), '[0].id');

        return {
            isNew: true,
            id: '',
            type: defaultType,
            description: '',

            isGlobal: false,
            savedIpGlobalOrder: NO_GLOBAL_VALUE,

            address: '',
            mask: DEFAULT_NETMASK,

            eoipId: '',

            destination: '',
            source: LOCAL_SOURCE.AUTO,
            sourceIp: '',

            ipsec: {
                wasEnabled: false,
                isEnabled: false,
                psk: '',
                ikev2Enabled: false,
                isServer: false,
            },
        };
    };

    const getTunnelModel = ({
        interfaceConfiguration,
        showInterfaceItem,
        interfaceOptionsList,
    }) => {
        const {id, type} = showInterfaceItem;
        const description = showInterfaceItem.description || id;

        const isGlobal = _.has(interfaceConfiguration, IP_GLOBAL);
        const ipGlobalOrder = _.get(interfaceConfiguration, IP_GLOBAL_ORDER, -1);

        const address = _.get(interfaceConfiguration, IP_ADDRESS_ADDRESS_PROP, '');
        const mask = _.get(interfaceConfiguration, IP_ADDRESS_MASK_PROP, DEFAULT_NETMASK);

        const eoipId = _.get(interfaceConfiguration, TUNNEL_EOIP_ID_PROP, '');
        const destination = _.get(interfaceConfiguration, TUNNEL_DESTINATION_PROP, '');

        // IPsec
        const ipsecIsEnabled = isIpsecEnabled(interfaceConfiguration);
        const psk = _.get(interfaceConfiguration, IPSEC_PRESHARED_KEY_KEY_PROP, '');
        const ikev2Enabled = _.get(interfaceConfiguration, IPSEC_IKEV2_PROP, false);

        const {source, sourceIp} = getTunnelSourceData(interfaceConfiguration, interfaceOptionsList);

        return {
            isNew: false,
            id,
            type,
            description,

            isGlobal,
            savedIpGlobalOrder: ipGlobalOrder,

            address,
            mask,
            eoipId,

            destination,
            source,
            sourceIp,

            ipsec: {
                wasEnabled: ipsecIsEnabled,
                isEnabled: ipsecIsEnabled,
                psk,
                ikev2Enabled,
                isServer: ipsecIsEnabled && source !== LOCAL_SOURCE.AUTO,
            },
        };
    };

    /**
     * @param {string} interfaceId
     * @param {Object} model
     * @param {boolean} forceOverwrite
     * @returns {Object}
     */
    const getIpGlobalQuery = (interfaceId, model, forceOverwrite) => {
        const {isGlobal, savedIpGlobalOrder} = model;
        const isGlobalSaved = savedIpGlobalOrder !== NO_GLOBAL_VALUE;

        if (!forceOverwrite && isGlobal === isGlobalSaved) {
            return {};
        }

        let ipGlobalValue;

        if (!isGlobal) {
            ipGlobalValue = NO; // clear 'ip global'
        } else if (savedIpGlobalOrder === NO_GLOBAL_VALUE) {
            ipGlobalValue = {auto: true}; // set minimal priority
        } else {
            ipGlobalValue = {order: savedIpGlobalOrder}; // preserve order
        }

        return _.set({}, `${INTERFACE_CMD}.${interfaceId}.${IP_GLOBAL}`, ipGlobalValue);
    };

    const getTunnelSourceQuery = (interfaceId, model) => {
        const prefix = `${INTERFACE_CMD}.${interfaceId}`;
        const {source, sourceIp} = model;

        if (source === LOCAL_SOURCE.AUTO) {
            return _.set(
                {},
                `${prefix}.${TUNNEL_SOURCE_PROP}`,
                NO
            );
        } else if (source === LOCAL_SOURCE.MANUAL) {
            return _.set(
                {},
                `${prefix}.${TUNNEL_SOURCE_ADDRESS_PROP}`,
                sourceIp,
            );
        } else {
            return _.set(
                {},
                `${prefix}.${TUNNEL_SOURCE_INTERFACE_PROP}`,
                source,
            );
        }
    };

    const getTunnelDestinationQuery = (id, model) => {
        const path = `${INTERFACE_CMD}.${id}.${TUNNEL_DESTINATION_PROP}`;

        if (!model.ipsec.isEnabled) {
            return _.set({}, path, model.destination);
        }

        const value = model.ipsec.isServer
            ? NO
            : model.destination;

        return _.set({}, path, value);
    };

    const getTunnelEoipIdQuery = (id, model) => {
        return model.type === TUNNEL_TYPE.EOIP
            ? _.set({}, `${INTERFACE_CMD}.${id}.${TUNNEL_EOIP_ID_PROP}`, model.eoipId)
            : {};
    };

    const getIpAddressQuery = (id, model) => {
        return _.set(
            {},
            `${INTERFACE_CMD}.${id}.${IP_ADDRESS_PROP}`,
            _.pick(model, ['address', 'mask']),
        );
    };

    const getIpsecQueries = (id, model) => {
        if (!IS_IPSEC_AVAILABLE) {
            return [];
        }

        const prefix = `${INTERFACE_CMD}.${id}`;

        const ipsecPresharedKeyQuery = model.ipsec.isEnabled
            ? _.set({}, `${prefix}.${IPSEC_PRESHARED_KEY_PROP}`, {key: model.ipsec.psk})
            : _.set({}, `${prefix}.${IPSEC_PRESHARED_KEY_PROP}`, NO);

        const ipsecIkev2Query = _.set({}, `${prefix}.${IPSEC_IKEV2_PROP}`, model.ipsec.isEnabled);

        return [
            ipsecPresharedKeyQuery,
            ipsecIkev2Query,
        ];
    };

    const getDeleteTunnelQuery = (id) => _.set({}, [INTERFACE_CMD, id], NO);

    const saveTunnel = (model) => {
        const id$ = model.isNew
            ? getNextFreeId(model.type)
            : $q.when(model.id);

        return id$.then(id => {
            const {isEnabled, wasEnabled} = model.ipsec;
            const tunnelWillBeRecreated = IS_IPSEC_AVAILABLE
                && !model.isNew
                && wasEnabled
                && !isEnabled;

            // It is not possible to remove 'ipsec' section completely
            // from an existing interface configuration,
            // so we delete the interface & then rewrite it with the new configuration
            const clearTunnelQuery = tunnelWillBeRecreated
                ? getDeleteTunnelQuery(id)
                : {};

            const queries = [
                clearTunnelQuery,
                getInterfaceDescriptionQuery(id, model.description),
                getIpGlobalQuery(id, model, tunnelWillBeRecreated),
                getInterfaceSecurityLevelQuery(id, SECURITY_LEVEL.PRIVATE),
                getIpAddressQuery(id, model),
                getTunnelEoipIdQuery(id, model),
                getTunnelSourceQuery(id, model),
                getTunnelDestinationQuery(id, model),
                ...getIpsecQueries(id, model),
            ];

            const nonEmptyQueries = queries.filter(item => !_.isEmpty(item));

            return router.postAndSave(nonEmptyQueries);
        });
    };

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

    const getTunnelsList = ({showInterface, showRcInterface, showSchedule, interfaceOptions}) => {
        const matchingShowInterfaceObjects = _.pickBy(showInterface, isPointToPoint);

        return _.map(
            matchingShowInterfaceObjects,
            (showInterfaceItem) => {
                const {id, uptime, type} = showInterfaceItem;
                const description = showInterfaceItem.description || id;
                const interfaceConfiguration = _.get(showRcInterface, [id], {});

                const savedScheduleId = _.get(interfaceConfiguration, 'schedule', '');
                const scheduleStatus = _.get(showSchedule, savedScheduleId, {});

                const status = determineTunnelStatus(showInterfaceItem, scheduleStatus);
                const isIpsecEnabled = _.has(interfaceConfiguration, 'ipsec');

                const {source} = getTunnelSourceData(interfaceConfiguration, interfaceOptions);
                const isServer = isIpsecEnabled && source !== LOCAL_SOURCE.AUTO;
                const destination = isServer
                    ? getL10n('otherConnections_pointToPoint_table_any')
                    : _.get(showInterfaceItem, 'tunnel-remote-destination', '');

                const sourceToView = _.get(showInterfaceItem, 'tunnel-local-source', '');

                return {
                    id: id,
                    type,
                    isIpsecEnabled,
                    isEnabled: Boolean(interfaceConfiguration.up),
                    status,
                    description,
                    source: sourceToView,
                    destination,
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

    const registerPollRequest = (requester, callback) => {
        return requester.registerCallback(
            [
                SHOW_INTERFACE,
                SHOW_RC_INTERFACE,
                SHOW_SCHEDULE,
            ],
            (data) => {
                const showInterfacesData = _.get(data, `[0].${SHOW_INTERFACE}`, {});
                const showRcInterfaceData = _.get(data, `[1].${SHOW_RC_INTERFACE}`, {});
                const showScheduleData = _.get(data, `[2].${SHOW_SCHEDULE}`, {});

                const usedSubnets = _.uniqBy(
                    [
                        ...interfaces.getCurrentlyUsedSubnets(showInterfacesData),
                        ...interfaces.getStaticSubnets(showRcInterfaceData, false),
                    ],
                    (subnet) => `${subnet.ifaceId}${subnet.ip}`,
                );

                const interfaceIdToLabelMap = interfaces.getInterfaceIdToLabelMap(showInterfacesData);
                const interfaceOptions = getSuitableInterfaceOptions(showInterfacesData);

                const tableData = getTunnelsList({
                    showInterface: showInterfacesData,
                    showRcInterface: showRcInterfaceData,
                    showSchedule: showScheduleData,
                    interfaceOptions,
                });

                callback({
                    tableData,
                    interfaceOptions,
                    usedSubnets,
                    interfaceIdToLabelMap,
                    showSchedule: showScheduleData,
                });
            },
        );
    };

    return {
        EVENTS,
        TUNNEL_TYPE,
        IS_IPSEC_AVAILABLE,
        LOCAL_SOURCE,
        IPSEC_SUFFIX,
        TYPE_L10N_ID,

        getInterfaceOptionsList,

        getTunnelsList,

        toggleTunnelState,
        deleteTunnel,
        saveTunnel,

        getInterfaceStatByIdData,

        determineTunnelStatus,

        getTunnelTypeOptions,

        getNewTunnelModel,
        getTunnelModel,

        registerPollRequest,
    };
})();
