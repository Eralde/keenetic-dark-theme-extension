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

    const ANY_DESTINATION_L10N = 'otherConnections_pointToPoint_table_any';

    const IS_IPSEC_AVAILABLE = _.has(components, 'ipsec');
    const IPSEC_SUFFIX = '/IPsec';

    const NO = {no: true};
    const NO_GLOBAL_VALUE = -1;

    const INTERFACE = 'interface';

    const UP = 'up';
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

    const IPSEC_IKEV2 = 'ipsec.ikev2';
    const IPSEC_IKEV2_ENABLE = 'ipsec.ikev2.enable';
    const IPSEC_PRESHARED_KEY = 'ipsec.preshared-key';
    const IPSEC_PRESHARED_KEY_KEY = 'ipsec.preshared-key.key';
    const IPSEC_FORCE_ENCAPS = 'ipsec.force-encaps';
    const IPSEC_FORCE_ENCAPS_ENABLE = 'ipsec.force-encaps.enable';

    const SHOW_RC_IP_ROUTE = 'show.rc.ip.route';
    const IP_ROUTE = 'ip.route';

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

    const EVENTS = {
        OPEN_EDITOR: 'POINT_TO_POINT_OPEN_EDITOR',
    };

    const isPointToPoint = ({type}) => TUNNEL_TYPES_LIST.includes(type);
    const isPort = ({type}) => type === 'Port';

    const hasIpsecPsk = (interfaceConfiguration) => {
        return _.has(interfaceConfiguration, IPSEC_PRESHARED_KEY);
    };

    const isIpsecEnabled = (interfaceStatus) => {
        return _.get(interfaceStatus, 'ipsec-enabled', false);
    };

    const isServer = (interfaceConfiguration) => {
        const sourceAddress = _.get(interfaceConfiguration, TUNNEL_SOURCE_ADDRESS_PROP, '');
        const sourceInterface = _.get(interfaceConfiguration, TUNNEL_SOURCE_INTERFACE_PROP, '');
        const destination = _.get(interfaceConfiguration, TUNNEL_DESTINATION_PROP, '');

        return hasIpsecPsk(interfaceConfiguration)
            && Boolean(sourceAddress || sourceInterface)
            && !destination;
    };

    const getSuitableInterfaceOptions = (showInterfaceData) => {
        return interfaces.getInterfaceOptions(showInterfaceData)
            .filter(item => !isPointToPoint(item))
            .filter(item => !isPort(item));
    };

    const getInterfaceDescriptionQuery = (interfaceId, description) => {
        return _.set({}, [INTERFACE, interfaceId], {description});
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

    /**
     * @param {string} type
     * @param {object} showInterfaceData
     * @returns {string}
     */
    const getNextFreeId = (type, showInterfaceData) => {
        const existingIndexes = _.filter(showInterfaceData, item => item.type === type)
            .map(item => Number(item.id.replace(type, '')));

        const unusedIndex = utils.firstUnusedId(existingIndexes);

        return `${type}${unusedIndex}`;
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
            isEnabled: false,
            id: '',
            rename: '',
            interfaceId: '',
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
                isEnabled: false,
                forceEncaps: false,
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
        const rename = showInterfaceItem['interface-name'] || id;
        const description = showInterfaceItem.description || id;

        const isGlobal = _.has(interfaceConfiguration, IP_GLOBAL);
        const ipGlobalOrder = _.get(interfaceConfiguration, IP_GLOBAL_ORDER, -1);

        const address = _.get(interfaceConfiguration, IP_ADDRESS_ADDRESS_PROP, '');
        const mask = _.get(interfaceConfiguration, IP_ADDRESS_MASK_PROP, DEFAULT_NETMASK);

        const eoipId = _.get(interfaceConfiguration, TUNNEL_EOIP_ID_PROP, '');

        const isInServerMode = isServer(interfaceConfiguration);
        const destination = isInServerMode
            ? ''
            : _.get(interfaceConfiguration, TUNNEL_DESTINATION_PROP, '');

        // IPsec
        const ipsecIsEnabled = hasIpsecPsk(interfaceConfiguration);
        const psk = _.get(interfaceConfiguration, IPSEC_PRESHARED_KEY_KEY, '');
        const ikev2Enabled = _.get(interfaceConfiguration, IPSEC_IKEV2_ENABLE, false);
        const forceEncaps = _.get(interfaceConfiguration, IPSEC_FORCE_ENCAPS_ENABLE, false);

        const {source, sourceIp} = getTunnelSourceData(interfaceConfiguration, interfaceOptionsList);

        return {
            isNew: false,
            isEnabled: Boolean(interfaceConfiguration[UP]),
            id,
            rename,
            interfaceId: id.replace(type, ''),
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
                isEnabled: ipsecIsEnabled,
                forceEncaps,
                psk,
                ikev2Enabled,
                isServer: isInServerMode,
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
        if (model.type === TUNNEL_TYPE.EOIP) {
            return {};
        }

        const {isGlobal, savedIpGlobalOrder} = model;
        const wasGlobal = savedIpGlobalOrder !== NO_GLOBAL_VALUE;

        if (!forceOverwrite && isGlobal === wasGlobal) {
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

        return _.set({}, `${INTERFACE}.${interfaceId}.${IP_GLOBAL}`, ipGlobalValue);
    };

    const getTunnelSourceQuery = (interfaceId, model) => {
        const prefix = `${INTERFACE}.${interfaceId}`;
        const {source, sourceIp} = model;

        if (source === LOCAL_SOURCE.AUTO) {
            return _.set(
                {},
                `${prefix}.${TUNNEL_SOURCE_PROP}`,
                NO,
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
        const path = `${INTERFACE}.${id}.${TUNNEL_DESTINATION_PROP}`;

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
            ? _.set({}, `${INTERFACE}.${id}.${TUNNEL_EOIP_ID_PROP}`, model.eoipId)
            : {};
    };

    const getIpAddressQuery = (id, model) => {
        return _.set(
            {},
            `${INTERFACE}.${id}.${IP_ADDRESS_PROP}`,
            _.pick(model, ['address', 'mask']),
        );
    };

    const getUpQuery = (id, model) => {
        return _.set(
            {},
            `${INTERFACE}.${id}.${UP}`,
            model.isEnabled,
        );
    };

    const getIpsecQueries = (id, model) => {
        if (!IS_IPSEC_AVAILABLE) {
            return [];
        }

        const prefix = `${INTERFACE}.${id}`;

        const pskValue = model.ipsec.isEnabled ? {key: model.ipsec.psk} : NO;
        const ipsecPresharedKeyQuery = _.set({}, `${prefix}.${IPSEC_PRESHARED_KEY}`, pskValue);

        const ikev2Value = model.ipsec.ikev2Enabled ? {enable: true} : NO;
        const ipsecIkev2Query = _.set({}, `${prefix}.${IPSEC_IKEV2}`, ikev2Value);

        const forceEncapsValue = model.ipsec.forceEncaps ? {enable: true} : NO;
        const ipsecForceEncapsQuery = _.set({}, `${prefix}.${IPSEC_FORCE_ENCAPS}`, forceEncapsValue);

        return [
            ipsecPresharedKeyQuery,
            ipsecIkev2Query,
            ipsecForceEncapsQuery,
        ];
    };

    const getDefaultRouteQuery = (id, model, routeExists) => {
        if (model.type === TUNNEL_TYPE.EOIP) {
            return {};
        }

        if (!model.isGlobal && !routeExists) {
            return {};
        }

        const data = {
            'default': true,
            'interface': id,
            no: !model.isGlobal,
        };

        return _.set({}, IP_ROUTE, data);
    };

    const getDeleteTunnelQuery = (id) => _.set({}, [INTERFACE, id], NO);

    const queryConfigurationOnSave = (model) => {
        const queries = utils.toRciQueryList([
            SHOW_RC_IP_ROUTE,
            model.isNew ? SHOW_INTERFACE : {},
        ]);

        return router.postToRciRoot(queries).then(responses => {
            const showRcIpRoute = _.toArray(_.get(responses, `[0].${SHOW_RC_IP_ROUTE}`, {}));
            const showInterface = _.get(responses, `[1].${SHOW_INTERFACE}`, {});

            const id = model.isNew
                ? getNextFreeId(model.type, showInterface)
                : model.id;

            const routeExists = _.some(
                showRcIpRoute,
                item => {
                    return item.default && [model.id, model.rename].includes(item.interface);
                },
            );

            return {
                id,
                routeExists,
            };
        });
    };

    const saveTunnel = (model) => {
        return queryConfigurationOnSave(model).then(({id, routeExists}) => {
            const updatedId = model.isNew && isNaN(Number(model.interfaceId))
                ? id
                : `${model.type}${Number(model.interfaceId)}`;

            const tunnelWillBeRecreated = !model.isNew;

            const clearTunnelQuery = tunnelWillBeRecreated
                ? getDeleteTunnelQuery(id)
                : {};

            const ipGlobalQuery = getIpGlobalQuery(updatedId, model, tunnelWillBeRecreated);
            const defaultRouteQuery = getDefaultRouteQuery(updatedId, model, routeExists);

            const queries = [
                clearTunnelQuery,
                getInterfaceDescriptionQuery(updatedId, model.description),
                ipGlobalQuery,
                getUpQuery(updatedId, model),
                getIpAddressQuery(updatedId, model),
                getTunnelEoipIdQuery(updatedId, model),
                getTunnelSourceQuery(updatedId, model),
                getTunnelDestinationQuery(updatedId, model),
                ...getIpsecQueries(updatedId, model),
                defaultRouteQuery,
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
                const destination = isServer(interfaceConfiguration)
                    ? getL10n(ANY_DESTINATION_L10N)
                    : _.get(showInterfaceItem, 'tunnel-remote-destination', '');

                const sourceToView = _.get(showInterfaceItem, 'tunnel-local-source', '');

                return {
                    id: id,
                    type,
                    isIpsecEnabled: isIpsecEnabled(showInterfaceItem),
                    isEnabled: Boolean(interfaceConfiguration[UP]),
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
        const query = _.set({}, [INTERFACE, tunnelId], NO);

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
