import * as _ from 'lodash';
import {getAngularService} from '../../lib/ndmUtils';

export const TOOLBAR_ROOT_ELEMENT_SELECTOR = '.port-forwarding-toolbar';

const IP_STATIC = 'ip.static';

export const portForwardingToolsService = (function() {
    const $q = getAngularService('$q');
    const utils = getAngularService('utils');
    const router = getAngularService('router');
    const ipV4Service = getAngularService('ipV4Service');
    const interfaces = getAngularService('interfaces');
    // const routesService = getAngularService('routesService');

    const sendIpStaticQuery = (queryData) => router.postAndSave(_.set({}, IP_STATIC, queryData));

    const toggleItems = (hashList, toState) => {
        const queryList = hashList.map((index) => {
            const data = {
                index,
                disable: !toState,
            };

            return _.set({}, IP_STATIC, data);
        });

        return router.postAndSave(queryList);
    };

    return {
        toggleItems,
    };
})();