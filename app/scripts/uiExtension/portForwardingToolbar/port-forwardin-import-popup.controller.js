import {IMPORT_POPUP_ROOT_ELEMENT_SELECTOR} from './port-forwarding-tools.service';
import {logWarning} from '../../lib/log';

export function PortForwardingImportPopupController() {
    const element = angular.element(document.querySelector(IMPORT_POPUP_ROOT_ELEMENT_SELECTOR));

    if (!element) {
        logWarning(`Failed to get toolbar root element (${IMPORT_POPUP_ROOT_ELEMENT_SELECTOR})`);

        return Promise.reject();
    }

    const vm = this;

    console.log(vm);
}
