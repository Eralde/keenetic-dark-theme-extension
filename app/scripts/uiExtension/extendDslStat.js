import * as _ from 'lodash';
import {getAngularService} from '../lib/ndmUtils';
import {DSL_STATS_FILENAME} from '../lib/constants';

/*
 * This UI extension adds data on CRC & FEC errors to the DSL statistics
 */
const $rootScope = getAngularService('$rootScope');
const diagnosticsDsl = getAngularService('diagnosticsDsl');
const router = getAngularService('router');
const utils = getAngularService('utils');

const originalGetData = _.get(diagnosticsDsl, 'getData');

const getDslStatsFileLines = () => {
    const query = {more: {filename: DSL_STATS_FILENAME}};

    return router.postToRciRoot(query).then(response => {
        return _.get(response, 'more.message', []);
    });
}

const spacesToCamelCase = s => s.replace(/\s+(\w)/g, (_, letter) => letter.toUpperCase());

const generateTrafficIconHtml = (direction = 'tx') => {
    return utils.generateIconHtml(direction + 'bytes-arrow');
};

const formatAsDslStatValues = (rxText, txText) => {
    return `${generateTrafficIconHtml('tx')}&nbsp;${rxText}&nbsp;&nbsp;
            ${generateTrafficIconHtml('rx')}&nbsp;${txText}`;
};

const CONSTANT = getAngularService('CONSTANT');
const PAGE_LOADED = _.get(CONSTANT, 'events.PAGE_LOADED');

export const extendDslStats = () => {
    const unbinder = $rootScope.$on(PAGE_LOADED, () => {
        unbinder();

        diagnosticsDsl.getData = () => {
            return originalGetData().then(response => {
                return getDslStatsFileLines().then(statLines => {
                    const additionalLines = statLines.filter(line => {
                        return ['Uptime', 'CRC', 'FEC', 'HEC'].some(item => line.startsWith(item));
                    });

                    const additionalIprops = additionalLines.reduce(
                        (acc, line) => {
                            const [labelData, valueData] = line.split(/:\s+/);
                            const label = labelData.replace(':', '');
                            const values = valueData.trim().split(/\s+/g);
                            const info = values.length > 1
                                ? formatAsDslStatValues(...values)
                                : values[0];

                            const propName = spacesToCamelCase(label);

                            return {
                                ...acc,
                                [propName]: {
                                    label,
                                    info,
                                },
                            };
                        },
                        {},
                    );

                    response.iprops = {
                        ...response.iprops,
                        ...additionalIprops,
                    };

                    return response;
                });
            });
        };
    });
}

export const revertDslStatsChanges = () => {
    diagnosticsDsl.getData = originalGetData;
}
