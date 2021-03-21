import * as _ from 'lodash';
import {getAngularService, getElementController, getElementScope} from "../lib/ndmUtils";
import {getL10n} from "../lib/l10nUtils";

const watchers = [];
const DELTA_CHANNEL = 'delta';

const modifyDeltaOption = (optionsList) => {
    const deltaOptionIndex = _.findIndex(optionsList, item => item.id === DELTA_CHANNEL);

    if (deltaOptionIndex === -1) {
        return;
    }

    optionsList[deltaOptionIndex] = {
        id: DELTA_CHANNEL,
        label: getL10n('deltaChannelOption'),
        details: {
            title: getL10n('deltaChannelName'),
            shortDescription: getL10n('deltaChannelShortText'),
            description: getL10n('deltaChannelText'),
        }
    };
}

export const overriderSandboxOptions = async () => {
    const $rootScope = getAngularService('$rootScope');
    const vm = await getElementController('.system__components-section');
    const scope = await getElementScope('.system__components-section');

    const channelsListWatcher = scope.$watch('vm.autoUpdateChannels', (newVal) => {
        if (!newVal) {
            return;
        }

        modifyDeltaOption(newVal);
    });

    const languageChangeWatcher = $rootScope.$on('$translateChangeSuccess', () => {
        setTimeout(() => {
            if (!_.has(vm, 'autoUpdateChannels')) {
                return;
            }

            modifyDeltaOption(vm.autoUpdateChannels, false);
            // Forces selectbox to redraw options
            vm.autoUpdateChannels = vm.autoUpdateChannels.slice();
        });
    });

    watchers.push(channelsListWatcher);
    watchers.push(languageChangeWatcher);
};

export const cancelComponentsSectionsWatchers = () => {
    watchers.forEach(item => item());
}

export const overrideSandboxesList = () => {
    const componentsService = getAngularService('componentsService');

    if (!_.has(componentsService.constant, 'FW_CHANNEL')) {
        console.log('Unable to change auto update channels list');
        return;
    }

    const constant = componentsService.constant;

    constant.FW_CHANNEL.DELTA = DELTA_CHANNEL;
    constant.AUTO_UPDATE_CHANNELS_LIST.push(constant.FW_CHANNEL.DELTA);
}
