import * as _ from 'lodash';
import {logWarning} from '../lib/log';
import {getAngularService, getTemplate} from '../lib/ndmUtils';
import {STATIC_ROUTES_TEMPLATE_PATH} from '../lib/constants';
import toolbarTemplate from '../../pages/ui/routes-tools/routes-toolbar.html';
import ipLookupTemplate from '../../pages/ui/routes-tools/ip-lookup.html';
import importPopupTemplate from '../../pages/ui/routes-tools/routes-import-popup.html';
import {createDocumentFragmentFromString, getDocumentFragmentInnerHtml} from '../lib/domUtils';

const injectRoutesToolbarSectionTemplate = () => {
    const $templateCache = getAngularService('$templateCache');
    const staticRoutesTemplate = getTemplate(STATIC_ROUTES_TEMPLATE_PATH);

    if (!staticRoutesTemplate) {
        logWarning('failed to get static routes page template');

        return;
    }

    const fragment = createDocumentFragmentFromString(staticRoutesTemplate);
    const buttonsRow = fragment.querySelector('.buttons-row');
    const routesTableWrapper = fragment.querySelector('.static-routes-list');

    if (!buttonsRow) {
        logWarning('failed to determine proper place to inject routes toolbar template');

        return;
    }

    const toolbarFragment = createDocumentFragmentFromString(toolbarTemplate);
    const importPopupFragment = createDocumentFragmentFromString(importPopupTemplate);

    buttonsRow.after(toolbarFragment);

    const ipLookupFragment = createDocumentFragmentFromString(ipLookupTemplate);

    routesTableWrapper.before(ipLookupFragment);
    routesTableWrapper.after(importPopupFragment);

    const fullTemplate = getDocumentFragmentInnerHtml(fragment);

    $templateCache.put(STATIC_ROUTES_TEMPLATE_PATH, fullTemplate);
}

export const routesToolbarExtension = {
    onInit: injectRoutesToolbarSectionTemplate,
    onLoad: _.noop,
    onDestroy: _.noop,
};
