import * as _ from 'lodash';
import {DELTA_CHANNEL, isSuitableDevice} from './componentsListDelta';
import {getDashboardController, getElementController, getElementScope} from '../lib/ndmUtils';
import {getL10n} from '../lib/l10nUtils';
import {createDiv} from '../lib/domUtils';

const SYSTEM_CARD_SELECTOR = '#card_system';
const FIRMWARE_UPDATE_NAME_CLASS = 'firmware-update-channel-name';

const watchers = [];

const overrideDeltaSandboxL10n = async () => {
    if (!isSuitableDevice()) {
        return;
    }

    await getDashboardController();

    const systemCardScope = await getElementScope(SYSTEM_CARD_SELECTOR);
    const cardElement = document.querySelector(SYSTEM_CARD_SELECTOR);

    const l10nWatcher = systemCardScope.$watch('DCSC.autoUpdateChannelL10nId', (val, oldVal) => {
        if (!_.endsWith(val, DELTA_CHANNEL)) {
            return;
        }

        if (val === oldVal) {
            return;
        }

        const originalL10nElement = cardElement.querySelector(`.${FIRMWARE_UPDATE_NAME_CLASS}`);
        const parentElement = cardElement.querySelector('.simple-list__text--fw-update-info');

        if (!originalL10nElement || !parentElement) {
            return;
        }

        originalL10nElement.style.display = 'none';

        const swappedL10nElement = createDiv(FIRMWARE_UPDATE_NAME_CLASS);

        swappedL10nElement.innerHTML = getL10n('deltaChannelOption');

        parentElement.prepend(swappedL10nElement);
    });

    watchers.push(l10nWatcher);
}

const cancelL10nWatcher = () => {
    if (!isSuitableDevice()) {
        return;
    }

    watchers.forEach(watcher => watcher());
}

export const overrideDeltaL10n = {
    onLoad: overrideDeltaSandboxL10n,
    onDestroy: cancelL10nWatcher,
};
