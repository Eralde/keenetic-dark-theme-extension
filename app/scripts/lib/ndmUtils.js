import {
    NO_TAG,
    LOGIN_STATE,
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
    let delayCoeff = 1;

    const recheckAuth = () => isAuthenticated().then(result => {
        if (!result) {
            const delay = Math.floor(delayCoeff * 1000);

            setTimeout(recheckAuth, delay);
            delayCoeff = delayCoeff * 1.2;

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
