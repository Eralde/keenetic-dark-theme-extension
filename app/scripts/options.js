import * as _ from 'lodash';
import fp from 'lodash/fp';
import Sortable from 'sortablejs';

import {Toast} from 'toaster-js';
import 'toaster-js/default.scss';

import {
    DASHBOARD_SWITCHPORT_TEMPLATE_ORIGINAL_KEY,
    REPLACE_TEXTAREA_CURSOR_STORAGE_KEY,
    SWITCHPORT_TEMPLATE_DATA_KEY,
    SWITCHPORT_TEMPLATE_PROP,
    SWITCHPORT_TEMPLATE_PROPS_STORAGE_KEY,
    SYSTEM_SWITCHPORT_TEMPLATE_ORIGINAL_KEY,
    TEMPLATE_PROP_DATA,
    WIDE_SWITCHPORT_TEMPLATE_PROPS,
} from './lib/constants';

import {
    addElementToUnorderedList,
    createDocumentFragmentFromString,
    getDocumentFragmentInnerHtml,
    removeAllChildNodes,
    wrapHtmlStringIntoDiv,
} from './lib/domUtils';

import {logWarning} from './lib/log';
import {
    beautifyHtml,
    getPropsTemplateChunk,
    overrideSwitchportTemplatePortLabel,
    toggleTagClassName,
} from './lib/ngTemplate';

const inputSelector = '#shortcut';
const switchportTemplateSelector = '#template';
const commandName = 'toggle-theme';

const DATA_PROP = 'data-prop';
const SORTABLE_GROUP_NAME = 'switchport-props';

const processSwitchportTemplateData = async () => {
    const availableProps = document.getElementById('available-props');
    const selectedProps = document.getElementById('selected-props');
    const propsPreview = document.getElementById('props-preview');

    const data = await browser.storage.local.get();

    const dashboardTemplateOriginal = _.get(
        data,
        DASHBOARD_SWITCHPORT_TEMPLATE_ORIGINAL_KEY,
        {},
    );

    if (_.isEmpty(dashboardTemplateOriginal)) {
        const msg = '' +
            'Extension storage is empty.\n' +
            'For the switchport template editor to work it is necessary to open the Keenetic web UI.';

        new Toast(msg);
    }

    const switchportTemplateProps = _.get(
        data,
        SWITCHPORT_TEMPLATE_PROPS_STORAGE_KEY,
        {
            defaultProps: getDefaultTemplateProps(),
            selectedProps: getDefaultTemplateProps(),
        },
    );

    generateAvailablePropsList(availableProps);

    await awaitTimeout(100);

    generateSelectedPropsList(selectedProps, switchportTemplateProps.selectedProps);

    new Sortable(availableProps, {
        group: {
            name: SORTABLE_GROUP_NAME,
            pull: 'clone',
            put: false,
        },
        dataIdAttr: DATA_PROP,
        sort: false,
        animation: 150,
    });

    const refreshPreview = () => {
        const props = sortable2.toArray();

        generatePropsPreviewList(propsPreview, props);

        document.querySelector(switchportTemplateSelector).value = getPropsTemplateChunk(props);
    };

    const sortable2 = new Sortable(selectedProps, {
        group: SORTABLE_GROUP_NAME,
        animation: 150,
        dataIdAttr: DATA_PROP,
        onChange: (evt) => {
            setTimeout(() => {
                const props = sortable2.toArray();

                refreshPreview();
            });
        },
    });

    new Sortable(document.getElementById('trash'), {
        group: SORTABLE_GROUP_NAME,
        ghostClass: 'trash-placeholder',
        animation: 150,
        onAdd: (evt) => {
            const el = evt.item;

            el.parentNode.removeChild(el);
            refreshPreview();
        },
    });

    refreshPreview();

    const updateTemplate = async ($event) => {
        $event.preventDefault();

        const data = await browser.storage.local.get();

        const dashboardTemplateOriginal = _.get(data, DASHBOARD_SWITCHPORT_TEMPLATE_ORIGINAL_KEY, {});
        const systemTemplateOriginal = _.get(data, SYSTEM_SWITCHPORT_TEMPLATE_ORIGINAL_KEY, {});

        const selectedProps = sortable2.toArray();

        const dashboardTemplate = generateFullDashboardTemplate(dashboardTemplateOriginal.template, selectedProps);
        const systemTemplate = generateFullSystemTemplate(systemTemplateOriginal.template, selectedProps);

        const templatePropsData = {
            defaultProps: getDefaultTemplateProps(),
            selectedProps,
        };

        await browser.storage.local.set({
            [SWITCHPORT_TEMPLATE_PROPS_STORAGE_KEY]: templatePropsData,
            [SWITCHPORT_TEMPLATE_DATA_KEY]: {
                dashboard: {...dashboardTemplateOriginal, template: dashboardTemplate},
                system: {...systemTemplateOriginal, template: systemTemplate},
            },
        });
    };

    const resetTemplate = async ($event) => {
        $event.preventDefault();

        const data = await browser.storage.local.get();

        const dashboardTemplateOriginal = _.get(data, DASHBOARD_SWITCHPORT_TEMPLATE_ORIGINAL_KEY, {});
        const systemTemplateOriginal = _.get(data, SYSTEM_SWITCHPORT_TEMPLATE_ORIGINAL_KEY, {});

        const templatePropsData = {
            defaultProps: getDefaultTemplateProps(),
            selectedProps: getDefaultTemplateProps(),
        };

        await browser.storage.local.set({
            [SWITCHPORT_TEMPLATE_PROPS_STORAGE_KEY]: templatePropsData,
            [SWITCHPORT_TEMPLATE_DATA_KEY]: {
                dashboard: {...dashboardTemplateOriginal},
                system: {...systemTemplateOriginal},
            },
        });

        await updateUI();
    };

    return {
        updateTemplate,
        resetTemplate,
    };
};

const getFinishedTemplateHtml = fp.compose(
    beautifyHtml,
    overrideSwitchportTemplatePortLabel,
    getDocumentFragmentInnerHtml,
);

const addClassToTheRootSwitchportElement = (originalTemplate, propsList) => {
    return toggleTagClassName(
        originalTemplate,
        'ndm-switchport',
        'wide',
        propsList.some(item => WIDE_SWITCHPORT_TEMPLATE_PROPS.includes(item)),
    );
};

const generateFullDashboardTemplate = (originalTemplate, propsList) => {
    if (!originalTemplate) {
        logWarning('"original" template is not a string (extension storage is empty?)');

        return '';
    }

    const _origTemplate = addClassToTheRootSwitchportElement(originalTemplate, propsList);

    const fragment = createDocumentFragmentFromString(_origTemplate);
    const stateDivs = [...fragment.querySelectorAll('.switchport-state')];
    const templateStr = getPropsTemplateChunk(propsList);

    if (stateDivs.length === 0) {
        logWarning('failed to parse original template [[generateFullDashboardTemplate]]');

        return beautifyHtml(originalTemplate);
    }

    stateDivs.forEach(div => {
        div.innerHTML = templateStr;
    });

    return getFinishedTemplateHtml(fragment);
};

const generateFullSystemTemplate = (originalTemplate, propsList) => {
    if (!originalTemplate) {
        logWarning('"original" template is not a string (extension storage is empty?)');

        return '';
    }

    const _origTemplate = addClassToTheRootSwitchportElement(originalTemplate, propsList);

    const fragment = createDocumentFragmentFromString(_origTemplate);
    const controlsDiv = fragment.querySelector('.switchport-configuration');
    const templateStr = getPropsTemplateChunk(propsList);

    if (!controlsDiv) {
        logWarning('failed to parse original template [[generateFullSystemTemplate]]');

        return beautifyHtml(originalTemplate);
    }

    const wrapper = document.createElement('DIV');
    const elToAttachTo = controlsDiv.parentNode;

    wrapper.appendChild(wrapHtmlStringIntoDiv(elToAttachTo.innerHTML));
    wrapper.appendChild(wrapHtmlStringIntoDiv(templateStr, {'class': 'extended-switchport-status'}));

    removeAllChildNodes(elToAttachTo);
    elToAttachTo.appendChild(wrapper);

    return getFinishedTemplateHtml(fragment);
};

async function updateUI() {
    let commands = await browser.commands.getAll();

    for (let command of commands) {
        if (command.name === commandName) {
            document.querySelector(inputSelector).value = command.shortcut;
        }
    }

    const data = await browser.storage.local.get();
    const replaceTextareaCursorEl = document.querySelector('#replaceTextareaCursor');

    replaceTextareaCursorEl.checked = _.get(data, REPLACE_TEXTAREA_CURSOR_STORAGE_KEY, true);
}

async function updateResetTextareaCursorValue(event) {
    await browser.storage.local.set({[REPLACE_TEXTAREA_CURSOR_STORAGE_KEY]: event.target.checked});
}

async function updateShortcut() {
    await browser.commands.update({
        name: commandName,
        shortcut: document.querySelector(inputSelector).value
    });
}

async function resetShortcut() {
    await browser.commands.reset(commandName);
    await updateUI();
}

const getDefaultTemplateProps = () => {
    return [
        SWITCHPORT_TEMPLATE_PROP.DUPLEX,
        SWITCHPORT_TEMPLATE_PROP.SPEED,
    ];
};

const generatePropsList = (parentEl, props, propToElement = _.identity, propToPropsList = () => {}) => {
    removeAllChildNodes(parentEl);

    _.forEach(props, (prop) => {
        addElementToUnorderedList(parentEl, propToElement(prop), propToPropsList(prop));
    });
};

const generateAvailablePropsList = (parentEl) => {
    generatePropsList(
        parentEl,
        SWITCHPORT_TEMPLATE_PROP,
        prop => TEMPLATE_PROP_DATA[prop].label,
        prop => ({[DATA_PROP]: prop}),
    );
};

const generateSelectedPropsList = (parentEl, selectedProps) => {
    generatePropsList(
        parentEl,
        selectedProps,
        prop => TEMPLATE_PROP_DATA[prop].label,
        prop => ({[DATA_PROP]: prop}),
    );
};

const generatePropsPreviewList = (parentEl, selectedProps) => {
    generatePropsList(
        parentEl,
        selectedProps,
        prop => TEMPLATE_PROP_DATA[prop].previewValue,
        prop => TEMPLATE_PROP_DATA[prop].previewValueProps || {},
    );
};

const awaitTimeout = (delayInMs, resolveValue = true) => {
    return new Promise(resolve => {
        setTimeout(() => {resolve(resolveValue)}, delayInMs);
    });
};

const clearStorage = async () => {
    await browser.storage.local.clear();

    window.location.reload();
};

document.addEventListener('DOMContentLoaded', async () => {
    await updateUI();

    const {updateTemplate, resetTemplate} = await processSwitchportTemplateData();

    document.querySelector('#saveTemplate').addEventListener('click', updateTemplate);
    document.querySelector('#resetTemplate').addEventListener('click', resetTemplate);

    document.querySelector('#updateShortcut').addEventListener('click', updateShortcut);
    document.querySelector('#resetShortcut').addEventListener('click', resetShortcut);
    document.querySelector('#replaceTextareaCursor').addEventListener('change', updateResetTextareaCursorValue);
    document.querySelector('#clearStorage').addEventListener('click', clearStorage);
});
