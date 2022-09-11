import * as _ from 'lodash';
import {
    callOnPageLoad,
    forceScopeDigest,
    getAngularService,
    getNdmPageScope
} from '../lib/ndmUtils';
import {getL10n} from "../lib/l10nUtils";

const $timeout = getAngularService('$timeout');
const utils = getAngularService('utils');

const MAC_ADDRESS_ELEMENT_SELECTOR = '.__hint-text';
const PRIVATE_MAC_MARK_SELECTOR = 'SPAN';

const extractMac = (cellElement) => {
    try {
        return cellElement.querySelector(MAC_ADDRESS_ELEMENT_SELECTOR).innerText;
    } catch(err) {
        return '';
    }
}

const appendPrivateMacMark = (cellElement) => {
    const macAddressContainer = cellElement.querySelector(MAC_ADDRESS_ELEMENT_SELECTOR);

    if (!macAddressContainer) {
        return;
    }

    const existingMark = macAddressContainer.querySelector(PRIVATE_MAC_MARK_SELECTOR);

    if (existingMark) {
        existingMark.title = getL10n('deviceListsPrivateMac');

        return;
    }

    const markElement = document.createElement('SPAN');

    markElement.innerText = '!';
    markElement.title = getL10n('deviceListsPrivateMac');

    markElement.classList.add('private-mac-mark');
    macAddressContainer.appendChild(markElement);
};

const markPrivateMacAddressesInTable = ($scope) => {
    const addressCells = [
        ...document.querySelectorAll('tbody .table__col--2')
    ];

    const cellsToMark = addressCells.filter(cell => {
        const mac = extractMac(cell);

        return mac && _.invoke(utils, 'isPrivateMacAddress', mac);
    });

    cellsToMark.forEach(cell => appendPrivateMacMark(cell));
    forceScopeDigest($scope);
}

const markPrivateMacAddresses = () => {
    callOnPageLoad(() => {
        $timeout(async () => {
            const $scope = await getNdmPageScope();

            $scope.$watch('DevicesList.registeredDevices', () => markPrivateMacAddressesInTable($scope));
            $scope.$watch('DevicesList.unregisteredDevices', () => markPrivateMacAddressesInTable($scope));
            $scope.$watch('DevicesList.blockedDevices', () => markPrivateMacAddressesInTable($scope));
        });
    });
};

export const markPrivateMacs = {
    onLoad: markPrivateMacAddresses,
};