import {
    NO_TAG,
    LOGIN_STATE,
    DASHBOARD_SWITCHPORTS_TEMPLATE_PATH,
    FW2X_BRANCHES,
    OLD_FW3X_BRANCHES,
    FW3X_WITHOUT_SWITCHPORT_OVERLOAD,
    NDM_TEXTAREA_TEMPLATE_PATH,
} from './constants.js';

import * as _ from 'lodash';

export const NOOP = _.noop;

export const getAngularService = (serviceName) => {
    if (!window.angular) {
        return null;
    }

    const injector = angular.element(document.querySelector('body')).injector();

    return injector.get(serviceName);
};

let $q = getAngularService('$q'),
    $transitions = getAngularService('$transitions'),
    $http = getAngularService('$http'),
    $state = getAngularService('$state'),
    router = getAngularService('router');

export const waitUntilAuthenticated = () => {
    const deferred = $q.defer();

    let unbinder = _.noop;
    let authOk = false;
    let delay = 1;

    const recheckAuth = () => isAuthenticated().then(result => {
        if (!result) {
            const delayInMs = Math.floor(delay * 1000);

            setTimeout(recheckAuth, delayInMs);
            delay = delay * 1.2;

            return;
        }

        authOk = true;
        unbinder();
        deferred.resolve();

        return result;
    });

    const addOnSuccessHook = () => {
        unbinder = _.invoke($transitions, 'onSuccess', {from: LOGIN_STATE}, () => {
            if (!authOk) {
                recheckAuth();
            }
        });
    }

    isAuthenticated().then(result => {
        if (result) {
            authOk = true;

            return deferred.resolve();
        }

        const stateName = $state.current.name;

        if (!stateName || stateName === LOGIN_STATE) {
            addOnSuccessHook();
        } else {
            const logoutHook = _.invoke($transitions, 'onSuccess', {to: LOGIN_STATE}, () => {
                logoutHook();
                addOnSuccessHook();
            });
        }
    });

    return deferred.promise;
}

export const isAuthenticated = () => {
    const deferred = $q.defer();
    const authUrl = window.NDM.rciPrefix + 'auth';

    $http
        .get(authUrl, {timeout: 0})
        .then(
            () => deferred.resolve(true),
            () => deferred.resolve(false),
        );

    return deferred.promise;
}

const DEFAULT_GET_SERVICE_TAG_TIMEOUT = 5000;

export const getServiceTag = (timeout = DEFAULT_GET_SERVICE_TAG_TIMEOUT) => {
    const deferred = $q.defer();

    setTimeout(() => {
        deferred.resolve(NO_TAG);
    }, timeout);

    router
        .get({
            url: 'show/identification',
            noRetry: true
        })
        .then(idData => deferred.resolve(_.get(idData, 'servicetag', NO_TAG)));

    return deferred.promise;
};

export const ensureServiceTag = () => {
    const deferred = $q.defer();

    let timeout = DEFAULT_GET_SERVICE_TAG_TIMEOUT;

    const queryServiceTag = () => {
        getServiceTag(timeout).then(data => {
            if (data === NO_TAG) {
                timeout += 1000;

                queryServiceTag();
            } else {
                deferred.resolve(data);
            }
        })
    };

    queryServiceTag();

    return deferred.promise;
}

export const getL10n = (id, args = {}) => {
    return getAngularService('$translate').instant(id, args);
};

export const onLanguageChange = (callback) => {
    getAngularService('$rootScope')
        .$on('$translateChangeSuccess', () => setTimeout(callback));
};


const _getRequestData = (requestObj) => {
    return angular.isDefined(requestObj.url)
        ? requestObj.data
        : requestObj;
};

export const requestContainsPath = (requestObj, path) => {
    const reqData = _getRequestData(requestObj);

    return (reqData instanceof Array)
        ? reqData.some(el => _.has(el, path))
        : _.has(reqData, path);
};

export const getPathIndexInRequest = (requestObj, path) => {
    const reqData = _getRequestData(requestObj);

    if (!(reqData instanceof Array)) {
        return '';
    }

    const index = _.findIndex(reqData, el => _.has(el, path));

    return index === -1 ? '' : `[${index}]`;
};

export const addLinkToMenuSection = ({menu, menuSectionId, linkTitle, linkSref}) => {
    if (!_.get(menu, [menuSectionId, 'points'])) {
        return;
    }

    const sectionPoints = menu[menuSectionId].points;

    if (sectionPoints[linkSref]) {
        return;
    }

    sectionPoints[linkSref] = {
        menuTitle: linkTitle,
        sref: linkSref,
    };
};

export const addUiExtension = (state, extendStateFn, removeExtensionFn = _.noop) => {
    $transitions.onSuccess(
        {
            to: state,
        },
        extendStateFn,
    );

    $transitions.onSuccess(
        {
            from: state,
        },
        removeExtensionFn,
    );

    if (_.get($state, 'current.name') === state) {
        extendStateFn();
    }
};

export const getTemplate = (path) => {
    const $templateCache = getAngularService('$templateCache');

    return _.cloneDeep($templateCache.get(path));
}

const NDM_SWITCHPORT_CONTANIER_TAG = 'ndm-switchport-container';

export const getDashboardSwitchportsTemplate = () => {
    const wholeTemplate = getTemplate(DASHBOARD_SWITCHPORTS_TEMPLATE_PATH);

    if (!_.isString(wholeTemplate)) {
        return false;
    }

    const chunks = wholeTemplate.split(NDM_SWITCHPORT_CONTANIER_TAG);

    if (chunks.length !== 3) {
        return false;
    }

    const middleChunk = chunks[1];

    const template = middleChunk.substr(1, middleChunk.length - 3);
    const prefix = `${chunks[0]}${NDM_SWITCHPORT_CONTANIER_TAG}>`;
    const suffix =  `</${NDM_SWITCHPORT_CONTANIER_TAG}${chunks[2]}`;

    return {
        template,
        prefix,
        suffix,
    };
}

export const setDashboardSwitchportsTemplate = ({prefix, suffix, template}) => {
    const $templateCache = getAngularService('$templateCache');

    $templateCache.put(DASHBOARD_SWITCHPORTS_TEMPLATE_PATH, prefix + template + suffix);
}

export const toggleNdmTextareaClass = ({className, state, insertAfterClass}) => {
    const $templateCache = getAngularService('$templateCache');
    const template = getTemplate(NDM_TEXTAREA_TEMPLATE_PATH);

    const updatedTemplate = state
        ? template.replace(className, '')
        : template.replace(`class="${insertAfterClass}"`, `class="${insertAfterClass} ${className}"`);

    $templateCache.put(NDM_TEXTAREA_TEMPLATE_PATH, updatedTemplate);
}

const _getElementController = (selector, deferred) => {
    const element = angular.element(document.querySelector(selector));
    const controller = element.controller();

    if (controller) {
        deferred.resolve(controller);
    } else {
        setTimeout(() => _getElementController(selector, deferred), 300);
    }
}

const _getElementScope = (selector, deferred) => {
    const element = angular.element(document.querySelector(selector));
    const scope = element.scope();

    if (scope) {
        deferred.resolve(scope);
    } else {
        setTimeout(() => _getElementScope(selector, deferred), 300);
    }
}

export const getElementController = (selector, _deferred = null) => {
    const $q = getAngularService('$q');
    const deferred = $q.defer();

    _getElementController(selector, deferred);

    return deferred.promise;
}

export const getElementScope = (selector, _deferred = null) => {
    const $q = getAngularService('$q');
    const deferred = $q.defer();

    _getElementScope(selector, deferred);

    return deferred.promise;
}

export const getDashboardController = () => {
    return getElementController('.d-dashboard');
};

export const getSwitchportsCardController = () => {
    return getElementController('#card_switchports');
};

export const is2xVersion = (ndwVersion) => FW2X_BRANCHES.some(branch => ndwVersion.startsWith(branch));
export const is3xVersion = (ndwVersion) => {
    return OLD_FW3X_BRANCHES.some(branch => ndwVersion.startsWith(branch))
        || ndwVersion.startsWith('3.');
}

export const isSwitchportOverloadSupported = (ndwVersion) => {
    return is3xVersion(ndwVersion) && !FW3X_WITHOUT_SWITCHPORT_OVERLOAD.some(branch => ndwVersion.startsWith(branch));
}
