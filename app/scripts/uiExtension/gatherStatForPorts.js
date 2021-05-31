import * as _ from 'lodash';
import {
    getAngularService,
    getDashboardController,
    getSwitchportsCardController,
} from '../lib/ndmUtils';
import {sharedData} from '../lib/state';
import {UI_EXTENSIONS_KEY} from '../lib/constants';

const dashboardDataService = getAngularService('dashboardDataService');
const utils = getAngularService('utils');

const originalGetSwitchportsList = utils.getSwitchportsList;

const SHOW_INTERFACE_STAT_PROPS = [
    'rxpackets',
    'rx-multicast-packets',
    'rx-broadcast-packets',
    'rxbytes',
    'rxerrors',
    'rxdropped',
    'txpackets',
    'tx-multicast-packets',
    'tx-broadcast-packets',
    'txbytes',
    'txerrors',
    'txdropped',
    'timestamp',
    'last-overflow',
    'rxShort',
    'txShort',
];

export const gatherStatForPorts = async () => {
    await getDashboardController();

    const switchportsController = await getSwitchportsCardController();

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

                switchportsController.switchports = _.map(switchportsController.switchports,
                    (port) => {
                        const {interfaceId} = port;
                        const index = _.findIndex(portIds, item => item === interfaceId);
                        const statData = _.get(statArray, [index], {});
                        const rxShort = utils.format.size(statData.rxbytes, true);
                        const txShort = utils.format.size(statData.txbytes, true);

                        return {
                            ...port,
                            ...statData,
                            rxShort,
                            txShort,
                        };
                    });
            });
        }, 1000);
    });
}

export const revertGatherStatForPortsChanges = () => {
    utils.getSwitchportsList = originalGetSwitchportsList;
};
