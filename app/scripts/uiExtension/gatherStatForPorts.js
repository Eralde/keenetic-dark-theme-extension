import * as _ from 'lodash';
import {
    getAngularService,
    getDashboardController,
    getElementController,
} from '../lib/ndmUtils';

import {
    extendSwitchportsListWithStatData,
    getGroupedSwitchportsListOverload,
    getPortIdList,
    getPortStatQueryList,
} from '../lib/switchportUtils';

import {sharedData} from '../lib/state';
import {
    __SHOW_INTERFACE_STAT_PROPS__,
    SHOW_INTERFACE_STAT,
    UI_EXTENSIONS_KEY,
} from '../lib/constants';

const dashboardDataService = getAngularService('dashboardDataService');
const utils = getAngularService('utils');
const router = getAngularService('router');
const switchportsService = getAngularService('switchportsService');

const originalGetSwitchportsList = utils.getSwitchportsList;
const originalGetGroupedSwitchportsList = switchportsService.getGroupedSwitchportsList;

const gatherStatForPorts = async () => {
    await getDashboardController();

    switchportsService.getGroupedSwitchportsList = getGroupedSwitchportsListOverload(
        originalGetGroupedSwitchportsList,
    );

    const switchportsController = await getElementController('#card_switchports');
    const portIds = getPortIdList();

    dashboardDataService.registerCallback([], () => {
        // Overload to preserve existing stat data
        utils.getSwitchportsList = () => {
            const portsList = originalGetSwitchportsList();

            return portsList.map((port) => {
                let existingDataSource;

                existingDataSource = _.find(
                    switchportsController.switchports,
                    item => item.interfaceId === port.interfaceId
                );

                if (!existingDataSource) {
                    const linkGroupMaster = _.find(
                        switchportsController.switchports,
                        item => _.get(item, 'linkedPort.interfaceId', '') === port.interfaceId,
                    );

                    existingDataSource = _.get(linkGroupMaster, 'linkedPort');
                }

                const existingStatData = _.pick(existingDataSource, __SHOW_INTERFACE_STAT_PROPS__);

                return {
                    ...port,
                    ...existingStatData,
                }
            });
        };

        if (sharedData.get(UI_EXTENSIONS_KEY) === false) {
            return;
        }

        setTimeout(() => {
            const statQueries = getPortStatQueryList(portIds);

            router.postToRciRoot(statQueries).then((responses) => {
                const statArray = responses.map(item => _.get(item, SHOW_INTERFACE_STAT, {}));

                switchportsController.switchports = extendSwitchportsListWithStatData(
                    _.map(switchportsController.switchports),
                    portIds,
                    statArray,
                );
            });
        }, 1000);
    });
}

const revertGatherStatForPortsChanges = () => {
    utils.getSwitchportsList = originalGetSwitchportsList;
    switchportsService.getGroupedSwitchportsList = originalGetGroupedSwitchportsList;
};

export const extendedDashboardSwitchportsData = {
    onLoad: gatherStatForPorts,
    onDestroy: revertGatherStatForPortsChanges,
};
