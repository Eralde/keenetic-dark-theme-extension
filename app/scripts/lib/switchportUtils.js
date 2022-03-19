import * as _ from 'lodash';
import {SHOW_INTERFACE_STAT} from './constants';
import {formatPortDuplex, formatPortLinkSpeed} from './formatUtils';
import {getAngularService, getPortInterfaceStatus} from './ndmUtils';

const NDM = window.NDM;
const components = _.get(NDM, 'profile.components', {});

const _getAdditionalSwitchportProps = (port, interfaceStatus) => {
    const portIconLabel = port.type === 'dsl'
        ? port.portId
        : port.port;

    // This does not work for Ethernet ports, but works for Dsl0 >_<
    const interfaceDescription = _.get(interfaceStatus, 'description', '');

    return {
        portIconLabel,
        interfaceDescription,
    };
}

const _extendGroupedSwitchportsListItem = (port, showInterfaceData) => {
    const interfaceStatus = getPortInterfaceStatus(port, showInterfaceData);
    const additionalProps = _getAdditionalSwitchportProps(port, interfaceStatus);

    return {
        ...port,
        ...additionalProps,
    };
};

export const extendGroupedSwitchportsList = (
    groupedSwitchportsList,
    showInterfaceData,
    showRcInterfaceData,
) => {
    return groupedSwitchportsList.map(item => {
        const {interfaceId, port} = item;

        const interfaceStatus = getPortInterfaceStatus(item, showInterfaceData);
        const additionalProps = _getAdditionalSwitchportProps(item, interfaceStatus);

        if (item.linkedPort) {
            item.linkedPort = _extendGroupedSwitchportsListItem(item.linkedPort, showInterfaceData);

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
}

export const getGroupedSwitchportsListOverload = (getGroupedSwitchportsList) => {
    return (...args) => {
        const returnValue = getGroupedSwitchportsList(...args);
        const showInterfaceData = _.get(args, [1], {});

        return returnValue.map(port => {
            if (port.linkedPort) {
                port.linkedPort = _extendGroupedSwitchportsListItem(port.linkedPort, showInterfaceData);

                // workaround to show proper label inside the port icon & proper description below
                port.linkedPort.description = port.linkedPort.name
                port.linkedPort.name = port.linkedPort.portIconLabel;
            }

            return _extendGroupedSwitchportsListItem(port, showInterfaceData);
        });
    };
};

export const getPortIdList = () => {
    return _
        .chain(window.NDM)
        .get('PORTS_MAP')
        .map(port => port.interfaceId || port.port)
        .value();
};

export const getPortStatQueryList = (portIdList) => {
    return portIdList.map(id => {
        if (!id) {
            return {};
        }

        if (String(id).startsWith(NDM.DSL) && !_.has(components, 'dsl')) {
            return {};
        }

        return _.set({}, SHOW_INTERFACE_STAT, {name: id});
    });
};

const _extendPortData = ({utils, port, portIdsList, statDataList}) => {
    const {interfaceId} = port;

    const index = _.findIndex(portIdsList, item => item === interfaceId);
    const statData = _.get(statDataList, [index], {});
    const rxShort = utils.format.size(statData.rxbytes, true);
    const txShort = utils.format.size(statData.txbytes, true);

    return {
        ...port,
        ...statData,
        'rxbytes-formatted-short': rxShort,
        'txbytes-formatted-short': txShort,
    };
}

export const extendSwitchportsListWithStatData = (switchportsList, portIdsList, statDataList) => {
    const utils = getAngularService('utils');

    return switchportsList.map(port => {
        if (port.linkedPort) {
            port.linkedPort = _extendPortData({
                utils,
                portIdsList,
                statDataList,
                port: port.linkedPort,
            });
        }

        return _extendPortData({utils, port, portIdsList, statDataList});
    });
}