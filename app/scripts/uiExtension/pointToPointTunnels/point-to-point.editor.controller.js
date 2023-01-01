import * as _ from 'lodash';
import {getAngularService, onLanguageChange} from '../../lib/ndmUtils';
import {getL10n} from '../../lib/l10nUtils';
import {logWarning} from '../../lib/log';
import {pointToPointService} from './point-to-point.service';

const ROOT_ELEMENT_SELECTOR = '.point-to-point-editor';

// Do not reference any services as the 'controller' parameters -- this will result in an injector error
export function PointToPointEditorController() {
    const vm = this;
    const element = angular.element(document.querySelector(ROOT_ELEMENT_SELECTOR));

    if (!element) {
        logWarning(`Failed to get section root element (${ROOT_ELEMENT_SELECTOR})`);

        return;
    }

    const $scope = element.scope();
    const parentController = $scope.$parent.vm;

    const ifaceIpModel = getAngularService('ifaceIpModel');
    const modal = getAngularService('modal');
    const $timeout = getAngularService('$timeout');
    const otherConnectionsService = getAngularService('otherConnectionsService');
    const requester = otherConnectionsService.requester;

    const {
        TUNNEL_TYPE,
        IS_IPSEC_AVAILABLE,
        LOCAL_SOURCE,
    } = pointToPointService;

    vm.TUNNEL_TYPE = TUNNEL_TYPE;
    vm.IS_IPSEC_AVAILABLE = IS_IPSEC_AVAILABLE;

    vm.isLocked = false;
    vm.isVisible = false;

    vm.l10n = {};
    vm.model = {};
    vm.interfaceOptions = [];
    vm.interfaceIdToLabelMap = {};
    vm.options = {
        mask: ifaceIpModel.getMasksSelectOptions(),
        type: pointToPointService.getTunnelTypeOptions(),
        source: [],
    };

    const updateL10n = () => {
        vm.l10n = {
            createConnectionBtn: getL10n('otherConnections_pointToPoint_createConnectionBtn'),
            header: getL10n('otherConnections_pointToPoint_editor_header'),
            description: getL10n('otherConnections_pointToPoint_editor_description'),
            deleteConnectionBtn: getL10n('otherConnections_pointToPoint_editor_deleteConnectionBtn'),
            field_description: getL10n('otherConnections_pointToPoint_editor_field_description'),
            field_isGlobal_label: getL10n('otherConnections_pointToPoint_editor_field_isGlobal_label'),
            field_isGlobal_hint: getL10n('otherConnections_pointToPoint_editor_field_isGlobal_hint'),
            field_type_label: getL10n('otherConnections_pointToPoint_editor_field_type_label'),
            field_type_option_ipip: getL10n('otherConnections_pointToPoint_editor_field_type_option_ipip'),
            field_type_option_gre: getL10n('otherConnections_pointToPoint_editor_field_type_option_gre'),
            field_type_option_eoip: getL10n('otherConnections_pointToPoint_editor_field_type_option_eoip'),
            field_eoipId_label: getL10n('otherConnections_pointToPoint_editor_field_eoipId_label'),
            field_eoipId_hint: getL10n('otherConnections_pointToPoint_editor_field_eoipId_hint'),
            field_ipAddress: getL10n('otherConnections_pointToPoint_editor_field_ipAddress'),
            field_mask: getL10n('otherConnections_pointToPoint_editor_field_mask'),
            field_interfaceId_label: getL10n('otherConnections_pointToPoint_editor_field_interfaceId_label'),
            field_interfaceId_numberIsUsedError: getL10n('otherConnections_pointToPoint_editor_field_interfaceId_numberIsUsedError'),
            field_ipsecIsEnabled_label: getL10n('otherConnections_pointToPoint_editor_field_ipsecIsEnabled_label'),
            field_ipsecIsEnabled_hint: getL10n('otherConnections_pointToPoint_editor_field_ipsecIsEnabled_hint'),
            field_ipsecForceEncaps_label: getL10n('otherConnections_pointToPoint_editor_field_ipsecForceEncaps_label'),
            field_ipsecForceEncaps_hint: getL10n('otherConnections_pointToPoint_editor_field_ipsecForceEncaps_hint'),
            field_ipsecPsk: getL10n('otherConnections_pointToPoint_editor_field_ipsecPsk'),
            field_ipsecIkev2_label: getL10n('otherConnections_pointToPoint_editor_field_ipsecIkev2_label'),
            field_ipsecIkev2_hint: getL10n('otherConnections_pointToPoint_editor_field_ipsecIkev2_hint'),
            field_ipsecWaitForRemote_label: getL10n('otherConnections_pointToPoint_editor_field_ipsecWaitForRemote_label'),
            field_ipsecWaitForRemote_hint: getL10n('otherConnections_pointToPoint_editor_field_ipsecWaitForRemote_hint'),
            field_remote: getL10n('otherConnections_pointToPoint_editor_field_remote'),
            field_source_label: getL10n('otherConnections_pointToPoint_editor_field_source_label'),
            field_source_requiredHint: getL10n('otherConnections_pointToPoint_editor_field_source_requiredHint'),
            field_source_option_manual: getL10n('otherConnections_pointToPoint_editor_field_source_option_manual'),
            field_source_option_auto: getL10n('otherConnections_pointToPoint_editor_field_source_option_auto'),
            field_sourceIpAddress: getL10n('otherConnections_pointToPoint_editor_field_sourceIpAddress'),
        };
    };

    updateL10n();

    onLanguageChange(() => updateL10n());

    vm.LOCAL_SOURCE = LOCAL_SOURCE;
    vm.TUNNEL_TYPE = TUNNEL_TYPE;
    vm.IS_IPSEC_AVAILABLE = IS_IPSEC_AVAILABLE;

    vm.isVisible = false;
    vm.model = {};
    vm.interfaceIdToLabelMap = {};

    // validation data
    vm.usedInterfaceIdList = [];
    vm.restrictedSubnetsList = [];

    vm.options = {
        type: pointToPointService.getTunnelTypeOptions(),
        mask: ifaceIpModel.getMasksSelectOptions(),
        source: [],
    };

    vm.sourceHint = '';
    vm.isSourceValid = true;
    vm.isServerModeEnabled = false;

    vm.onTypeChange = () => {
        _.invoke(vm, 'form.interfaceIdSubform.PointToPointEditor__interfaceId.revalidate');
    };

    vm.interfaceIdValidator = (interfaceId) => {
        const {type} = vm.model;
        const usedIds = vm.usedInterfaceIdList
            .filter(item => item.startsWith(type))
            .map(item => item.replace(type, ''));

        return usedIds.includes(interfaceId)
            ? vm.l10n.field_interfaceId_numberIsUsedError
            : '';
    };

    vm.ui = {
        isLocked: false,

        lock: () => {
            vm.ui.isLocked = true;

            return $q.when(true);
        },

        unlock: () => {
            vm.ui.isLocked = false;

            return $q.when(true);
        },
    };

    vm.isPristine = (fieldName) => _.get(vm, `form.${fieldName}.$pristine`, false);
    vm.isValid = (fieldName) => _.get(vm, `form.${fieldName}.$valid`, false);
    vm.revalidate = (fieldName) => _.invoke(vm, `form.${fieldName}.revalidate`);
    vm.setPristine = (fieldName) => _.invoke(vm, `form.${fieldName}.$setPristine`);
    vm.setFormPristine = () => _.invoke(vm, 'form.$setPristine');

    vm.onIpsecToggle = (isEnabled) => {
        if (isEnabled) {
            vm.onIsServerToggle(vm.model.ipsec.isServer);
        } else {
            vm.onIsServerToggle(false);
        }
    };

    vm.onIsServerToggle = (isEnabled) => {
        vm.isServerModeEnabled = isEnabled;

        // disallow: no IPsec + `tunnel source auto` combination
        vm.isSourceValid = vm.model.source !== LOCAL_SOURCE.AUTO
            || (vm.model.ipsec.isEnabled && isEnabled);

        vm.sourceHint = vm.isSourceValid
            ? ''
            : getL10n('otherConnections_pointToPoint_editor_field_source_requiredHint');
    };

    vm.onSourceChange = (value) => {
        if (vm.model.ipsec.isEnabled && vm.model.ipsec.isServer) {
            return;
        }

        vm.isSourceValid = value !== LOCAL_SOURCE.AUTO;
    };

    const getDataFromParentController = (idToExclude) => {
        vm.interfaceIdToLabelMap = parentController.interfaceIdToLabelMap;
        vm.interfaceOptions = parentController.interfaceOptions;

        vm.options.source = [
            {
                id: LOCAL_SOURCE.AUTO,
                label: vm.l10n.field_source_option_auto,
            },
            {
                id: LOCAL_SOURCE.MANUAL,
                label: vm.l10n.field_source_option_manual,
            },
            ..._.cloneDeep(parentController.interfaceOptions),
        ];

        vm.usedInterfaceIdList = parentController.usedInterfaceIdList
            .filter(item => item !== idToExclude);

        vm.restrictedSubnetsList = _.cloneDeep(parentController.usedSubnets)
            .filter(item => item.ifaceId !== idToExclude)
            .map(item => {
                return {
                    ...item,
                    label: _.get(vm.interfaceIdToLabelMap, item.ifaceId, ''),
                };
            });
    };

    vm.openEditor = (connectionModel) => {
        if (vm.isVisible) {
            return;
        }

        vm.model = connectionModel;

        requester.stopPolling();

        vm.onIsServerToggle(vm.model.ipsec.isEnabled && vm.model.ipsec.isServer);

        $timeout(() => {
            vm.setFormPristine();
            vm.isVisible = true;
        });
    };

    vm.closeEditor = () => {
        vm.isVisible = false;
        vm.isLocked = false;
        vm.model = {};

        requester.startPolling();
    };

    vm.saveTunnel = () => {
        if (vm.isLocked) {
            return;
        }

        vm.isLocked = true;

        return pointToPointService.saveTunnel(vm.model).finally(() => {
            vm.closeEditor();
        });
    };

    vm.deleteTunnel = () => {
        return modal.confirm().then(() => {
            if (vm.isLocked) {
                return;
            }

            vm.isLocked = true;

            return pointToPointService.deleteTunnel(vm.model.id).finally(() => {
                vm.closeEditor();
            });
        });
    };

    vm.addNewTunnel = () => {
        getDataFromParentController('');

        const model = pointToPointService.getNewTunnelModel();

        return vm.openEditor(model);
    };

    $scope.$on(pointToPointService.EVENTS.POINT_TO_POINT__OPEN_EDITOR, ($event, row) => {
        getDataFromParentController(row.id);

        const model = pointToPointService.getTunnelModel({
            ...row.rawData,
            interfaceOptionsList: vm.interfaceOptions,
        });

        vm.openEditor(model);
    });
}
