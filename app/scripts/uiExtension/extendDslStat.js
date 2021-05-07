import * as _ from 'lodash';
import {getAngularService, callOnPageLoad} from '../lib/ndmUtils';
import {DSL_STATS_FILENAME, UI_EXTENSIONS_KEY} from '../lib/constants';
import {sharedData} from "../lib/state";

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

const formatDslErrorCounters = (rxText, txText) => {
    return `${generateTrafficIconHtml('tx')}&nbsp;${rxText}&nbsp;&nbsp;
            ${generateTrafficIconHtml('rx')}&nbsp;${txText}`;
};

const getAdditionalDslStatProps = (dslStatsFileLines) => {
    const additionalLines = dslStatsFileLines.filter(line => {
        return ['Uptime', 'CRC', 'FEC', 'HEC'].some(item => line.startsWith(item));
    });

    return additionalLines.reduce(
        (acc, line) => {
            const [labelData, valueData] = line.split(/:\s+/);
            const lineLabel= labelData.replace(':', '');
            const label = L10N_MAP[lineLabel]
                ? (utils.getTranslation(L10N_MAP[lineLabel]) || lineLabel)
                : lineLabel;

            const values = valueData.trim().split(/\s+/g);
            const info = values.length > 1
                ? formatDslErrorCounters(...values)
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
}

export const extendDslStats = () => {
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

export const revertDslStatsChanges = () => {
    diagnosticsDsl.getData = originalGetData;
}
