import {callOnPageLoad, getAngularService} from '../lib/ndmUtils';
import {toggleCssClass} from '../lib/domUtils';
import {sharedData} from '../lib/state';
import * as CONSTANTS from '../lib/constants';

const utils = getAngularService('utils');
const $timeout = getAngularService('$timeout');

const origFormatWirelessDeviceConnectionData = utils.wifi.formatConnectionData;

const addWoLButton = () => {
    callOnPageLoad(() => {
        $timeout(async () => {
            const tables = [
                ...document.querySelectorAll('.table_devices-list'),
            ];

            toggleCssClass(
                tables,
                'table_devices-list--expand-connection-column',
                sharedData.get(CONSTANTS.SHOW_RSSI_VALUE),
            );
        });

        utils.wifi.formatConnectionData = (host, l10n = null) => {
            const rslt = origFormatWirelessDeviceConnectionData(host, l10n);

            if (!sharedData.get(CONSTANTS.SHOW_RSSI_VALUE)) {
                return rslt;
            }

            return rslt.replace(
                '</i>',
                `</i><span class="kdte-ui-extension-text">RSSI: ${host.rssi}</span>`,
            );
        };
    });
};

const restoreOriginalFormatConnectionData = () => {
    utils.wifi.formatConnectionData = origFormatWirelessDeviceConnectionData;
}

export const rssiValueInConnectionInfo = {
    onLoad: addWoLButton,
    onDestroy: restoreOriginalFormatConnectionData,
};
