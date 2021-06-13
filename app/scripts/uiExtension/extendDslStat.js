import * as _ from 'lodash';
import {getAngularService, callOnPageLoad} from '../lib/ndmUtils';
import {DSL_STATS_FILENAME, UI_EXTENSIONS_KEY} from '../lib/constants';
import {sharedData} from '../lib/state';
import {getL10n} from '../lib/l10nUtils';

/*
 * This UI extension adds data on CRC & FEC errors to the DSL statistics
 */
const $q = getAngularService('$q');
const diagnosticsDsl = getAngularService('diagnosticsDsl');
const router = getAngularService('router');
const utils = getAngularService('utils');

// l10n keys for new props
const L10N_MAP = {
    'Uptime': 'uptime',
};

const ADDITIONAL_INFO_GROUPS = {
    UPTIME: 'Uptime',
    DSL_FAST_MODE: 'DSLFastMode',
    DSL_INTERLEAVED_MODE: 'DSLInterleavedMode',
};

const GROUPS_SORT_ORDER = {
    [ADDITIONAL_INFO_GROUPS.UPTIME]: 1,
    [ADDITIONAL_INFO_GROUPS.DSL_FAST_MODE]: 2,
    [ADDITIONAL_INFO_GROUPS.DSL_INTERLEAVED_MODE]: 3,
};

const originalGetData = _.get(diagnosticsDsl, 'getData');

/**
 * Requests `proc:/driver/ensoc_dsl/dsl_stats` file contents
 * if the 'UI extensions' toggle is enabled.
 *
 * @returns {Promise<string[]>}
 */
const getDslStatsFileLines = () => {
    if (sharedData.get(UI_EXTENSIONS_KEY) === false) {
        return $q.when([]);
    }

    const query = {more: {filename: DSL_STATS_FILENAME}};

    return router.postToRciRoot(query).then(response => {
        return _.get(response, 'more.message', []);
    });
}

// 'foo bar baz' -> 'fooBarBaz'
const spacesToCamelCase = str => {
    return str.replace(/\s+(\w)/g, (_, letter) => letter.toUpperCase());
};

const generateTrafficIconHtml = (direction = 'tx') => {
    return utils.generateIconHtml(direction + 'bytes-arrow');
};

const formatDslUptime = (uptime) => {
    const locale = utils.getCurrentLanguage();

    if (locale !== 'tr') {
        return uptime;
    }

    return uptime
        .replace('days', 'gün')
        .replace('day', 'gün');
};

const formatDslErrorCounters = (rxText, txText) => {
    return `${generateTrafficIconHtml('rx')}&nbsp;${rxText}&nbsp;&nbsp;
            ${generateTrafficIconHtml('tx')}&nbsp;${txText}`;
};

const getAdditionalDslPropsList = (dslStatsFileLines) => {
    const additionalLines = dslStatsFileLines.filter(line => {
        return ['Uptime', 'CRC', 'FEC', 'HEC'].some(item => line.startsWith(item));
    });

    return additionalLines.map((line) => {
            const [labelData, valueData] = line.split(/:\s+/);
            const lineLabel= labelData.replace(':', '');
            const propName = spacesToCamelCase(lineLabel);

            const label = L10N_MAP[lineLabel]
                ? (utils.getTranslation(L10N_MAP[lineLabel]) || lineLabel)
                : (getL10n(propName) || lineLabel);

            const values = valueData.trim().split(/\s+/g);
            const info = valueData.includes(':')
                ? formatDslUptime(valueData)
                : formatDslErrorCounters(...values);

            return {
                propName,
                label,
                info,
            };
        },
    );
}

const groupAdditionalDslProps = (additionalPropsList) => {
    return _.groupBy(
        additionalPropsList,
        prop => {
            const {propName} = prop;

            if (propName.toLowerCase().includes('uptime')) {
                return ADDITIONAL_INFO_GROUPS.UPTIME;
            }

            return propName.endsWith('Fast')
                ? ADDITIONAL_INFO_GROUPS.DSL_FAST_MODE
                : ADDITIONAL_INFO_GROUPS.DSL_INTERLEAVED_MODE;
        },
    );
};

const getGroupPropsObject = (groupItemsList) => {
    return groupItemsList.reduce(
        (propsAcc, prop) => {
            const {
                propName,
                label,
                info,
            } = prop;

            return {
                ...propsAcc,
                [propName]: {label, info},
            };
        },
        {},
    );
}

const getAdditionalDslStatProps = (dslStatsFileLines) => {
    const additionalPropsList = getAdditionalDslPropsList(dslStatsFileLines);

    const groups = groupAdditionalDslProps(additionalPropsList);
    const groupKeys = _.sortBy(Object.keys(groups), groupId => GROUPS_SORT_ORDER[groupId]);

    return groupKeys.reduce(
        (acc, groupId) => {
            const groupProps = getGroupPropsObject(groups[groupId]);

            let delimiterProps; // group header

            if (groupId === ADDITIONAL_INFO_GROUPS.UPTIME) {
                delimiterProps = {};
            } else {
                const labelL10n = getL10n(groupId);
                const label = `<h2 class="dsl-stat-delimiter">${labelL10n}</h2>`;

                delimiterProps = {
                    [`delimiterForGroup${groupId}`]: {label, info: ' '},
                };
            }

            return {
                ...acc,
                ...delimiterProps,
                ...groupProps,
            };
        },
        {},
    );
}

const extendDslStats = () => {
    callOnPageLoad(() => {
        diagnosticsDsl.getData = () => {
            return originalGetData()
                .then(response => {
                    return $q.all([
                        $q.when(response),
                        getDslStatsFileLines(),
                    ]);
                })
                .then(([response, statLines]) => {
                    const additionalIprops = getAdditionalDslStatProps(statLines);

                    response.iprops = {
                        ...response.iprops,
                        ...additionalIprops,
                    };

                    return response;
                });
        };
    });
}

const revertDslStatsChanges = () => {
    diagnosticsDsl.getData = originalGetData;
}

export const extendedDslStat = {
    onLoad: extendDslStats,
    onDestroy: revertDslStatsChanges,
};
