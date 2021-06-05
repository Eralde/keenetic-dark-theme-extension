import * as _ from 'lodash';

import {
    getAngularService,
    getNdmPageController,
    getElementController,
} from '../lib/ndmUtils';
import {formatPortDuplex, formatPortLinkSpeed} from '../lib/formatUtils';

const switchportsService = getAngularService('switchportsService');
const utils = getAngularService('utils');

const SHOW_INTERFACE = 'show.interface';
const SHOW_RC_INTERFACE = 'show.rc.interface';

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

    console.log({switchportsController});
};
