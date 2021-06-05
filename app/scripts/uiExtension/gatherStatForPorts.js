import * as _ from 'lodash';
import {
    extendSwitchportsListWithStatData,
    getAngularService,
    getDashboardController,
    getElementController,
} from '../lib/ndmUtils';
import {sharedData} from '../lib/state';
import {SHOW_INTERFACE_STAT_PROPS, UI_EXTENSIONS_KEY} from '../lib/constants';

const dashboardDataService = getAngularService('dashboardDataService');
const utils = getAngularService('utils');

const originalGetSwitchportsList = utils.getSwitchportsList;

export const gatherStatForPorts = async () => {
    await getDashboardController();

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
                const controllerPort = _.find(
                    switchportsController.switchports,
                    item => item.interfaceId === port.interfaceId,
                );

                const existingStatData = _.pick(controllerPort, SHOW_INTERFACE_STAT_PROPS);

                return {
                    ...port,
                    ...existingStatData,
                }
            });
        }

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
};
