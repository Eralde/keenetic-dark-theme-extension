import * as _ from 'lodash';

import {
    getNdmPageController,
    getElementController,
    getAngularService,
} from '../lib/ndmUtils';

import {
    extendGroupedSwitchportsList,
    extendSwitchportsListWithStatData,
    getPortIdList,
    getPortStatQueryList,
} from '../lib/switchportUtils';

import {
    SHOW_INTERFACE,
    SHOW_INTERFACE_STAT,
    SHOW_RC_INTERFACE,
    UI_EXTENSIONS_KEY,
    __SHOW_INTERFACE_STAT_PROPS__,
} from '../lib/constants';

import {sharedData} from '../lib/state';

const switchportsService = getAngularService('switchportsService');
const utils = getAngularService('utils');

const originalGetSwitchportsList = utils.getSwitchportsList;
const originalProcessConfiguration = switchportsService.processConfiguration;

switchportsService.processConfiguration = (responses) => {
    const showInterfaceData = _.get(responses, `[0].${SHOW_INTERFACE}`, {});
    const showRcInterfaceData = _.get(responses, `[1].${SHOW_RC_INTERFACE}`, {});
    const retVal = originalProcessConfiguration(responses);
    const groupedSwitchportsList = _.get(retVal, 'groupedSwitchportsList', []);

    retVal.groupedSwitchportsList = extendGroupedSwitchportsList(
        groupedSwitchportsList,
        showInterfaceData,
        showRcInterfaceData,
    );

    return retVal;
};

const extendSystemSwitchportData = async () => {
    await getNdmPageController();

    const switchportsController = await getElementController('.system__switchports-section');

    const getSwitchportsList = () => {
        return switchportsController.groupedSwitchportsList || switchportsController.ports;
    };

    const portIds = getPortIdList();
    const statQueries = getPortStatQueryList(portIds);

    switchportsController.requester.registerDynamicCallback(
        () => {
            return sharedData.get(UI_EXTENSIONS_KEY) === false
                ? []
                : statQueries;
        },
        (responses) => {
            const statArray = responses.map(item => _.get(item, SHOW_INTERFACE_STAT, {}));

            switchportsController.groupedSwitchportsList = extendSwitchportsListWithStatData(
                getSwitchportsList(),
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
                getSwitchportsList(),
                item => item.interfaceId === port.interfaceId,
            );

            const existingStatData = _.pick(controllerPort, __SHOW_INTERFACE_STAT_PROPS__);

            return {
                ...port,
                ...existingStatData,
            }
        });
    }
};

const revertExtendSystemSwitchportData = () => {
    utils.getSwitchportsList = originalGetSwitchportsList;
};

export const extendedSystemSwitchportsData = {
    onLoad: extendSystemSwitchportData,
    onDestroy: revertExtendSystemSwitchportData,
};
