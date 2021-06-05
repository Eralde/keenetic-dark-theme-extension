import * as _ from 'lodash';

import {
    getAngularService,
    getNdmPageController,
    getElementController,
    extendSwitchportsListWithStatData,
} from '../lib/ndmUtils';
import {formatPortDuplex, formatPortLinkSpeed} from '../lib/formatUtils';
import {SHOW_INTERFACE_STAT_PROPS, UI_EXTENSIONS_KEY} from '../lib/constants';
import {sharedData} from '../lib/state';

const switchportsService = getAngularService('switchportsService');
const utils = getAngularService('utils');

const originalGetSwitchportsList = utils.getSwitchportsList;

const SHOW_INTERFACE = 'show.interface';
const SHOW_RC_INTERFACE = 'show.rc.interface';
const SHOW_INTERFACE_STAT = 'show.interface.stat';

const originalProcessConfiguration = switchportsService.processConfiguration;

switchportsService.processConfiguration = (responses) => {
    const showInterfaceData = _.get(responses, `[0].${SHOW_INTERFACE}`, {});
    const showRcInterfaceData = _.get(responses, `[1].${SHOW_RC_INTERFACE}`, {});
    const retVal = originalProcessConfiguration(responses);
    const groupedSwitchportsList = _.get(retVal, 'groupedSwitchportsList', []);

    retVal.groupedSwitchportsList = groupedSwitchportsList.map(item => {
        const {interfaceId, port} = item;
        const interfaceConfiguration = _.get(showRcInterfaceData, interfaceId)
            || _.find(showRcInterfaceData, item => item.rename === port);

        const interfaceStatus = _.find(
            showInterfaceData,
            item => item.id === interfaceId || item['interface-name'] === port,
        );

        const description = _.get(interfaceConfiguration, 'description', port);

        const speed = formatPortLinkSpeed(interfaceStatus);
        const duplex = formatPortDuplex(interfaceStatus);

        return {
            ...item,
            speed,
            duplex,
            description,
        };
    });

    return retVal;
};

export const extendSystemSwitchportData = async () => {
    await getNdmPageController();

    const switchportsController = await getElementController('.system__switchports-section');

    const portIds = _
        .chain(window.NDM)
        .get('PORTS_MAP')
        .map(port => port.interfaceId || port.port)
        .value();

    const statQueries = portIds.map(id => _.set({}, SHOW_INTERFACE_STAT, {name: id}));

    switchportsController.requester.registerDynamicCallback(
        () => {
            return sharedData.get(UI_EXTENSIONS_KEY) === false
                ? []
                : statQueries;
        },
        (responses) => {
            const statArray = responses.map(item => _.get(item, SHOW_INTERFACE_STAT, {}));

            switchportsController.groupedSwitchportsList = extendSwitchportsListWithStatData(
                switchportsController.groupedSwitchportsList,
                portIds,
                statArray,
            );
        },
    );

    // Overload to preserve existing stat data
    utils.getSwitchportsList = () => {
        const portsList = originalGetSwitchportsList();

        return portsList.map((port) => {
            const controllerPort = _.find(
                switchportsController.groupedSwitchportsList,
                item => item.interfaceId === port.interfaceId,
            );

            const existingStatData = _.pick(controllerPort, SHOW_INTERFACE_STAT_PROPS);

            return {
                ...port,
                ...existingStatData,
            }
        });
    }
};

export const revertExtendSystemSwitchportData = () => {
    utils.getSwitchportsList = originalGetSwitchportsList;
};
