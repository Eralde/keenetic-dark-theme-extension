import * as _ from 'lodash';
import dateFormat from 'dateformat';
import {getAngularService} from './ndmUtils';

const $q = getAngularService('$q');

/**
 * @param {string} data
 * @param {string} fileName
 * @param {string} mimeType
 */
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
