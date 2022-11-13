import * as _ from 'lodash';
import {logWarning} from '../../lib/log';
import * as ndmUtils from '../../lib/ndmUtils';
import {NDM_PAGE_SELECTOR} from '../../lib/constants';
import {portForwardingToolsService, TOOLBAR_ROOT_ELEMENT_SELECTOR} from './port-forwarding-tools.service';
import {getL10n} from '../../lib/l10nUtils';
import {onLanguageChange} from '../../lib/ndmUtils';

export function PortForwardingToolbarController() {
    const element = angular.element(document.querySelector(TOOLBAR_ROOT_ELEMENT_SELECTOR));

    if (!element) {
        logWarning(`Failed to get toolbar root element (${TOOLBAR_ROOT_ELEMENT_SELECTOR})`);

        return Promise.reject();
    }

    const vm = this;

    const updateL10n = () => {
        vm.l10n = {
            exportSelectedBtnLabel: getL10n('RoutesToolbarExportSelectedBtnLabel'),
            deleteSelectedBtnLabel: getL10n('RoutesToolbarDeleteSelectedBtnLabel'),
            importBtnLabel: 'Import',
            assignScheduleSelectboxLabel: 'Assign schedule',
        };
    };

    vm.selectedRulesSchedule = '';
    vm.selectedRulesToggleValue = false;

    const notification = ndmUtils.getAngularService('notification');
    const $rootScope = ndmUtils.getAngularService('$rootScope');

    const $scope = angular.element(document.querySelector(NDM_PAGE_SELECTOR)).scope();
    const pageController = $scope.vm;

    const rulesTable = pageController.list;

    rulesTable.selectedRulesMap = {};

    rulesTable.getSelectedRulesCount = () => {
        return _
            .chain(rulesTable.selectedRulesMap)
            .pickBy()
            .size()
            .value();
    };

    rulesTable.getSelectedRules = () => {
        return rulesTable.items
            .filter(item => rulesTable.selectedRulesMap[item.index]);
    };

    const updateOnRuleSelectionChange = () => {
        rulesTable.selectedRulesCount = rulesTable.getSelectedRulesCount();
        rulesTable.columns.isSelected.checkbox.model = rulesTable.selectedRulesCount === rulesTable.items.length;

        vm.selectedRulesToggleValue = rulesTable.getSelectedRules().every(rule => rule.enabled);
    }

    rulesTable.deselectAll = () => {
        rulesTable.items.forEach(row => {
            row.isSelected = false;
        });

        rulesTable.selectedRulesMap = {};

        updateOnRuleSelectionChange();
    };

    rulesTable.selectAll = () => {
        rulesTable.items.forEach(row => {
            row.isSelected = true;
        });

        rulesTable.selectedRulesMap = _.reduce(
            rulesTable.items,
            (acc, row) => ({...acc, [row.index]: true}),
            {},
        );

        updateOnRuleSelectionChange();
    };

    rulesTable.columns = {
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
                        rulesTable.selectAll();
                    } else {
                        rulesTable.deselectAll();
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
        ...rulesTable.columns,
    };

    vm.toggleSelectedRules = (value) => {
        const selectedIndexes = rulesTable.items
            .filter(item => rulesTable.selectedRulesMap[item.index])
            .map(item => item.index);

        return portForwardingToolsService.toggleItems(selectedIndexes, value)
            .then(() => {
                selectedIndexes.forEach((index) => {
                    const rule = rulesTable.items.find(item => item.index === index);

                    if (!rule) {
                        return;
                    }

                    rule.enabled = value;
                });

                vm.selectedRulesToggleValue = value;
            });
    };

    $scope.$watch('vm.list.items', (newValue) => {
        if (!_.isArray(newValue)) {
            return;
        }

        newValue.forEach(row => {
            row.isSelected = _.get(rulesTable.selectedRulesMap, row.index, false);

            if (_.has(row, 'onCheckboxToggle')) {
                return;
            }

            row.onCheckboxToggle = (oldVal) => {
                rulesTable.selectedRulesMap[row.index] = !oldVal;

                updateOnRuleSelectionChange();
            };
        });

        updateOnRuleSelectionChange();
    });

    updateL10n();
    onLanguageChange(updateL10n);
}