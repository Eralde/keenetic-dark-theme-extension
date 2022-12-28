import * as _ from 'lodash';
import {ROOT_ELEMENT_SELECTOR, routesToolsService} from './routes-tools.service';
import {getL10n} from '../../lib/l10nUtils';
import {logWarning} from '../../lib/log';
import * as ndmUtils from '../../lib/ndmUtils';

export function RoutesImportPopupController() {
    const element = angular.element(document.querySelector(ROOT_ELEMENT_SELECTOR));

    if (!element) {
        logWarning(`Failed to get toolbar root element (${ROOT_ELEMENT_SELECTOR})`);

        return;
    }

    const vm = this;

    const {
        OPEN_IMPORT_POPUP,
        RELOAD_ROUTES,
    } = routesToolsService.EVENTS;

    const utils = ndmUtils.getAngularService('utils');
    const $rootScope = ndmUtils.getAngularService('$rootScope');
    const interfaces = ndmUtils.getAngularService('interfaces');
    const staticRoutesHelperService = ndmUtils.getAngularService('staticRoutesHelperService');
    const routesService = ndmUtils.getAngularService('routesService');

    let ANY_INTERFACE_OPTION,
        DEFAULT_ROUTE;

    if (_.has(staticRoutesHelperService, 'ROUTES_CONST')) { // 3.x firmware
        ANY_INTERFACE_OPTION = staticRoutesHelperService.ROUTES_CONST.ANY_INTERFACE_OPTION;
        DEFAULT_ROUTE = routesService.DEFAULT_ROUTE;
    } else { // 2.x firmware
        ANY_INTERFACE_OPTION = _
            .chain(staticRoutesHelperService)
            .invoke('getAnyInterfaceOption')
            .get('id', '')
            .value();

        DEFAULT_ROUTE = _.get(routesService, ['const', 'default-route']);
    }

    const $scope = element.scope();

    const callOnDestroy = [];

    vm.isVisible = false;
    vm.missingInterfaceIds = [];
    vm.missingInterfaceList = [];
    vm.deviceRoutesList = [];
    vm.interfaceReplacements = {};
    vm.interfaceIdToLabelMap = {};

    vm.is2xFirmware = ndmUtils.isLegacyVersion(_.get($rootScope, 'kdte.ndwBranch', ''));

    vm.l10n = {};

    const resetPopupState = () => {
        vm.isVisible = false;
        vm.missingInterfaceIds = [];
        vm.missingInterfaceList = [];
        vm.deviceRoutesList = [];
        vm.interfaceReplacements = {};
        vm.interfaceIdToLabelMap = {};

        vm.l10n = {};
    };

    const updateL10n = () => {
        vm.l10n = {
            unknownInterface: '?',
            popupHeader: getL10n('RoutesImportPopupHeader'),

            header: {
                destination: getL10n('RoutesImportPopupDestinationHeader'),
                auto: getL10n('RoutesImportPopupAutoHeader'),
                importStatus: getL10n('RoutesImportPopupImportStatusHeader'),
            },

            anyInterface: utils.getTranslation('staticRoutes.any-interface'),
            yes: utils.getTranslation('yes'),
            no: utils.getTranslation('no'),
            defaultRoute: utils.getTranslation('staticRoutes.route-properties.default'),
            replaceMissingInterfaceWith: getL10n('RoutesImportPopupReplaceInterfaceWith'),

            importBtnLabel: getL10n('RoutesImportPopupImportBtnLabel'),

            importStatus: {
                ready: getL10n('RoutesImportPopupImportStatusReady'),
                selectInterface: getL10n('RoutesImportPopupImportStatusSelectInterface'),
                alreadyExists: getL10n('RoutesImportPopupImportStatusExists'),
            }
        };
    };

    const getRouteImportStatus = ({route, deviceRoutesList, missingInterfaceIds}) => {
        const alreadyExists = _.some(
            deviceRoutesList,
            item => {
                return _.isEqual(_.omit(route, 'view'), item);
            },
        );

        if (alreadyExists) {
            return {
                className: 'help-text',
                text: vm.l10n.importStatus.alreadyExists,
            };
        }

        if (missingInterfaceIds.includes(route.interfaceId)) {
            return {
                className: 'help-text--warning',
                text: vm.l10n.importStatus.selectInterface,
            };
        }

        return {
            className: 'help-text--success',
            text: vm.l10n.importStatus.ready,
        };
    }

    const unbinder = $rootScope.$on(OPEN_IMPORT_POPUP, async ($event, routesList) => {
        updateL10n();

        const {showInterfaceData, showRcIpRoute} = await routesToolsService.getRoutesAndInterfaces();

        const routeInterfaceIds = routesList
            .filter(item => item.interfaceId)
            .map(item => _.pick(item, ['interfaceId', 'interfaceLabel']));

        vm.interfaceIdToLabelMap = interfaces.getInterfaceIdToLabelMap(showInterfaceData);

        const missingInterfaceList = _
            .chain(routeInterfaceIds)
            .filter(item => !_.some(showInterfaceData, {id: item.interfaceId}))
            .uniqBy('interfaceId')
            .value();

        vm.missingInterfaceIds = missingInterfaceList.map(item => item.interfaceId);

        vm.interfaceReplacements = vm.missingInterfaceIds.reduce((acc, id) => ({...acc, [id]: ''}), {});

        vm.deviceRoutesList = showRcIpRoute.map(route => {
            return routesToolsService.normalizeRouteData({
                route,
                showInterfaceData,
                interfaceIdToLabelMap: vm.interfaceIdToLabelMap,
            });
        });

        vm.missingInterfaceList = missingInterfaceList.map(item => {
            return {
                ...item,
                replacementId: '',
            };
        });

        vm.routesList = routesList.map(route => {
            route.configuration.interface = route.configuration.interface || ANY_INTERFACE_OPTION.id;

            const destination = routesToolsService.getRouteDestination(route.configuration, route.type);

            route.view = {
                destination: destination === DEFAULT_ROUTE
                    ? vm.l10n.defaultRoute
                    : destination,
                gateway: route.configuration.gateway,
                interface: vm.missingInterfaceIds.includes(route.interfaceId)
                    ? vm.l10n.unknownInterface
                    : vm.interfaceIdToLabelMap[route.interfaceId],
                auto: route.auto
                    ? vm.l10n.yes
                    : vm.l10n.no,
                comment: route.configuration.comment || '',
                importStatus: getRouteImportStatus({
                    route,
                    missingInterfaceIds: vm.missingInterfaceIds,
                    deviceRoutesList: vm.deviceRoutesList,
                }),
            };

            return route;
        });

        vm.data = routesList;
        vm.interfaceOptions = routesToolsService.getSuitableInterfaceOptions(showInterfaceData);

        vm.isVisible = true;
    });

    callOnDestroy.push(unbinder);

    vm.onReplacementSelected = (replacementId, oldValue, selectboxName) => {
        const missingInterfaceIndex = _
            .chain(selectboxName)
            .split('__')
            .last()
            .value();

        const missingInterfaceId = _.get(vm.missingInterfaceList, [Number(missingInterfaceIndex), 'interfaceId'], '');

        vm.interfaceReplacements[missingInterfaceId] = replacementId;

        vm.routesList = vm.routesList.map(route => {
            if (!route.interfaceId) {
                return route;
            }

            if (vm.interfaceReplacements[route.interfaceId]) {
                const interfaceId = vm.interfaceReplacements[route.interfaceId];

                route.configuration.interface = interfaceId;
                route.interfaceId = interfaceId;
                route.interfaceLabel = vm.interfaceIdToLabelMap[interfaceId];
                route.view.interface = vm.interfaceIdToLabelMap[interfaceId];
                route.view.importStatus = getRouteImportStatus({
                    route,
                    missingInterfaceIds: vm.missingInterfaceIds,
                    deviceRoutesList: vm.deviceRoutesList,
                });
            }

            return route;
        });
    };

    vm.importRoutes = () => {
        const routeConfigurations = vm.routesList.map(item => item.configuration);

        return routesToolsService.saveRoutes(routeConfigurations)
            .then(() => $rootScope.$broadcast(RELOAD_ROUTES))
            .finally(() => vm.close());
    };

    vm.close = () => {
        vm.isVisible = false;

        resetPopupState();
    };

    $scope.$on('$destroy', () => {
        callOnDestroy.forEach(callback => callback());
    });
}
