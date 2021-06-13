import * as _ from 'lodash';

import {
    FW2X_BRANCHES,
    FW3X_WITHOUT_SWITCHPORT_OVERLOAD,
    LOGIN_STATE,
    NDM_TEXTAREA_TEMPLATE_PATH,
    NO_TAG,
    OLD_FW3X_BRANCHES,
} from './constants.js';

import {sharedData} from './state';

const DEFAULT_GET_SERVICE_TAG_TIMEOUT = 5000;

export const getAngularService = (serviceName) => {
    if (!window.angular) {
        return null;
    }

    const injector = angular.element(document.querySelector('body')).injector();

    return injector.get(serviceName);
};

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
}

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

export const getNgL10n = (id, args = {}) => {
    return getAngularService('$translate').instant(id, args);
};

export const onLanguageChange = (callback) => {
    getAngularService('$rootScope')
        .$on('$translateChangeSuccess', () => setTimeout(callback));
};

export const forceScopeDigest = ($scope) => {
    if (!['$apply', '$digest'].includes(_.get($scope, '$root.$$phase'))) {
        $scope.$apply();
    }
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
};

export const replaceSwitchportsTemplate = (templateData, path) => {
    if (!templateData) {
        return;
    }

    const {prefix, suffix, template} = templateData;
    const $templateCache = getAngularService('$templateCache');

    $templateCache.put(path, prefix + template + suffix);
}

export const toggleNdmTextareaClass = ({className, state, insertAfterClass}) => {
    const SHARED_DATA_KEY = 'toggleNdmTextareaClassFailed';

    if (sharedData.get(SHARED_DATA_KEY)) {
        return;
    }

    const $templateCache = getAngularService('$templateCache');
    const template = getTemplate(NDM_TEXTAREA_TEMPLATE_PATH);

    if (!_.isString(template)) {
        console.warn('Keenetic Dark Theme Extension: failed to get ndm-textarea component template');
        sharedData.set(SHARED_DATA_KEY, true);

        return;
    }

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

export const getNdmPageController = () => {
    return getElementController('.ndm-page');
};

export const is2xVersion = (ndwVersion) => FW2X_BRANCHES.some(branch => ndwVersion.startsWith(branch));
export const is3xVersion = (ndwVersion) => {
    return OLD_FW3X_BRANCHES.some(branch => ndwVersion.startsWith(branch))
        || ndwVersion.startsWith('3.');
}

export const isSwitchportOverloadSupported = (ndwVersion) => {
    if (!is3xVersion(ndwVersion)) {
        return false;
    }

    const is3xBranchWithoutOverload = FW3X_WITHOUT_SWITCHPORT_OVERLOAD.some(branch => {
        const branchChunks = branch.split('.');
        const versionChunks = ndwVersion.split('.');

        return branchChunks.every((chunk, index) => chunk === versionChunks[index]);
    });

    return !is3xBranchWithoutOverload;
}

export const getPortInterfaceStatus = (port, showInterfaceData) => {
    return _.find(
        showInterfaceData,
        item => item.id === port.interfaceId || item['interface-name'] === port.port,
    );
}

export const getAdditionalSwitchportProps = (port, interfaceStatus) => {
    const portIconLabel = port.type === 'dsl'
        ? port.portId
        : port.port;

    // This does not work for Ethernet ports, but works for Dsl0 >_<
    const interfaceDescription = _.get(interfaceStatus, 'description', '');

    return {
        portIconLabel,
        interfaceDescription,
    };
}

export const extendGroupedSwitchportsListItem = (port, showInterfaceData) => {
    const interfaceStatus = getPortInterfaceStatus(port, showInterfaceData);
    const additionalProps = getAdditionalSwitchportProps(port, interfaceStatus);

    return {
        ...port,
        ...additionalProps,
    };
};

export const getGroupedSwitchportsListOverload = (getGroupedSwitchportsList) => {
    return (...args) => {
        const returnValue = getGroupedSwitchportsList(...args);
        const showInterfaceData = _.get(args, [1], {});

        return returnValue.map(port => {
            if (port.linkedPort) {
                port.linkedPort = extendGroupedSwitchportsListItem(port.linkedPort, showInterfaceData);

                // workaround to show proper label inside the port icon & proper description below
                port.linkedPort.description = port.linkedPort.name
                port.linkedPort.name = port.linkedPort.portIconLabel;
            }

            return extendGroupedSwitchportsListItem(port, showInterfaceData);
        });
    };
};

const extendPortData = ({utils, port, portIdsList, statDataList}) => {
    const {interfaceId} = port;

    const index = _.findIndex(portIdsList, item => item === interfaceId);
    const statData = _.get(statDataList, [index], {});
    const rxShort = utils.format.size(statData.rxbytes, true);
    const txShort = utils.format.size(statData.txbytes, true);

    return {
        ...port,
        ...statData,
        'rxbytes-formatted-short': rxShort,
        'txbytes-formatted-short': txShort,
    };
}

export const extendSwitchportsListWithStatData = (switchportsList, portIdsList, statDataList) => {
    const utils = getAngularService('utils');

    return switchportsList.map(port => {
        if (port.linkedPort) {
            port.linkedPort = extendPortData({
                utils,
                portIdsList,
                statDataList,
                port: port.linkedPort,
            });
        }

        return extendPortData({utils, port, portIdsList, statDataList});
    });
}
