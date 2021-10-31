import * as _ from 'lodash';
import {
    callOnPageLoad,
    forceScopeDigest,
    getAngularService,
    getNdmPageScope
} from '../lib/ndmUtils';

const DISABLED_BTN_CLASS = 'btn--disabled';

const $timeout = getAngularService('$timeout');
const router = getAngularService('router');

const sendWolQuery = (mac) => {
    return router.post({url: 'ip/hotspot/wake', data: {mac}});
};

const appendWolButtonToCell = (cell) => {
    const existingButton = cell.querySelector('button');

    if (existingButton) {
        return;
    }

    const trElement = cell.closest('TR');
    const rowScope$ = angular.element(trElement).scope();
    const deviceData = _.get(rowScope$, 'x', {});

    if (!deviceData.registered || !deviceData.mac) {
        return;
    }

    if (deviceData.active) {
        return;
    }

    const button = document.createElement('BUTTON');

    button.innerText = 'WoL';

    button.setAttribute('type', 'button');
    button.classList.add('btn');
    button.classList.add('wol-button');
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (button.classList.contains(DISABLED_BTN_CLASS)) {
            return;
        }

        button.classList.add(DISABLED_BTN_CLASS);

        sendWolQuery(deviceData.mac);
        setTimeout(
            () => {
                button.classList.remove(DISABLED_BTN_CLASS);
            },
            3000,
        );
    });

    cell.appendChild(button);
    cell.classList.add('inactive-device');
};

const addWoLButton = () => {
    callOnPageLoad(() => {
        $timeout(async () => {
            const $scope = await getNdmPageScope();

            $scope.$watch('DevicesList.registeredDevices', () => {
                const nameCells = [
                    ...document.querySelectorAll('tbody .table__col--1')
                ];

                nameCells.forEach(cell => appendWolButtonToCell(cell));
                forceScopeDigest($scope);
            });
        });
    });
};

export const additionalWolButton = {
    onLoad: addWoLButton,
};
