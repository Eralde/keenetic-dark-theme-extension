import * as _ from 'lodash';
import {getAngularService, getTemplate} from '../lib/ndmUtils';
import {PORT_FORWARDING_TEMPLATE_PATH} from '../lib/constants';
import {logWarning} from '../lib/log';
import {createDocumentFragmentFromString, getDocumentFragmentInnerHtml} from '../lib/domUtils';
import toolbarTemplate from '../../pages/ui/port-forwarding-tools/port-forwarding-toolbar.html';

const injectPortForwardingToolbarTemplate = () => {
    const $templateCache = getAngularService('$templateCache');
    const portForwardingTemplate = getTemplate(PORT_FORWARDING_TEMPLATE_PATH);

    if (!portForwardingTemplate) {
        logWarning('failed to get port forwarding page template');

        return;
    }

    const fragment = createDocumentFragmentFromString(portForwardingTemplate);
    const forwardingTable = fragment.querySelector('.action-link');
    const toolbarFragment = createDocumentFragmentFromString(toolbarTemplate);

    forwardingTable.after(toolbarFragment);

    const fullTemplate = getDocumentFragmentInnerHtml(fragment);

    $templateCache.put(PORT_FORWARDING_TEMPLATE_PATH, fullTemplate);
}

export const portForwardingToolbarExtension = {
    onInit: injectPortForwardingToolbarTemplate,
    onLoad: _.noop,
    onDestroy: _.noop,
};