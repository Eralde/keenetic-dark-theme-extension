import * as _ from 'lodash';
import dateFormat from 'dateformat';
import {sharedData} from './state';
import * as CONSTANTS from './constants';

const DEFAULT_GET_SERVICE_TAG_TIMEOUT = 5000;

export const getAngularService = (serviceName) => {
    if (!window.angular) {
        return null;
    }

    const injector = angular.element(document.querySelector('body')).injector();

    return injector.get(serviceName);
};

const $rootScope = getAngularService('$rootScope');
const $q = getAngularService('$q');
const $transitions = getAngularService('$transitions');
const $http = getAngularService('$http');
const $state = getAngularService('$state');
const router = getAngularService('router');

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
        unbinder = _.invoke($transitions, 'onSuccess', {from: CONSTANTS.LOGIN_STATE}, () => {
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

        if (!stateName || stateName === CONSTANTS.LOGIN_STATE) {
            addOnSuccessHook();
        } else {
            const logoutHook = _.invoke($transitions, 'onSuccess', {to: CONSTANTS.LOGIN_STATE}, () => {
                logoutHook();
                addOnSuccessHook();
            });
        }
    });

    return deferred.promise;
};

export const callOnPageLoad = (callback) => {
    const $rootScope = getAngularService('$rootScope');
    const CONSTANT = getAngularService('CONSTANT');
    const PAGE_LOADED = _.get(CONSTANT, 'events.PAGE_LOADED');

    const unbinder = $rootScope.$on(PAGE_LOADED, () => {
        unbinder();

        callback();
    });
};

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
};

export const getServiceTag = (timeout = DEFAULT_GET_SERVICE_TAG_TIMEOUT) => {
    const deferred = $q.defer();

    setTimeout(() => {
        deferred.resolve(CONSTANTS.NO_TAG);
    }, timeout);

    router
        .get({
            url: 'show/identification',
            noRetry: true
        })
        .then(idData => deferred.resolve(_.get(idData, 'servicetag', CONSTANTS.NO_TAG)));

    return deferred.promise;
};

export const ensureServiceTag = () => {
    const deferred = $q.defer();

    let timeout = DEFAULT_GET_SERVICE_TAG_TIMEOUT;

    const queryServiceTag = () => {
        getServiceTag(timeout).then(data => {
            if (data === CONSTANTS.NO_TAG) {
                timeout += 1000;

                queryServiceTag();
            } else {
                deferred.resolve(data);
            }
        })
    };

    queryServiceTag();

    return deferred.promise;
};

export const getNgL10n = (id, args = {}) => {
    return getAngularService('$translate').instant(id, args);
};

export const onLanguageChange = (callback) => {
    return getAngularService('$rootScope')
        .$on('$translateChangeSuccess', () => setTimeout(callback));
};

export const forceScopeDigest = ($scope) => {
    if (!['$apply', '$digest'].includes(_.get($scope, '$root.$$phase'))) {
        $scope.$apply();
    }
};

export const isComponentInstalled = (componentName) => {
    const components = _.get(window, 'NDM.profile.components', {});

    return _.has(components, componentName);
};

export const isAnyComponentInstalled = (componentNames) => {
    return _.some(componentNames, name => isComponentInstalled(name));
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

export const addLinkToMenuSection = ({menu, menuSectionId, linkTitle, linkSref, srefParams}) => {
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
        srefParams: srefParams || {},
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
};

export const extractAndReplaceSwitchportsTemplate = (payload, templateDataProperty, templatePath) => {
    const _template = _.get(payload, [CONSTANTS.SWITCHPORT_TEMPLATE_DATA_KEY, templateDataProperty]);

    replaceSwitchportsTemplate(_template, templatePath);
};

export const replaceSwitchportsTemplate = (templateData, path) => {
    if (!templateData) {
        return;
    }

    const {prefix, suffix, template} = templateData;
    const $templateCache = getAngularService('$templateCache');

    $templateCache.put(path, prefix + template + suffix);
};

export const toggleNdmTextareaClass = ({className, state, insertAfterClass}) => {
    const SHARED_DATA_KEY = 'toggleNdmTextareaClassFailed';

    if (sharedData.get(SHARED_DATA_KEY)) {
        return;
    }

    const $templateCache = getAngularService('$templateCache');
    const template = getTemplate(CONSTANTS.NDM_TEXTAREA_TEMPLATE_PATH);

    if (!_.isString(template)) {
        console.warn('Keenetic Dark Theme Extension: failed to get ndm-textarea component template');
        sharedData.set(SHARED_DATA_KEY, true);

        return;
    }

    const updatedTemplate = state
        ? template.replace(className, '')
        : template.replace(`class="${insertAfterClass}"`, `class="${insertAfterClass} ${className}"`);

    $templateCache.put(CONSTANTS.NDM_TEXTAREA_TEMPLATE_PATH, updatedTemplate);
};

const _getElementController = (selector, deferred) => {
    const element = angular.element(document.querySelector(selector));
    const controller = element.controller();

    if (controller) {
        deferred.resolve(controller);
    } else {
        setTimeout(() => _getElementController(selector, deferred), 300);
    }
};

const _getElementScope = (selector, deferred) => {
    const element = angular.element(document.querySelector(selector));
    const scope = element.scope();

    if (scope) {
        deferred.resolve(scope);
    } else {
        setTimeout(() => _getElementScope(selector, deferred), 300);
    }
};

export const getElementController = (selector, _deferred = null) => {
    const $q = getAngularService('$q');
    const deferred = $q.defer();

    _getElementController(selector, deferred);

    return deferred.promise;
};

export const getElementScope = (selector, _deferred = null) => {
    const $q = getAngularService('$q');
    const deferred = $q.defer();

    _getElementScope(selector, deferred);

    return deferred.promise;
};

export const getDashboardController = () => {
    return getElementController('.d-dashboard');
};

export const getNdmPageController = () => {
    return getElementController(CONSTANTS.NDM_PAGE_SELECTOR);
};

export const getNdmPageScope = () => {
    return getElementScope(CONSTANTS.NDM_PAGE_SELECTOR);
};

export const isLegacyVersion = (ndwVersion) => {
    return CONSTANTS.FW2X_BRANCHES.some(branch => ndwVersion.startsWith(branch));
};

export const isModernVersion = (ndwVersion) => {
    return CONSTANTS.OLD_FW3X_BRANCHES.some(branch => ndwVersion.startsWith(branch))
        || ndwVersion.startsWith('3.')
        || ndwVersion.startsWith('4.');
};

export const compareVersions = (ver1, ver2) => {
    const toNumbersList = (str) => {
        // trim suffix for custom versions e.g. '3.7.2-41-....'
        const _str = str.split('-')[0];

        return _str
            .split('.')
            .map(Number)
            .filter(item => !isNaN(item));
    };

    const nums1 = toNumbersList(ver1);
    const nums2 = toNumbersList(ver2);
    const len = nums1.length;

    for (let i = 0; i < len; ++i) {
        if (nums1[i] < nums2[i]) {
            return -1;
        } else if (nums1[i] > nums2[i]) {
            return 1;
        }
    }

    return 0;
};

export const isCableDiagnosticsImplemented = (ndwVersion) => {
    return compareVersions(ndwVersion, '3.7.25') !== -1;
};

export const isSwitchportOverloadSupported = (ndwVersion) => {
    if (!isModernVersion(ndwVersion)) {
        return false;
    }

    const is3xBranchWithoutOverload = CONSTANTS.FW3X_WITHOUT_SWITCHPORT_OVERLOAD.some(branch => {
        const branchChunks = branch.split('.');
        const versionChunks = ndwVersion.split('.');

        return branchChunks.every((chunk, index) => chunk === versionChunks[index]);
    });

    return !is3xBranchWithoutOverload;
};

export const getPortInterfaceStatus = (port, showInterfaceData) => {
    return _.find(
        showInterfaceData,
        item => item.id === port.interfaceId || item['interface-name'] === port.port,
    );
};

export const getAncestorScopeProperty = ($scope, propName) => {
    let _$scope = $scope;

    while (_$scope.$parent) {
        if (_.has(_$scope, propName)) {
            return _$scope[propName];
        }

        _$scope = _$scope.$parent;
    }

    return null;
};

export const getDebouncedCallback = (callback, leading = true) => {
    return _.debounce(
        callback,
        150,
        {
            leading,
            maxWait: 400,
        },
    );
};

export const subscribeOnRootScopeEvent = ($scope, event, callback) => {
    $scope.$on('$destroy', $rootScope.$on(event, callback));
};

export const downloadAsFile = (data, fileName, mimeType = 'text/plain') => {
    const fileObj = new File([data], fileName, {type: mimeType});

    const element = document.createElement('a');
    const URL = window.URL || window.webkitURL;
    const url = URL.createObjectURL(fileObj);

    element.setAttribute('href', url);
    element.setAttribute('download', fileObj.name);
    element.setAttribute('rel', 'noopener');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
};

/**
 * @param {string} prefix
 * @returns {string}
 */
export const getExportFilename = (prefix) => {
    const hostname = window.location.hostname.replace(/\./g, '_');
    const model = _.get(window, 'NDM.model', '').replace(/\s+/g, '_');
    const hwId = _.get(window, 'NDM.hw_id', '');
    const timestamp = dateFormat(Date.now(), 'yyyy-dd-mm--HH_MM');

    return `${prefix}--${hostname}--${model}-${hwId}-${timestamp}.json`;
};

/**
 * @param {File} fileObj
 * @returns {Promise<{text: string, error: string}>}
 */
export const readTextFile = (fileObj) => {
    const reader = new FileReader();
    const deferred = $q.defer();

    reader.onload = (event) => {
        deferred.resolve({
            text: event.target.result,
            error: '',
        });
    };

    reader.onerror = () => {
        deferred.resolve({
            text: '',
            error: reader.result,
        });
    };

    try {
        reader.readAsText(fileObj);
    } catch (e) {
        return $q.resolve({
            error: e,
            text: '',
        });
    }

    return deferred.promise;
};
