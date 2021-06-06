import * as beautify from 'js-beautify';
import * as _ from 'lodash';

import {wrapHtmlStringIntoDiv} from './domUtils';
import {NDM_SWITCHPORT_CONTAINER_TAG, TEMPLATE_PROP_DATA} from './constants';
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
 * @param {string} className
 * @param {boolean} state
 * @returns {string}
 */
export const toggleTagClassName = (templateStr, tagName, className, state) => {
    const tagStartStr = '<' + tagName;
    const tagStartIdx = templateStr.indexOf(tagStartStr);

    if (tagStartIdx === -1) {
        return templateStr;
    }

    const tagEnd = templateStr.indexOf('>', tagStartIdx);
    const matchStr = templateStr.substr(tagStartIdx);
    const regexp = /class="[^"]+?"/;
    const startIdx = tagStartIdx;
    const tagPropsStart = tagStartIdx + tagStartStr.length;

    regexp.lastIndex = startIdx;

    const match = matchStr.match(regexp);

    if (!match || match.index > tagEnd) {
        if (!state) {
            return templateStr;
        } else {
            return [
                templateStr.substr(0, tagPropsStart),
                ` class="${className}" `,
                templateStr.substr(tagPropsStart),
            ].join('');
        }
    }

    const wholeMatch = match[0];
    const replacement = state
        ? wholeMatch.substr(wholeMatch.length - 2) + ` ${className}"`
        : wholeMatch.replace(className, '');

    return templateStr.replace(wholeMatch, replacement);
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
