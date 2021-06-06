import * as beautify from 'js-beautify';
import * as _ from 'lodash';

import {NDM_SWITCHPORT_CONTAINER_TAG, TEMPLATE_PROP_DATA} from './constants';
import {
    createDocumentFragmentFromString,
    getDocumentFragmentInnerHtml,
    wrapHtmlStringIntoDiv,
} from './domUtils';
import {getTemplate} from './ndmUtils';
import {logWarning} from './log';

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

    const middleChunk = chunks[1];

    const template = middleChunk.substr(1, middleChunk.length - 3);
    const prefix = `${chunks[0]}${NDM_SWITCHPORT_CONTAINER_TAG}>`;
    const suffix = `</${NDM_SWITCHPORT_CONTAINER_TAG}${chunks[2]}`;

    return {
        template,
        prefix,
        suffix,
    };
};
