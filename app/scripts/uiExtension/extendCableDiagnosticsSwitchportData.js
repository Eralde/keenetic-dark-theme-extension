import * as _ from 'lodash';

import {
    getNdmPageController,
    getElementController, getAngularService,
} from '../lib/ndmUtils';

import {
    extendGroupedSwitchportsList,
    extendSwitchportsListWithStatData,
    getPortIdList,
    getPortStatQueryList
} from '../lib/switchportUtils';

import {sharedData} from '../lib/state';

import {
    SHOW_INTERFACE,
    SHOW_INTERFACE_STAT,
    SHOW_RC_INTERFACE,
    UI_EXTENSIONS_KEY,
} from '../lib/constants';

const extendCableDiagnosticsSwitchportsData = async () => {
    const cableDiagnostics = getAngularService('cableDiagnostics');

    await getNdmPageController();

    const cableDiagnosticsController = await getElementController('.cable-diagnostics');

    const portIds = getPortIdList();
    const statQueries = getPortStatQueryList(portIds);

    cableDiagnostics.requester.registerDynamicCallback(
        () => {
            return sharedData.get(UI_EXTENSIONS_KEY) === false
                ? []
                : [SHOW_INTERFACE, SHOW_RC_INTERFACE, ...statQueries];
        },
        (responses) => {
            const statArray = responses
                .slice(2)
                .map(item => _.get(item, SHOW_INTERFACE_STAT, {}));

            const showInterfaceData = _.get(responses[0], SHOW_INTERFACE, {});
            const showRcInterfaceData = _.get(responses[1], SHOW_RC_INTERFACE, {});

            cableDiagnosticsController.switchportsList = extendGroupedSwitchportsList(
                cableDiagnosticsController.switchportsList,
                showInterfaceData,
                showRcInterfaceData,
            );

            cableDiagnosticsController.switchportsList = extendSwitchportsListWithStatData(
                cableDiagnosticsController.switchportsList,
                portIds,
                statArray,
            );
        },
    );
};

export const extendedCableDiagnosticsSwitchportsData = {
    onLoad: extendCableDiagnosticsSwitchportsData,
    onDestroy: _.noop,
};