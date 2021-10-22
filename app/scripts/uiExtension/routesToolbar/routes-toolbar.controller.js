import * as _ from 'lodash';
import {logWarning} from '../../lib/log';
import {getL10n} from '../../lib/l10nUtils';
import * as ndmUtils  from '../../lib/ndmUtils';
import {routesToolsService} from './routes-tools.service';
import {onLanguageChange} from '../../lib/ndmUtils';

const ROOT_ELEMENT_SELECTOR = '.routes-toolbar';

export function RoutesToolbarController() {
    const element = angular.element(document.querySelector(ROOT_ELEMENT_SELECTOR));

    if (!element) {
        logWarning(`Failed to get toolbar root element (${ROOT_ELEMENT_SELECTOR})`);

        return;
    }

    const vm = this;

    const updateL10n = () => {
        vm.l10n = {
            exportSelectedBtnLabel: getL10n('RoutesToolbarExportSelectedBtnLabel'),
            deleteSelectedBtnLabel: getL10n('RoutesToolbarDeleteSelectedBtnLabel'),
            importBtnLabel: getL10n('RoutesToolbarImportBtnLabel'),
        };
    };

    const {
        OPEN_IMPORT_POPUP,
        RELOAD_ROUTES,
    } = routesToolsService.EVENTS;

    const $scope = element.scope();
    const $rootScope = ndmUtils.getAngularService('$rootScope');

    const modal = ndmUtils.getAngularService('modal');
    const utils = ndmUtils.getAngularService('utils');
    const interfaces = ndmUtils.getAngularService('interfaces');
    const notification = ndmUtils.getAngularService('notification');

    const pageController = ndmUtils.getAncestorScopeProperty($scope, 'SRC');
    const {routesTable} = pageController;

    const callOnDestroy = [];

    routesTable.selectedRowsCount = 0;
    routesTable.deselectAll = () => {
        routesTable.data.forEach(row => {
            row.isSelected = false;
        });

        routesTable.columns.isSelected.checkbox.model = false;
        routesTable.selectedRowsCount = 0;
    };

    routesTable.selectAll = () => {
        routesTable.data.forEach(row => {
            row.isSelected = true;
        });

        routesTable.columns.isSelected.checkbox.model = true;
        routesTable.selectedRowsCount = routesTable.data.length;
    };

    $scope.$watch('SRC.routesTable.data', (newValue) => {
        if (!_.isArray(newValue)) {
            return;
        }

        newValue.forEach(row => {
            if (_.has(row, 'onCheckboxToggle')) {
                return;
            }

            row.isSelected = false;
            row.onCheckboxToggle = (oldVal) => {
                const isEveryRowSelected = routesTable.selectedRowsCount === routesTable.data.length;

                routesTable.selectedRowsCount += oldVal ? -1 : 1;
                routesTable.columns.isSelected.checkbox.model = isEveryRowSelected;
            };
        });

        routesTable.selectedRowsCount = newValue.filter(item => item.isSelected).length;
        routesTable.columns.isSelected.checkbox.model = routesTable.selectedRowsCount === newValue.length;
    });

    routesTable.columns = {
        'isSelected': {
            title: false,
            width: 18,
            clickable: true,
            unsortable: true,
            checkbox: {
                model: false,
                disabled: false,
                onChange: (checkboxIsChecked) => {
                    if (checkboxIsChecked) {
                        routesTable.selectAll();
                    } else {
                        routesTable.deselectAll();
                    }
                },
            },
            directive: {
                name: 'ndm-checkbox',
                options: {
                    'label': '',
                    'model': 'row.isSelected',
                    'ng-attr-on-change': 'row.onCheckboxToggle(row.isSelected, row)',
                    'ng-attr-disabled': 'row.isLocked',
                    'name': 'rule-{{row.index}}-',
                },
            },
        },
        ...routesTable.columns,
    };

    updateL10n();
    onLanguageChange(updateL10n);

    vm.exportSelectedRoutes = () => {
        return routesToolsService.getShowInterfaceData().then(showInterfaceData => {
            const selectedRows = routesTable.data.filter(item => item.isSelected);
            const rawRciData = selectedRows.map(routesToolsService.stripNdwData);
            const interfaceIdToLabelMap = interfaces.getInterfaceIdToLabelMap(showInterfaceData);

            const routeList = rawRciData.map(route => {
                return routesToolsService.normalizeRouteData({
                    route,
                    showInterfaceData,
                    interfaceIdToLabelMap,
                });
            });

            const data = JSON.stringify(routeList, null, 2);
            const filename = routesToolsService.getExportFilename();

            utils.downloadAsFile(data, filename, 'application/json');
        });
    };

    vm.deleteSelectedRoutes = () => {
        return modal.confirm()
            .then(() => {
                const selectedRows = routesTable.data.filter(item => item.isSelected);
                const rawRciData = selectedRows.map(routesToolsService.stripNdwData);

                return routesToolsService.deleteRoutes(rawRciData);
            })
            .then(() => routesTable.loadRoutes());
    };

    vm.importRoutes = async (data) => {
        const fileReaderResult = await routesToolsService.readTextFile(data.file);

        if (fileReaderResult.error) {
            const messageTemplate = getL10n('RoutesToolbarImportReaderFailure');
            const message = utils.getTranslation(
                messageTemplate,
                null,
                {
                    file: data.file.name,
                },
            );

            notification.info(message);
            logWarning(fileReaderResult.error);

            return;
        }

        let routesList;

        try {
            routesList = JSON.parse(fileReaderResult.text);
        } catch (jsonError) {
            const messageTemplate = getL10n('RoutesToolbarImportJsonParseFailure');
            const message = utils.getTranslation(
                messageTemplate,
                null,
                {
                    file: data.file.name,
                },
            );

            notification.info(message);
            logWarning(jsonError);

            return;
        }

        $rootScope.$broadcast(
            OPEN_IMPORT_POPUP,
            routesList,
        );
    };

    callOnDestroy.push(
        $rootScope.$on(RELOAD_ROUTES, () => routesTable.loadRoutes()),
    );

    $scope.$on('$destroy', () => {
        callOnDestroy.forEach(callback => callback());
    });
}
