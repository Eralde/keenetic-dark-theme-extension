import * as _ from 'lodash';
import {getElementController, getElementScope} from '../lib/ndmUtils';

const WIFI_SETTINGS_SELECTOR = '[ng-controller="WifiSettingsController as WSC"]';
const WIFI_SETTINGS_POPUP_SELECTOR = '.segment-advanced-wifi-settings-popup';
const CHANNEL_SELECTBOX_DETAILS_SELECTOR = `${WIFI_SETTINGS_POPUP_SELECTOR} [ng-show="vm.previewIsVisible"]`;

const watchers = {
    channelSelectboxVisibility: null,
    channelSelectboxDetails: null,
};

const revertChangesToChannelSelectbox = () => {
    _.forEach(watchers, (value, key) => {
        if (value) {
            value();
        }

        watchers[key] = null;
    });
};

const overrideChannelSelectbox = async () => {
    const vm = await getElementController(WIFI_SETTINGS_SELECTOR);
    const $scope = await getElementScope(WIFI_SETTINGS_SELECTOR);

    const debouncedVisibilityCallback = _.debounce(async (value) => {
        if (!value) {
            return;
        }

        watchers.channelSelectboxVisibility();

        const channelSelectboxScope$ = await getElementScope(CHANNEL_SELECTBOX_DETAILS_SELECTOR);
        const channelSelectboxDetailsElement = document.querySelector(CHANNEL_SELECTBOX_DETAILS_SELECTOR);

        if (!channelSelectboxDetailsElement) {
            return;

        }

        const debouncedDetailsCallback = _.debounce((value) => {
            channelSelectboxDetailsElement.style['background-color'] = value
                ? '#606060'
                : 'transparent';
        });

        watchers.channelSelectboxDetails = channelSelectboxScope$.$watch(
            () => {
                if (!_.get(channelSelectboxScope$, 'vm.previewIsVisible')) {
                    return false;
                }

                const previewValue = _.get(channelSelectboxScope$, 'vm.previewValue', {});

                return previewValue.title || previewValue.description;
            },
            debouncedDetailsCallback,
        );
    });

    watchers.channelSelectboxVisibility = $scope.$watch(
        () => {
            if (
                !vm.isVisible
                || !_.get(vm, 'master.canSelectChannel')
                || !vm.bandHasDfsChannels
            ) {
                return false;
            }

            const wifiSettingsPopup = document.querySelector(WIFI_SETTINGS_POPUP_SELECTOR);
            const parentNode = _.get(wifiSettingsPopup, 'parentNode');
            const classList = parentNode
                ? parentNode.getAttribute('class')
                : '';

            return classList.includes('ndm-page-view');
        },
        debouncedVisibilityCallback,
    );
}

export const dfsChannelsDetails = {
    onLoad: overrideChannelSelectbox,
    onDestroy: revertChangesToChannelSelectbox,
};