import * as _ from 'lodash';
import {getAngularService, getDashboardController} from '../lib/ndmUtils';

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
];

export const gatherStatForPorts = async () => {
    await getDashboardController();

    const switchportsCard = document.querySelector('#card_switchports');
    const switchportsController = angular.element(switchportsCard).controller();

    dashboardDataService.registerCallback([], () => {
        const portIds = _
            .chain(window.NDM)
            .get('PORTS_MAP')
            .map(port => port.interfaceId)
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

        setTimeout(() => {
            dashboardDataService.getInterfaceStatistics(portIds).then((responseData) => {
                const statArray = _.get(responseData[1], 'show.interface.stat', []);

                switchportsController.switchports = _.map(switchportsController.switchports,
                    (port) => {
                        const {interfaceId} = port;
                        const index = _.findIndex(portIds, item => item === interfaceId);

                        return {
                            ...port,
                            ..._.get(statArray, [index], {}),
                        };
                    });
            });
        }, 1000);
    });
}

export const revertGatherStatForPortsChanges = () => {
    utils.getSwitchportsList = originalGetSwitchportsList;
};
