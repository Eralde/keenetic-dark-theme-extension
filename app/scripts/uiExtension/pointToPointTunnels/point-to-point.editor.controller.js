import * as _ from 'lodash';
import {getAngularService} from '../../lib/ndmUtils';
import {pointToPointService} from './point-to-point.service';

const ROOT_ELEMENT_SELECTOR = '.point-to-point-editor';

// Do not reference any services as the 'controller' parameters -- this will result in an injector error
export function PointToPointEditorController() {
    const vm = this;

    const element = angular.element(document.querySelector(ROOT_ELEMENT_SELECTOR));

    if (!element) {
        console.warn(`Failed to get section root element (${ROOT_ELEMENT_SELECTOR})`);

        return;
    }

    const $scope = element.scope();
    const parentController = $scope.$parent.vm;

    const modal = getAngularService('modal');
    const otherConnectionsService = getAngularService('otherConnectionsService');
    const requester = otherConnectionsService.requester;

    const {
        TUNNEL_TYPE,
        IS_IPSEC_AVAILABLE
    } = pointToPointService;

    vm.TUNNEL_TYPE = TUNNEL_TYPE;
    vm.IS_IPSEC_AVAILABLE = IS_IPSEC_AVAILABLE;

    vm.isLocked = false;
    vm.isVisible = false;

    vm.model = {};
    vm.options = {
        interface: [],
        type: pointToPointService.getTunnelTypeOptions(),
    };

    vm.openEditor = (connectionModel) => {
        if (vm.isVisible) {
            return;
        }

        console.log(parentController.defaultInterfaceId);

        vm.options.interface = parentController.interfaceOptionsList;
        vm.defaultInterfaceId = parentController.defaultInterfaceId;
        vm.model = connectionModel;

        requester.stopPolling();

        vm.isVisible = true;
    }

    vm.closeEditor = () => {
        vm.isVisible = false;
        requester.startPolling();
    }

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
        return vm.openEditor(pointToPointService.getDefaultTunnelModel());
    };

    $scope.$on(pointToPointService.EVENTS.OPEN_EDITOR, ($event, row) => {
        console.log(row);
    });
}
