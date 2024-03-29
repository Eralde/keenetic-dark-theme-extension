import * as _ from 'lodash';
import sectionTemplate from '../../pages/ui/point-to-point-tunnels/point-to-point-tunnels-section.html';
import editorTemplate from '../../pages/ui/point-to-point-tunnels/point-to-point-tunnels-editor.html';
import {getAngularService, getTemplate} from '../lib/ndmUtils';
import {OTHER_CONNECTIONS_TEMPLATE_PATH} from '../lib/constants';
import {logWarning} from '../lib/log';

const EDITOR_INJECTION_POINT = '<!-- EDITOR -->';

export const injectPointToPointSectionTemplate = () => {
    const $templateCache = getAngularService('$templateCache');
    const otherConnectionsTemplate = getTemplate(OTHER_CONNECTIONS_TEMPLATE_PATH);

    const errMsg = 'failed to determine proper place to inject point-to-point tunnels section';

    if (!otherConnectionsTemplate || otherConnectionsTemplate.includes('PointToPointController')) {
        logWarning(errMsg);

        return;
    }

    if (otherConnectionsTemplate.includes('point-to-point.section.html')) { // Section is already present in the web UI
        return;
    }

    const previousSectionIncludeIndex = otherConnectionsTemplate.indexOf('ppp.section.html');

    if (previousSectionIncludeIndex === -1) {
        logWarning(errMsg);

        return;
    }

    const closingTag = '</div>';
    const injectIndex = otherConnectionsTemplate.indexOf(closingTag, previousSectionIncludeIndex) + closingTag.length;

    const prefix = otherConnectionsTemplate.substr(0, injectIndex);
    const suffix = otherConnectionsTemplate.substr(injectIndex);

    const fullTemplate = sectionTemplate.replace(EDITOR_INJECTION_POINT, editorTemplate);

    $templateCache.put(OTHER_CONNECTIONS_TEMPLATE_PATH, prefix + fullTemplate + suffix);
}

export const pointToPointSection = {
    onInit: injectPointToPointSectionTemplate,
    onLoad: _.noop,
    onDestroy: _.noop,
}
