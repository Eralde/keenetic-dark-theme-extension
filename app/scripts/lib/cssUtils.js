import * as _ from 'lodash';
import {
    getAngularService,
} from './ndmUtils';

const notification = getAngularService('notification');

const PROPS_TO_CHECK = {
    'background-color': ['background', 'background-color'],
}

const matchMedia = (mediaRule) => {
    return window.matchMedia(mediaRule.media.mediaText).matches;
}

const matchesSelector = (el, selector) => {
    const matchesSelector = el.matchesSelector
        || el.webkitMatchesSelector
        || el.mozMatchesSelector
        || el.msMatchesSelector;

    if (matchesSelector) {
        try {
            return matchesSelector.call(el, selector);
        } catch (e) {
            return false;
        }
    } else {
        const matches = [...el.ownerDocument.querySelectorAll(selector)];

        return matches.some(match => match === el);
    }
}

export const getMatchedCSSRules = (el) => {
    if (el.nodeType !== 1) {
        return [];
    }

    const matchedRules = [];
    const sheets = el.ownerDocument.styleSheets;

    let slen = sheets.length;

    while (slen && slen--) {
        const rules = sheets[slen].cssRules || sheets[slen].rules;

        let rlen = rules.length;

        while (rlen && rlen--) {
            let rule = rules[rlen];

            if (rule instanceof CSSStyleRule && matchesSelector(el, rule.selectorText)) {
                matchedRules.push(rule);
            } else if (rule instanceof CSSMediaRule && matchMedia(rule)) {
                const mrules = rule.cssRules || rule.rules;

                let mrlen = mrules.length;

                while (mrlen && mrlen--) {
                    rule = mrules[mrlen];

                    if (rule instanceof CSSStyleRule && matchesSelector(el, rule.selectorText)) {
                        matchedRules.push(rule);
                    }
                }
            }
        }
    }

    return matchedRules;
}

export const getBackgroundColor = (element) => {
    let color = window.getComputedStyle(element)['background-color'];

    if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        return color;
    }

    if (element === document.body) {
        return false;
    } else {
        return getBackgroundColor(element.parentNode);
    }
}

export const getRulesContainingProp = (rules, prop) => {
    return rules.filter(rule => rule.includes(prop));
}

const getRuleSelectors = (rule) => {
    const selectorsChunk = rule.split('{')[0];

    return selectorsChunk.split(',').map(str => str.trim());
}

const getRuleBody = (rule) => {
    const ruleBody = rule.split('{')[1];

    return '{' + ruleBody;
}

export const getRuleSpecificForElement = (rule, el) => {
    const id = el.id;
    const classes = getElementClasses(el);

    const selectors = getRuleSelectors(rule);
    const ruleBody = getRuleBody(rule);

    const idSelector = `#${id}`;

    if (id && selectors.some(selector => selector.includes(idSelector))) {
        const selector = selectors.filter(selector => selector.includes(idSelector))[0];

        return `${selector} ${ruleBody}`;
    }

    const selectorsPerClass = _.flatMap(classes, cssClass => {
        return selectors
            .filter(selector => selector.endsWith(cssClass))
            .map(selector => {
                return {
                    selector,
                    index: selector.indexOf(cssClass),
                };
            });
    });

    const mostSpecificSelectorObject = _.orderBy(selectorsPerClass, 'index', 'desc')[0];
    const mostSpecificSelector = _.get(mostSpecificSelectorObject, 'selector', '');

    return `${mostSpecificSelector} ${ruleBody}`;
}

export const isClassSelector = str => str.startsWith('.');

export const increaseSelectorSpecificity = (selector, matchingEl) => {
    const parts = selector.split(' ');

    let index = parts.length - 1;
    let currEl = matchingEl;

    const resultParts = [];

    while (index >= 0) {
        const part = parts[index];

        if (isClassSelector(part)) {
            const tagName = currEl.tagName.toLowerCase();

            resultParts.push(`${tagName}${part}`);
        } else {
            index--;
            resultParts.push(part);
        }

        if (index > 0) {
            currEl = currEl.closest(parts[index - 1]);
        }

        index--;
    }

    return resultParts.reverse().join(' ');
}

export const rgbToHex = (r, g, b) => {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export const rgbStrToHex = (rgbStr) => {
    const _str = rgbStr.replace('rgb(', '').replace(')', '');
    const chunks = _str.split(',').map(el => Number(el.trim()));

    return rgbToHex(...chunks);
}

const getElementClasses = (el) => {
    return el.className
        .split(' ')
        .filter(_class => !_class.startsWith('ng-')); // filter out AngularJS classes
}

export const findSelectorToChangeProp = (el, prop, testValue) => {
    const props = PROPS_TO_CHECK[prop] || [prop];
    const rules = _.flatMap(props, _prop => {
        const matchingRules = getMatchedCSSRules(el).map(rule => rule.cssText);

        return getRulesContainingProp(matchingRules, _prop);
    });

    if (rules.length === 0) {
        const _class = getElementClasses(el)[0];

        if (_class) {
            return `.${_class}`;
        }

        if (el.id) {
            return `#${el.id}`;
        }

        const errMsg = 'Failed to get a CSS selector for selected element';

        console.warn(errMsg);
        _.invoke(notification, 'warning', errMsg);

        return '';
    }

    const sheet = window.document.styleSheets[0];
    const len = rules.length;

    let _selector = '';

    for (let i = 0; i < len; ++i) {
        const rule = rules[i];
        const specificRule = getRuleSpecificForElement(rule, el);
        const selector = getRuleSelectors(specificRule)[0]
        const moreSpecificSelector = increaseSelectorSpecificity(selector, el);

        const newRule = `${moreSpecificSelector} {${prop}: ${testValue} !important;}`;

        sheet.insertRule(newRule);

        const newValue = window.getComputedStyle(el)[prop];

        if (
            newValue === testValue
            || (newValue.startsWith('rgb') && rgbStrToHex(newValue) === testValue)
        ) {
            _selector = moreSpecificSelector;
            sheet.deleteRule(0);
            break;
        }

        sheet.deleteRule(0);
    }

    return _selector;
}
