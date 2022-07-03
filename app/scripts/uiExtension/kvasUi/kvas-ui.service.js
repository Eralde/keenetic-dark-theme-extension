import * as _ from 'lodash';
import {getAngularService} from '../../lib/ndmUtils';

const KVAS_BACKEND_SETTINGS = 'KDTE_KVAS_BACKEND_SETTINGS';
const KVAS_BACKEND_DEFAULTS = {
    address: '',
    login: '',
    password: '',
};

export const kvasUiService = (function() {
    const router = getAngularService('router');

    // const credentials = btoa('foo:bar');
    // const headers = {
    //     'Authorization' : `Basic ${credentials}`,
    //     'Content-Type': 'application/json',
    // };
    //
    // const BASE_URL = `http://${window.location.hostname}:89`;
    // const KVAS_BACKEND_DEFAULTS = {
    //     address: '',
    //     login: '',
    //     password: '',
    // };

    let servicetag = '';

    const readBackendSettings = () => {
        return router.get('show/identification').then(showIdentification => {
            servicetag = _.get(showIdentification, 'servicetag', '');

            const storedData = localStorage.getItem(KVAS_BACKEND_SETTINGS);
            const defaults = _.cloneDeep(KVAS_BACKEND_DEFAULTS);

            if (!storedData) {
                return defaults;
            }

            const storedJson = JSON.parse(storedData);

            return _.get(storedJson, [servicetag], defaults);
        });
    };

    const storeBackendSettings = (settings) => {
        const storedData = localStorage.getItem(KVAS_BACKEND_SETTINGS) || '{}';
        const storedJson = JSON.parse(storedData);

        const updatedData = _.set(
            storedJson,
            [servicetag],
            settings,
        );

        localStorage.setItem(KVAS_BACKEND_SETTINGS, JSON.stringify(updatedData));
    };

    const getBackendConnector = ({address, login, password}) => {
        const headers = {
            'Content-Type': 'application/json',
            'mode': 'no-cors',
        };

        if (login && password) {
            const credentials = btoa(`${login}:${password}`);

            headers['Authorization'] = `Basic ${credentials}`;
        }

        const query = (resource, method, data = {}) => {
            const body = JSON.stringify(data)

            const options = method === 'POST'
                ? {headers, body, method}
                : {headers, method};

            return fetch(`${address}/${resource}`, options)
                .then(response => response.json())
        }

        return {
            query,
        };
    };

    const testConnector = (connector) => connector.query('');

    const getUnblockList = (connector) => connector.query('unblock-list');
    const addDomainToUnblockList = (connector, domain) => connector.query('unblock-list', 'POST', {domain});

    return {
        readBackendSettings,
        storeBackendSettings,
        getBackendConnector,

        testConnector,
        getUnblockList,
        addDomainToUnblockList,
    };
})();