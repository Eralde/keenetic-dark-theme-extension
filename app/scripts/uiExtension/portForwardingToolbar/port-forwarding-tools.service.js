import * as _ from 'lodash';
import {getAngularService} from '../../lib/ndmUtils';

export const TOOLBAR_ROOT_ELEMENT_SELECTOR = '.port-forwarding-toolbar';
export const IMPORT_POPUP_ROOT_ELEMENT_SELECTOR = '.port-forwarding-import-popup';

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

    const prepareTableRowsForExport = (rows, showInterfaceData) => {
        const interfaceIdToLabelMap = interfaces.getInterfaceIdToLabelMap(showInterfaceData);

        return rows.map(item => {
            const {raw} = item;

            // Compatibility with pre-3.9 firmware which can return interface `rename`
            // in the `interface` field of an `ip static` record
            const showInterfaceItem = _.find(
                showInterfaceData,
                item => item.id === raw.interface || item['interface-name'] === raw.interface,
            );

            const id = _.get(showInterfaceItem, 'id', raw.interface);
            const label = interfaceIdToLabelMap[id] || id;

            return {
                ...raw,
                'interface': id,
                'interfaceLabel': label,
            };
        });
    }

    return {
        toggleItems,

        prepareTableRowsForExport,
    };
})();
