import * as _ from 'lodash';

import {
    callOnPageLoad,
    getAngularService,
    onLanguageChange,
} from './ndmUtils';

import {
    getL10n,
} from './l10nUtils';

import {
    FILTERS_ARE_VISIBLE_CLASS,
    FLAGS,
    HIDE_CLASS, LOG_LINK_CLASS,
    MOUSEOVER_INTERCEPTED_DATA_ATTR,
    FILTERS_TOGGLE_CLASS,
} from './constants';

export const isFirefox = () => typeof InstallTrigger !== 'undefined'; // eslint-disable-line no-undef

/**
 * @param {String} name
 * @param {String} label
 * @param {String} className
 * @returns {String}
 */
export const getCheckboxHtmlStr = ({name, label, className = ''}) => {
    return `
            <div class="ndm-checkbox ndm-checkbox--dark form__row ${className}">
                <div class="form__cell form__cell--checkbox">
                    <div class="checkbox">
                        <input
                            tabindex="0"
                            class="checkbox__input"
                            type="checkbox"
                            name="${name}"
                        >
                        <label
                            class="checkbox__label"
                            for="${name}"
                        >
                        </label>
                    </div>
                </div>
                <div class="form__cell form__cell--input-label help-text">
                    <span>${label}</span>
                </div>
            </div>`;
};

/**
 * @param {String} innerHTML
 * @param {String} [className = '']
 * @returns {HTMLElement}
 */
export const createElement = (innerHTML, className = '') => {
    const div = document.createElement('DIV');

    div.innerHTML = innerHTML;

    if (className) {
        div.classList.add(className);
    }

    return div;
};

/**
 * @param {String} divClass
 * @returns {HTMLElement}
 */
export const createDiv = (divClass) => {
    const div = document.createElement('DIV');
    div.className = divClass;

    return div;
};

/**
 * @param {Array<HTMLElement>} elementsList
 * @param {String} className
 * @param {Boolean} addClass
 */
export const toggleCssClass = (elementsList, className, addClass) => {
    const fnName = Boolean(addClass) ? 'add' : 'remove';

    elementsList.forEach(el => {
        el && el.classList[fnName](className);
    });
};

/**
 * @param {Array<Element>} elementsList
 * @param {String} className
 */
export const addCssClass = (elementsList, className) => toggleCssClass(elementsList, className, true);

/**
 *
 * @param {Element} headerToolbarEl
 * @param {String} className
 */
export const addStylesToDevicesListTableHeader = (headerToolbarEl, className) => {
    const transcludeContainer = headerToolbarEl.closest('[ng-transclude]');
    const titleEl = headerToolbarEl.closest('.ndm-title');

    if (transcludeContainer) {
        transcludeContainer.classList.add('__inline-flex-row');
        transcludeContainer.classList.add('devices-list-section-header');
    }

    if (titleEl) {
        titleEl.classList.add(className);
    }

    return titleEl;
};

export const getPageHeaderEl = () => document.querySelector('.ndm-page-header .header');

export const hideElement = (el) => {
    if (el) {
        el.style.display = 'none';
    }
};

export const isElementVisible = (el) => {
    return el && el.style.display !== 'none';
};


export const clickOnTheRebootButton = () => {
    const $timeout = getAngularService('$timeout');

    $timeout(() => {
        const buttons = [...document.querySelectorAll('.system__reboot-section button')];

        buttons[0].click();
    });
};

export const goToDslTab = () => {
    const utils = getAngularService('utils');

    let retryCount = 3;

    const attemptToSelectDslTab = () => {
        const tabs = [...document.querySelectorAll('.tabs-list__item')];

        const dslTab = _.find(tabs, item => item.innerText === utils.getTranslation('diagnostics.tabs.dsl'))
            || _.last(tabs);

        if (!dslTab) {
            if (retryCount > 0) {
                retryCount--;

                setTimeout(() => attemptToSelectDslTab(), 100);
            }

            return;
        }

        const linkElement = dslTab.querySelector('a');

        _.invoke(linkElement, 'click');
    }

    setTimeout(() => attemptToSelectDslTab());
};

export const interceptMouseover = (selector) => {
    const els = [...document.querySelectorAll(selector)];

    els
        .filter(el => !el.getAttribute(MOUSEOVER_INTERCEPTED_DATA_ATTR))
        .forEach(el => {
            el.setAttribute(MOUSEOVER_INTERCEPTED_DATA_ATTR, 1);
            el.addEventListener(
                'mouseover',
                (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                },
                true
            );
        });

    setTimeout(() => interceptMouseover(selector), 1000);
};

const _GET_MENU_ELEMENTS_ITEM_DEFAULT_OPTIONS = {
    onClick: _.noop,
    href: '',
    itemSelector: '.ndm-menu__group__item',
    activeItemClass: 'ndm-menu__group__item--active',
    classToAdd: LOG_LINK_CLASS,
};

export const getMenuElementItem = (
    parentEl,
    itemText,
    opts = {}
) => {
    const _opts = {..._GET_MENU_ELEMENTS_ITEM_DEFAULT_OPTIONS, ...opts};
    const {
        onClick,
        href,
        itemSelector,
        activeItemClass,
        classToAdd,
    } = _opts;

    const linkNode = parentEl.querySelector(itemSelector);

    if (!linkNode) {
        return;
    }

    linkNode.classList.remove(activeItemClass);

    const dupNode = linkNode.cloneNode(true);
    const link = dupNode.tagName === 'A'
        ? dupNode
        : dupNode.querySelector('a');

    if (!link) {
        return;
    }

    link.innerText = itemText;
    link.classList.add(classToAdd);

    if (href) {
        link.setAttribute('href', href);
    }

    const $rootScope = getAngularService('$rootScope');

    link.addEventListener('click', () => {
        if ($rootScope) {
            $rootScope.menuIsOpen = false;
        }

        onClick();
    });

    return {
        dupNode,
        linkEl: link,
    };
};

const DEFAULT_ADD_FLAG_CHECKBOX_OPTIONS = {
    cbk: _.noop,
    className: '',
};

export const addFlagCheckbox = (flags, options) => {
    const _opts = {...DEFAULT_ADD_FLAG_CHECKBOX_OPTIONS, ...options};

    const {
        parentEl,
        flagName,
        flagLabelL10nId,
        cbk,
        className,
    } = _opts;

    const checkboxName = `flag_${flagName}_value`;
    const flagLabel = getL10n(flagLabelL10nId);

    const keyboard = getAngularService('keyboard');

    const checkboxStr = getCheckboxHtmlStr({
        name: checkboxName,
        label: flagLabel,
        className: className
    });

    const checkbox = createElement(checkboxStr, 'filter-toggle-container');
    parentEl.prepend(checkbox);

    const checkboxEl = document.querySelector(`[name="${checkboxName}"]`);
    checkboxEl.checked = flags.get(flagName);

    const updateFlag = (value) => {
        flags.set(flagName, !!value);
        cbk(flags.get(flagName));
    }

    const onCheckboxLabelClick = () => {
        checkboxEl.checked = !checkboxEl.checked;

        setTimeout(() => updateFlag(checkboxEl.checked));
    }

    const onKeydown = (e) => {
        if (keyboard.isSpace(e)) {
            setTimeout(() => updateFlag(!checkboxEl.checked));
        }
    }

    const labelEl = document.querySelector(`[for="${checkboxName}"]`);

    labelEl.addEventListener('click', onCheckboxLabelClick);
    checkboxEl.addEventListener('keydown', onKeydown, {capture: true});

    onLanguageChange(() => {
        checkbox.querySelector('.form__cell--input-label span').innerHTML = getL10n(flagLabelL10nId);
    });

    return checkboxEl;
};

export const addFiltersToggleCheckbox = (
    flags,
    __VARS,
    elToAttachTo,
    elementsToToggle = [],
    elementContainers = [],
    onToggleCallback = _.noop,
) => {
    if (!elToAttachTo) {
        return;
    }
    const flagName = FLAGS.SHOW_FILTERS;

    return addFlagCheckbox(
        flags,
        {
            parentEl: elToAttachTo,
            flagName: flagName,
            flagLabelL10nId: flagName,
            cbk: (v) => {
                flags.set(flagName, v);
                toggleCssClass(elementsToToggle, HIDE_CLASS, !v);
                elToAttachTo.classList[v ? 'add' : 'remove'](FILTERS_ARE_VISIBLE_CLASS);
                toggleCssClass(elementContainers, FILTERS_ARE_VISIBLE_CLASS, v);
                onToggleCallback(v);
            },
            className: FILTERS_TOGGLE_CLASS,
        }
    )
};

export const isPointInsideElement = (point, el) => {
    const {x, y} = point;
    const rect = el.getBoundingClientRect();

    return (rect.left <= x && rect.right >= x) && (rect.top <= y && rect.bottom >= y);
}

export const getSpecialMenuItemClickListener = (callback, stateName) => {
    const $rootScope = getAngularService('$rootScope');
    const $state = getAngularService('$state');
    const $q = getAngularService('$q');

    return ($event) => {
        if (!$rootScope.menuIsOpen) {
            return;
        }

        $event.preventDefault();
        $event.stopPropagation();

        const currentState = $state.current.name;
        const promise = currentState === stateName
            ? $q.when(true)
            : $state.go(stateName);

        return promise
            .then(() => {
                if ($rootScope) {
                    $rootScope.menuIsOpenOverlayed = false;
                }

                if (currentState === stateName) {
                    return $q.when(true).then(callback);
                }

                const deferred = $q.defer();

                callOnPageLoad(() => deferred.resolve());

                return deferred.promise.then(callback);
            });
    };
}

export const removeAllChildNodes = (parent) => {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

export const addElementToUl = (ulElement, text, props = {}) => {
    const li = document.createElement('LI');

    li.appendChild(document.createTextNode(text));
    _.forEach(props, (value, key) => {
        li.setAttribute(key, value);
    });

    ulElement.appendChild(li);
}

export const createDocumentFragmentFromString = (htmlStr) => {
    return document.createRange().createContextualFragment(htmlStr);
}

export const getDocumentFragmentInnerHtml = (fragment) => {
    const div= document.createElement('DIV');

    div.appendChild(fragment);

    return div.innerHTML;
}
