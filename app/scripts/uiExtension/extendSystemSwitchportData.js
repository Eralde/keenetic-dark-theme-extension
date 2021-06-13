import * as _ from 'lodash';

import {
    getAngularService,
    getNdmPageController,
    getElementController,
    getPortInterfaceStatus,
    getAdditionalSwitchportProps,
    extendSwitchportsListWithStatData,
    extendGroupedSwitchportsListItem,
} from '../lib/ndmUtils';

import {formatPortDuplex, formatPortLinkSpeed} from '../lib/formatUtils';
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

    retVal.groupedSwitchportsList = groupedSwitchportsList.map(item => {
        const {interfaceId, port} = item;

        const interfaceStatus = getPortInterfaceStatus(item, showInterfaceData);
        const additionalProps = getAdditionalSwitchportProps(item, interfaceStatus);

        if (item.linkedPort) {
            item.linkedPort = extendGroupedSwitchportsListItem(item.linkedPort, showInterfaceData);

            // workaround to show proper label inside the port icon & proper description below
            item.linkedPort.description = item.linkedPort.name
            item.linkedPort.name = item.linkedPort.portIconLabel;
        }

        const interfaceConfiguration = _.get(showRcInterfaceData, interfaceId)
            || _.find(showRcInterfaceData, item => item.rename === port);

        const description = _.get(interfaceConfiguration, 'description', port);
        const speed = formatPortLinkSpeed(interfaceStatus);
        const duplex = formatPortDuplex(interfaceStatus);

        return {
            ...item,
            ...additionalProps,
            speed,
            duplex,
            description,
        };
    });

    return retVal;
};

const extendSystemSwitchportData = async () => {
    await getNdmPageController();

    const switchportsController = await getElementController('.system__switchports-section');

    const getSwitchportsList = () => {
        return switchportsController.groupedSwitchportsList || switchportsController.ports;
    };

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
