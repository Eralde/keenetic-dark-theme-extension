import * as _ from 'lodash';
import {getAngularService} from "../lib/ndmUtils";
import {addCssClass} from "../lib/domUtils";

/*
 * This UI extension shows links to the VPN server statistics
 * under the VPN server app toggles on the dashboard
 */

const appsService = getAngularService('appsService');
const $timeout = getAngularService('$timeout');
const $q = getAngularService('$q');

// original 'appsService.getAppsStates' function
const _getAppsStates = _.get(appsService, 'getAppsStates');

const VIRTUAL_IP = 'virtualIP';

const isVpnApp = (app, name) => {
    return name === VIRTUAL_IP || (name.startsWith('vpn') && !name.endsWith('stat'));
};

const isAppEnabled = (app) => {
    return app.enable;
};

const getVpnStatLink = (appName) => {
    return {
        href: `/controlPanel/apps/${appName}-stat`,
        name: 'apps.statistic',
        visible: true,
    }
};

let _updateLinksStylesTimeout = null;

const updateVpnStatLinksStyles = () => {
    const appLinks = document.querySelectorAll('.apps-list__app-description .external-link');
    const vpnStatLinks = [...appLinks].filter(linkEl => linkEl.href.endsWith('stat'));

    addCssClass(vpnStatLinks, 'vpn-stat-link');
    _.forEach(vpnStatLinks, el => {
        el.target = '';
    });

    const appsCard = document.querySelectorAll('#card_apps');
    const controller = angular.element(appsCard).controller();

    const disabledVpnApps = _
        .chain(controller)
        .get('apps', {})
        .pickBy(isVpnApp)
        .pickBy(app => !app.enabled)
        .value();

    vpnStatLinks
        .filter(linkEl => {
            const linkAppName = _
                .chain(linkEl.href)
                .split('apps/')
                .get('[1]', '')
                .replace('-stat', '')
                .value();

            return _.has(disabledVpnApps, linkAppName);
        })
        .forEach(node => {
            node.parentNode.removeChild(node);
        });

    _updateLinksStylesTimeout = $timeout(updateVpnStatLinksStyles, 1000);
};

export const modifyAppsService = () => {
    appsService.getAppsStates = (...args) => {
        const appStates = _getAppsStates(...args);

        const enabledVpnApps = _
            .chain(appStates)
            .pickBy(isVpnApp)
            .pickBy(isAppEnabled)
            .value();

        _.forEach(enabledVpnApps, (app, name) => {
            app.link = getVpnStatLink(name);
        });

        return appStates;
    };

    const defer = _.get($q, 'defer');
    const _deferred = defer();

    const getPageController = () => {
        const element = angular.element(document.querySelector('.d-dashboard'));
        const controller = element.controller();

        if (!controller) {
            setTimeout(getPageController, 300);

            return _deferred.promise;
        }

        _deferred.resolve(controller);

        return _deferred.promise;
    };

    getPageController().then(() => {
        updateVpnStatLinksStyles();
    });
};

export const revertAppsServiceModifications = () => {
    appsService.getAppsStates = _getAppsStates;

    $timeout.cancel(_updateLinksStylesTimeout);
};
