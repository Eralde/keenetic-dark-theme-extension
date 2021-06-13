import * as _ from 'lodash';

import {FW2X_BRANCHES, POLICIES_STATE} from '../lib/constants';
import {getAngularService, getElementScope} from '../lib/ndmUtils';

import {isPointInsideElement} from '../lib/domUtils';
import {logWarning} from '../lib/log';

/*
 * This UI extension fixes a glitch on the 'Connection priorities' page.
 * @see https://bit.ly/3p6zqpD (link to the forum message, describing the glitch)
 */

const $transitions = getAngularService('$transitions');
const $rootScope = getAngularService('$rootScope');
const $q = getAngularService('$q');
const CONSTANT = getAngularService('CONSTANT');

const SELECTBOX_TOGGLE_OPEN = _.get(CONSTANT, 'events.SELECTBOX_TOGGLE_OPEN');
const SELECTBOX_TOGGLE_CLOSE = _.get(CONSTANT, 'events.SELECTBOX_TOGGLE_CLOSE');

const Z_INDEX_FIX_CLASS = 'policy-consumers-list__consumer--z-null';
const MOVE_CONSUMERS_SELECTBOX_UL_SELECTOR = '.move-consumers-form__policy-dropdown ul';
const EDITOR_HEADER_SELECTOR = '[ng-controller="PoliciesEditorHeaderController as vm"]';

const PRE_3_6_BRANCHES = [
    ...FW2X_BRANCHES,
    '1.7',
    '1.8',
    '3.1',
    '3.2',
    '3.3',
    '3.4',
    '3.5',
];

const getMoveConsumersFormParentScope = async ($pageRootScope) => {
    const version = _.get(window, 'NDM.version', '');

    if (!version) {
        logWarning('Empty ndw version!');
    }

    if (PRE_3_6_BRANCHES.some(prefix => version.startsWith(prefix))) { // Version < 3.6
        return $q.when($pageRootScope);
    }

    const deferred = $q.defer();

    $pageRootScope.$watch('vm.progress', (val) => {
        if (val !== 100) {
            return;
        }

        setTimeout(() => {
            const headerElement = angular.element(document.querySelector(EDITOR_HEADER_SELECTOR));

            deferred.resolve(headerElement.scope());
        });
    });

    return deferred.promise;
};

const fixPolicies = async () => {
    const $pageScope = await getElementScope('ndm-page');
    const $relevantScope = await getMoveConsumersFormParentScope($pageScope);

    let moveConsumersSelectboxUid = '';

    const getSelectedConsumers = () => {
        return [...document.querySelectorAll('.policy-consumers-list__consumer--selected')];
    };

    const resetSelectedConsumersClasslist = () => {
        getSelectedConsumers().forEach(consumer => {
            consumer.classList.remove(Z_INDEX_FIX_CLASS);
        });
    };

    const clearOnSelectboxOpenListener = $rootScope.$on(SELECTBOX_TOGGLE_OPEN, ($event, uid) => {
        if (uid !== moveConsumersSelectboxUid) {
            return;
        }

        setTimeout(() => {
            const ul = document.querySelector(MOVE_CONSUMERS_SELECTBOX_UL_SELECTOR);
            const selectedConsumers = getSelectedConsumers();

            if (!ul) {
                return;
            }

            selectedConsumers.forEach(consumer => {
                const consumerRect = consumer.getBoundingClientRect();

                const consumerCenterX = consumerRect.left + consumerRect.width / 2;
                const consumerCenterY = consumerRect.top + consumerRect.height / 2;

                const center = {x: consumerCenterX, y: consumerCenterY};

                if (isPointInsideElement(center, ul)) {
                    consumer.classList.add(Z_INDEX_FIX_CLASS);
                }
            });
        });
    });

    const clearOnSelectboxCloseListener = $rootScope.$on(SELECTBOX_TOGGLE_CLOSE, ($event, uid) => {
        if (uid !== moveConsumersSelectboxUid) {
            return;
        }

        setTimeout(() => {
            resetSelectedConsumersClasslist();
        });
    });

    const clearWatcher = $relevantScope.$watch('vm.moveConsumersFormIsVisible', (value) => {
        if (!value) {
            return;
        }

        setTimeout(() => {
            const el = document.querySelector('.move-consumers-form__policy-dropdown .directive-ndm-selectbox');
            const selectboxScope = angular.element(el).scope();

            moveConsumersSelectboxUid = _.get(selectboxScope, 'vm.uid');
        });
    });

    const clearTransitionHook = $transitions.onSuccess(
        {
            from: POLICIES_STATE,
        },
        () => {
            resetSelectedConsumersClasslist();
            clearWatcher();
            clearTransitionHook();
            clearOnSelectboxOpenListener();
            clearOnSelectboxCloseListener();
        }
    );
};

export const fixedPolicyEditorHeader = {
    onLoad: fixPolicies,
};
