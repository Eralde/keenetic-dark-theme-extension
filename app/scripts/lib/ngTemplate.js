import * as beautify from 'js-beautify';
import * as _ from 'lodash';

import {
    NDM_SWITCHPORT_CONTAINER_TAG,
    TEMPLATE_PROP_DATA
} from './constants';

import {
    createDocumentFragmentFromString,
    getDocumentFragmentInnerHtml,
    wrapHtmlStringIntoDiv,
} from './domUtils';

import {getAngularService, getTemplate} from './ndmUtils';
import {logWarning} from './log';

/**
 * @param {string} templateStr
 * @param {string} tagName
 * @param {string} classToToggle
 * @param {boolean} state
 * @returns {string}
 */
export const toggleTagClassName = (templateStr, tagName, classToToggle, state) => {
    const fragment = createDocumentFragmentFromString(templateStr);
    const element = fragment.querySelector(tagName);

    if (!element) {
        return templateStr;
    }

    const className = element.className;

    if (state) {
        element.className = className.includes(classToToggle)
            ? className
            : `${className} ${classToToggle}`.trim();
    } else {
        element.className = className.includes(classToToggle)
            ? className.replace(classToToggle, '').trim()
            : className;
    }

    return getDocumentFragmentInnerHtml(fragment);
};

/**
 * @param {string} htmlStr
 * @returns {string}
 */
export const beautifyHtml = (htmlStr) => {
    return beautify.html(
        htmlStr,
        {
            indent_size: 2,
            wrap_attributes: 'force-expand-multiline',
        },
    );
};

/**
 * @param {string} s
 * @returns {boolean}
 */
export const isWrappedInParentheses = (s) => s[0] === '(' && s[s.length - 1] === ')';

/**
 * @param {string} str
 * @param {number} injectionIndex
 * @param {string} injectStr
 * @returns {string}
 */
export const injectAtIndex = (str, injectionIndex, injectStr) => {
    const prefix = str.substr(0, injectionIndex);
    const suffix = str.substr(injectionIndex);

    return prefix + injectStr + suffix;
};

/**
 * @param {string} templateName
 * @param {string} str
 * @param {string[]} injectionMarks
 * @param {string} errorMessage
 * @returns {void}
 */
export const injectStringIntoTemplate = (
    templateName,
    str,
    injectionMarks,
    errorMessage,
) => {
    const $templateCache = getAngularService('$templateCache');
    const templateStr = getTemplate(templateName);

    const injectionIndex = injectionMarks.reduce(
        (acc, mark) => {
            return templateStr.indexOf(mark, acc);
        },
        0,
    );

    if (injectionIndex === -1) {
        console.warn(errorMessage);

        return;
    }

    const updatedTemplate = injectAtIndex(templateStr, injectionIndex, str);

    $templateCache.put(templateName, updatedTemplate);
};

/**
 * @param {Array<object>} propsList
 * @returns {string}
 */
export const getPropsTemplateChunk = (propsList) => {
    return propsList.reduce(
        (acc, prop) => {
            const data = TEMPLATE_PROP_DATA[prop];

            const alternatives = [data.prop, data.alias, data.fallback]
                .filter(Boolean)
                .map(item => `port['${item}']`);

            const shouldWrap = alternatives.length > 1;
            const valueStr = alternatives.join(' || ');

            let ngString = shouldWrap
                ? `(${valueStr})`
                : valueStr;

            if (data.filter) {
                ngString = `${ngString} | ${data.filter}`;
            }

            if (data.prefix) {
                ngString = `("${data.prefix}" + ${ngString})`;
            }

            if (data.propToCheck) {
                ngString = `(port['${data.propToCheck}'] ? ${ngString} : '&nbsp;')`;
            } else if (isWrappedInParentheses(ngString)) {
                ngString = `${ngString} || '&nbsp;'`;
            } else {
                ngString = `(${ngString}) || '&nbsp;'`;
            }

            const props = {
                ...(data.valueProps || {}),
                ...(data.className ? {'class': data.className} : {}),
            };

            const div = wrapHtmlStringIntoDiv(`{{ ${ngString} }}`, props);

            return `${acc}\n${div.outerHTML}`;
        },
        '',
    );
};

/**
 * Replace  `label="<obj_name>.<some_prop>"`
 * with     `label="<obj_name>.portIconLabel || <obj_name>.port"`
 *
 * @param {string} templateStr
 * @returns {string}
 */
export const overrideSwitchportTemplatePortLabel = (templateStr) => {
    const match = templateStr.match(/label="(([^"]+?)\.([^"]+?))"/);

    if (!match) {
        return templateStr;
    }

    const wholeMatch = match[0];
    const replacement = wholeMatch.replace(match[1], `${match[2]}.portIconLabel || ${match[2]}.port`);

    return templateStr.replace(wholeMatch, replacement);
};

/**
 * @param {string} fullTemplatePath
 * @returns {{template: string, prefix: string, suffix: string}|boolean}
 */
export const getSwitchportsTemplateChunks = (fullTemplatePath) => {
    const wholeTemplate = getTemplate(fullTemplatePath);

    if (!_.isString(wholeTemplate)) {
        logWarning(`Failed to get [${fullTemplatePath}] template`);

        return false;
    }

    const chunks = wholeTemplate.split(NDM_SWITCHPORT_CONTAINER_TAG);

    if (chunks.length !== 3) {
        const msg = [
            `Template @ [${fullTemplatePath}] contains`,
            `invalid number of <${NDM_SWITCHPORT_CONTAINER_TAG}> tags`,
        ].join(' ');

        logWarning(msg);

        return false;
    }

    const prefixEnd = '>';
    const suffixStart = '<';

    const _prefixEndIndex = wholeTemplate.indexOf(prefixEnd, chunks[0].length);
    const _suffixStartIndex = wholeTemplate.lastIndexOf(`/${NDM_SWITCHPORT_CONTAINER_TAG}`);

    if (_prefixEndIndex === -1 || _suffixStartIndex === -1) {
        logWarning(`Failed to split template @ [${fullTemplatePath}]`);

        return false;
    }

    const prefixEndIndex = _prefixEndIndex + prefixEnd.length;
    const prefix = wholeTemplate.substring(0, prefixEndIndex);

    const suffixStartIndex = _suffixStartIndex - suffixStart.length;

    const template = wholeTemplate.substring(prefixEndIndex, suffixStartIndex);
    const suffix = wholeTemplate.substring(suffixStartIndex);

    return {
        template,
        prefix,
        suffix,
    };
};
