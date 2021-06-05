import {getAngularService} from './ndmUtils';
import * as _ from 'lodash';

const utils = getAngularService('utils');

export const EMPTY_VAL_HTML = '&mdash;';

export const formatBytesColumn = val => {
    return isNaN(Number(val))
        ? EMPTY_VAL_HTML
        : utils.format.size(Number(val));
};

export const formatUptime = (uptime, tunnelRow) => {
    return tunnelRow.isEnabled
        ? utils.getSplittedTime(uptime)
        : EMPTY_VAL_HTML;
};

export const formatIpData = (ip) => {
    return ip === '0.0.0.0'
        ? EMPTY_VAL_HTML
        : ip;
};

export const formatPortLinkSpeed = (showInterfaceItem) => {
    const speed = Number(_.get(showInterfaceItem, 'speed'));

    if (isNaN(speed)) {
        return '';
    }

    if (speed < 1000) {
        return `${speed} M`;
    }

    const speedInGbps = (speed / 1000).toFixed(1);

    return `${speedInGbps} G`;
};

export const formatPortDuplex = (showInterfaceItem, duplexPlaceholder = '-') => {
    if (_.get(showInterfaceItem, 'id', '') === window.NDM.DSL) {
        const line = _.get(showInterfaceItem, 'line', '');
        const opmode = _.get(showInterfaceItem, 'opmode', '').toLowerCase();

        if (line !== 'showtime') {
            return duplexPlaceholder;
        }

        return opmode.includes('vdsl')
            ? 'VDSL'
            : 'ADSL';
    }

    const duplex = _.get(showInterfaceItem, 'duplex', '');

    if (!duplex) {
        return duplexPlaceholder;
    }

    return duplex.substr(0, 1).toUpperCase() + 'DX'; // HDX / FDX
};
