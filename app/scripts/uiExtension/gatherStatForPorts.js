import * as _ from 'lodash';
import {
    extendSwitchportsListWithStatData,
    getAngularService,
    getDashboardController,
    getElementController, getGroupedSwitchportsListOverload,
} from '../lib/ndmUtils';
import {sharedData} from '../lib/state';
import {__SHOW_INTERFACE_STAT_PROPS__, UI_EXTENSIONS_KEY} from '../lib/constants';

const dashboardDataService = getAngularService('dashboardDataService');
const utils = getAngularService('utils');
const switchportsService = getAngularService('switchportsService');

const originalGetSwitchportsList = utils.getSwitchportsList;
const originalGetGroupedSwitchportsList = switchportsService.getGroupedSwitchportsList;

export const gatherStatForPorts = async () => {
    await getDashboardController();

    switchportsService.getGroupedSwitchportsList = getGroupedSwitchportsListOverload(
        originalGetGroupedSwitchportsList,
    );

    const switchportsController = await getElementController('#card_switchports');

    dashboardDataService.registerCallback([], () => {
        const portIds = _
            .chain(window.NDM)
            .get('PORTS_MAP')
            .map(port => port.interfaceId || port.port)
            .value();


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
            dashboardDataService.getInterfaceStatistics(portIds).then((responseData) => {
                const statArray = _.get(responseData[1], 'show.interface.stat', []);

                switchportsController.switchports = extendSwitchportsListWithStatData(
                    _.map(switchportsController.switchports),
                    portIds,
                    statArray,
                );
            });
        }, 1000);
    });
}

export const revertGatherStatForPortsChanges = () => {
    utils.getSwitchportsList = originalGetSwitchportsList;
    switchportsService.getGroupedSwitchportsList = originalGetGroupedSwitchportsList;
};
