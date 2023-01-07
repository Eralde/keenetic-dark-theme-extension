import * as _ from 'lodash';
import doh from '../../../3rdparty/doh.min';
import {getAngularService} from '../../lib/ndmUtils';
import {logWarning} from '../../lib/log';
import {IP_ROUTE, SHOW_INTERFACE, SHOW_RC_IP_ROUTE} from '../../lib/constants';

export const ROOT_ELEMENT_SELECTOR = '.routes-import-popup';

export const routesToolsService = (function() {
    const $q = getAngularService('$q');
    const utils = getAngularService('utils');
    const router = getAngularService('router');
    const ipV4Service = getAngularService('ipV4Service');
    const interfaces = getAngularService('interfaces');
    const routesService = getAngularService('routesService');

    let ROUTE_TYPE, DEFAULT_ROUTE;

    if (_.has(routesService, 'DEFAULT_ROUTE')) { // 3.x firmware
        ROUTE_TYPE = routesService.ROUTE_TYPE;
        DEFAULT_ROUTE = routesService.DEFAULT_ROUTE;
    } else { // 2.x firmware
        DEFAULT_ROUTE = 'default';
        ROUTE_TYPE = {
            DEFAULT_ROUTE: DEFAULT_ROUTE,
            TO_NETWORK: 'network',
            TO_HOST: 'host'
        };
    }

    const CORS_PROXY_URL = 'https://ts-cors-proxy.eralde.workers.dev';
    const CLOUDFLARE_DOH_URL = 'https://cloudflare-dns.com/dns-query';
    const DNS_RECORD = {
        A: 'A',
        CNAME: 'CNAME',
    };

    /**
     * @param {object} ndmRouteConfiguration
     * @returns {string} ROUTE_TYPE value
     */
    const getRouteType = (ndmRouteConfiguration) => {
        if (_.has(ndmRouteConfiguration, 'default')) {
            return ROUTE_TYPE.DEFAULT_ROUTE;
        } else if (_.has(ndmRouteConfiguration, 'network') && _.has(ndmRouteConfiguration, 'mask')) {
            return ROUTE_TYPE.TO_NETWORK;
        } else {
            return ROUTE_TYPE.TO_HOST;
        }
    };

    /**
     * @param {object} ndmRouteConfiguration
     * @param {string} routeType
     * @returns {string}
     */
    const getRouteDestination = (ndmRouteConfiguration, routeType) => {
        if (routeType === ROUTE_TYPE.DEFAULT_ROUTE) {
            return DEFAULT_ROUTE;
        } else if (routeType === ROUTE_TYPE.TO_NETWORK) {
            return `${ndmRouteConfiguration.network}/${ipV4Service.maskToCidr(ndmRouteConfiguration.mask)}`;
        } else {
            return ndmRouteConfiguration.host;
        }
    };

    const normalizeRouteData = ({route, showInterfaceData, interfaceIdToLabelMap}) => {
        const auto = _.get(route, 'auto', false);
        const type = getRouteType(route);

        const routeData = {
            configuration: {...route},
            auto,
            type,
        };

        if (!route['interface']) {
            return routeData;
        }

        const routeInterface = route['interface'];
        const showInterfaceItem = _.find(
            showInterfaceData,
            item => item.id === routeInterface || item['interface-name'] === routeInterface,
        );

        if (!showInterfaceItem) {
            logWarning('Failed to determine interface id for route', {...route});

            return routeData;
        }

        const interfaceId = _.get(showInterfaceItem, 'id', '');
        const interfaceLabel = interfaceIdToLabelMap[interfaceId] || interfaceId;

        return {
            ...routeData,
            interfaceId,
            interfaceLabel,
        };
    };

    /**
     * @returns {Promise<{showRcIpRoute: object[], showInterfaceData: object}>}
     */
    const getRoutesAndInterfaces = () => {
        const queries = utils.toRciQueryList([
            SHOW_RC_IP_ROUTE,
            SHOW_INTERFACE,
        ]);

        return router.postToRciRoot(queries).then(responses => {
            const showRcIpRoute = _
                .chain(responses)
                .get(`[0].${SHOW_RC_IP_ROUTE}`, {})
                .toArray()
                .value();

            const showInterfaceData = _.get(responses, `[1].${SHOW_INTERFACE}`, {});

            return {showRcIpRoute, showInterfaceData};
        });
    };

    /**
     * @param {object} showInterfaceData
     * @returns {Array<{id: string, label: string, ...args: any}>}
     */
    const getSuitableInterfaceOptions = (showInterfaceData) => {
        return interfaces.getInterfaceOptions(showInterfaceData)
            .filter(option => !_.isUndefined(option.global));
    };

    const stripNdwData = (ndwTableRow) => {
        const propsToRemove = [
            '$$hashKey',
            'destination',
            'interfaceForTable',
            'isSelected',
            'onCheckboxToggle',
            'type',
        ];

        const additionalProps = !ndwTableRow.auto
            ? ['auto']
            : [];

        return _.omit(ndwTableRow, [...propsToRemove, ...additionalProps]);
    };

    const wrapAsIpRouteRequest = (object) => _.set({}, IP_ROUTE, object);

    const saveRoutes = (routes) => {
        const queries = routes.map(wrapAsIpRouteRequest);

        return router.postAndSave(queries);
    };

    const deleteRoutes = (routes) => {
        const queries = routes
            .map(route => {
                return {
                    ...route,
                    no: true,
                    name: route.interface || '',
                };
            })
            .map(wrapAsIpRouteRequest);

        return router.postAndSave(queries);
    };

    /**
     * @private
     * @param {object} response
     * @param {string} type
     * @returns {string[]}
     */
    const extractDnsRecordsByType = (response, type) => {
        const answers = _.get(response, 'answers', []);

        return _
            .chain(answers)
            .filter(item => item.type === type)
            .map('data')
            .filter()
            .value();
    };

    /**
     * @private
     * @param {string} domain
     * @returns {Promise<{ips: string[], aliases: string[]}>}
     */
    const makeATypeDohQuery = (domain) => {
        const query = doh.makeQuery(domain, DNS_RECORD.A);
        const url = `${CORS_PROXY_URL}/${CLOUDFLARE_DOH_URL}`;
        const method = 'POST';

        return doh.sendDohMsg(query, url, method).then(response => {
            const ips = extractDnsRecordsByType(response, DNS_RECORD.A);
            const aliases = extractDnsRecordsByType(response, DNS_RECORD.CNAME);

            return {
                ips,
                aliases,
            };
        });
    };

    /**
     * @param {string} domain
     * @param {number} [timeout = 20000]
     * @returns {Promise<string[]>}
     */
    const getIpListForDomain = (domain, timeout = 20000) => {
        const deferred = $q.defer();
        const _timeout = _.clamp(timeout, 5000, 60000);

        setTimeout(
            () => deferred.reject({error: 'Timeout'}),
            _timeout,
        );

        const processTask = (domainList) => {
            const ipList = [];
            const queries = domainList.map(makeATypeDohQuery);

            return Promise.all(queries).then((resultList) => {
                const ips = _.flatMap(resultList, 'ips');
                const aliases = _.flatMap(resultList, 'aliases');

                ipList.push(...ips);

                if (aliases.length === 0) {
                    return ipList;
                }

                return processTask(aliases).then(_ipList => [...ipList, ..._ipList]);
            });
        };

        processTask([domain]).then(ipList => {
            deferred.resolve(_.uniq(ipList));
        });

        return deferred.promise;
    };

    /**
     * '00001101111000001100001101011010' -> '13.224.195.90'
     *
     * @param {string} str
     * @returns {string}
     */
    const binary2Ip = (str) => {
        const groups = str.match(/.{8}/g);

        return _.map(groups, octet => parseInt(octet, 2)).join('.');
    };

    /**
     * 24 -> 11111111111111111111111100000000
     * 8  -> 11111111000000000000000000000000
     *
     * @param {number} onesLength
     * @returns {string}
     */
    const getMaskBinary = (onesLength) => {
        return _.times(32, (index) => index < onesLength ? '1' : '0').join('');
    };

    /**
     * '13.224.195.90' -> '00001101111000001100001101011010'
     *
     * @param {string} ipStr
     * @returns {string}
     */
    const ip2Binary = ipStr => {
        const octets = ipStr.split('.');
        const prefix = '00000000';

        return octets
            .map(octet => {
                return (prefix + parseInt(octet, 10).toString(2)).slice(-8);
            })
            .join('');
    };

    /**
     * @param {string} a
     * @param {string} b
     * @returns {string}
     */
    const longestCommonPrefix = (a, b) => {
        const minLen = Math.min(a.length, b.length);

        let prefix = '';

        for (let i = 0; i < minLen; ++i) {
            if (a[i] !== b[i]) {
                return prefix;
            }

            prefix += a[i];
        }

        return prefix;
    };

    const processSingleIpGroup = (binaryIpList) => {
        const ip = binary2Ip(binaryIpList[0]);
        const maskLen = 32;

        return {
            length: 1,
            base: ip,
            mask: binary2Ip(getMaskBinary(maskLen)),
            ipList: [ip],
            subnet: `${ip}/${maskLen}`,
        };
    };

    const processMultipleIpGroup = (binaryIpList) => {
        const sorted = binaryIpList.sort();
        const pair = [_.first(sorted), _.last(sorted)];

        const lcp = longestCommonPrefix(...pair);
        const mask = binary2Ip(getMaskBinary(lcp.length));

        const ipNum = ipV4Service.ip2num(binary2Ip(binaryIpList[0]));
        const maskNum = ipV4Service.ip2num(mask);

        const baseAddressNum = ipNum & maskNum;
        const subnet = `${ipV4Service.num2ip(baseAddressNum)}/${ipV4Service.maskToCidr(mask)}`;

        return {
            length: binaryIpList.length,
            network: ipV4Service.num2ip(baseAddressNum),
            mask,
            ipList: binaryIpList.map(binary2Ip),
            subnet,
        };
    }

    const splitIntoSubnets = (ipStrList, minCommonBits = 24) => {
        const binaryList = ipStrList.map(ip2Binary).sort();

        const result = binaryList.reduce(
            (acc, item, index) => {
                if (index === 0) {
                    return {
                        groups: [],
                        current: [item],
                        last: item,
                    };
                }

                const lcp = longestCommonPrefix(acc.last, item);

                if (lcp.length < minCommonBits) {
                    return {
                        groups: [...acc.groups, acc.current],
                        current: [item],
                        last: item,
                    };
                } else {
                    return {
                        groups: acc.groups,
                        current: [...acc.current, item],
                        last: item,
                    };
                }
            },
            {
                groups: [],
                current: [],
                last: '',
            },
        );

        const groups = [...result.groups, result.current];

        return groups.map(group => {
            if (group.length === 1) {
                return processSingleIpGroup(group);
            }

            return processMultipleIpGroup(group);
        });
    };

    return {
        getRouteType,
        getRouteDestination,

        getRoutesAndInterfaces,
        getSuitableInterfaceOptions,

        stripNdwData,
        normalizeRouteData,

        saveRoutes,
        deleteRoutes,

        getIpListForDomain,

        splitIntoSubnets,
    };
})();
