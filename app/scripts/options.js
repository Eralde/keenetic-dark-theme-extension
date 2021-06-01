import * as _ from 'lodash';
import * as beautify from 'js-beautify';
import Sortable from 'sortablejs';
import {
    REPLACE_TEXTAREA_CURSOR_STORAGE_KEY,
    SWITCHPORT_TEMPLATE_ORIGINAL_STORAGE_KEY,
    SWITCHPORT_TEMPLATE_PROP,
    TEMPLATE_PROP_LABEL,
    TEMPLATE_PROP_DATA,
    SWITCHPORT_TEMPLATE_PROPS_STORAGE_KEY,
    SWITCHPORT_TEMPLATE_STORAGE_KEY,
} from './lib/constants';
import {
    addElementToUl,
    removeAllChildNodes,
    createDocumentFragmentFromString,
    getDocumentFragmentInnerHtml,
} from './lib/domUtils';

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

    const switchportTemplateOriginal = _.get(
        data,
        SWITCHPORT_TEMPLATE_ORIGINAL_STORAGE_KEY,
        {},
    );

    const switchportTemplateProps = _.get(
        data,
        SWITCHPORT_TEMPLATE_PROPS_STORAGE_KEY,
        {
            originalTemplate: switchportTemplateOriginal,
            template: switchportTemplateOriginal.template,
            defaultProps: getDefaultTemplateProps(),
            selectedProps: getDefaultTemplateProps(),
        },
    );

    generateAvailablePropsList(availableProps);

    await awaitTimeout(100);

    generateSelectedPropsList(selectedProps, switchportTemplateProps.selectedProps);

    const sortable = new Sortable(availableProps, {
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

        console.log(
            generateFullTemplate(switchportTemplateOriginal.template, props),
        );

        document.querySelector(switchportTemplateSelector).value = generateFullTemplate(switchportTemplateOriginal.template, props);
    }

    const sortable2 = new Sortable(selectedProps, {
        group: SORTABLE_GROUP_NAME,
        animation: 150,
        dataIdAttr: DATA_PROP,
        onChange: (evt) => {
            setTimeout(() => {
                const props = sortable2.toArray();

                console.log(props);

                console.log(
                    getPropsTemplateChunk(props),
                );

                refreshPreview();
            });
        },
    });

    const sortable3 = new Sortable(document.getElementById('trash'), {
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

        const template = document.querySelector(switchportTemplateSelector).value;

        const data = await browser.storage.local.get();
        const switchportTemplateOriginal = _.get(data, SWITCHPORT_TEMPLATE_ORIGINAL_STORAGE_KEY, {});

        const {prefix, suffix} = switchportTemplateOriginal;
        await browser.storage.local.set({[SWITCHPORT_TEMPLATE_STORAGE_KEY]: {prefix, suffix, template}});

        const selectedProps = sortable2.toArray();
        // const template = generateFullTemplate(switchportTemplateOriginal.template, selectedProps);
        const templatePropsData = {
            originalTemplate: switchportTemplateOriginal,
            template,
            defaultProps: getDefaultTemplateProps(),
            selectedProps,
        };

        await browser.storage.local.set({[SWITCHPORT_TEMPLATE_PROPS_STORAGE_KEY]: templatePropsData});
    }

    const resetTemplate = async ($event) => {
        $event.preventDefault();

        const data = await browser.storage.local.get();
        const switchportTemplateOriginal = _.get(data, SWITCHPORT_TEMPLATE_ORIGINAL_STORAGE_KEY, {});

        await browser.storage.local.set({[SWITCHPORT_TEMPLATE_STORAGE_KEY]: switchportTemplateOriginal});

        console.log(resetTemplate);
        // const selectedProps = sortable2.toArray();
        const templatePropsData = {
            originalTemplate: switchportTemplateOriginal,
            template: switchportTemplateOriginal.template,
            defaultProps: getDefaultTemplateProps(),
            selectedProps: getDefaultTemplateProps(),
        };

        // await updateUI();
        await browser.storage.local.set({[SWITCHPORT_TEMPLATE_PROPS_STORAGE_KEY]: templatePropsData});

        updateUI();
    }

    return {
        updateTemplate,
        resetTemplate,
    };
}

const generateFullTemplate = (originalTemplate, propsList) => {
    const fragment = createDocumentFragmentFromString(originalTemplate);
    const stateDivs = [...fragment.querySelectorAll('.switchport-state')];
    const templateStr = getPropsTemplateChunk(propsList);

    stateDivs.forEach(div => {
        div.innerHTML = templateStr;
    });

    const finalHtml = getDocumentFragmentInnerHtml(fragment);

    return beautify.html(
        finalHtml,
        {
            indent_size: 2,
            wrap_attributes: 'force-expand-multiline',
        },
    );
}

async function updateUI() {
    let commands = await browser.commands.getAll();

    for (let command of commands) {
        if (command.name === commandName) {
            document.querySelector(inputSelector).value = command.shortcut;
        }
    }

    const data = await browser.storage.local.get();

    const switchportTemplateOriginal = _.get(data, SWITCHPORT_TEMPLATE_ORIGINAL_STORAGE_KEY, {});
    const switchportTemplate = _.get(data, SWITCHPORT_TEMPLATE_STORAGE_KEY, {});

    const {updateTemplate, resetTemplate} = await processSwitchportTemplateData(switchportTemplateOriginal.template);

    document.querySelector('#saveTemplate').addEventListener('click', updateTemplate);
    document.querySelector('#resetTemplate').addEventListener('click', resetTemplate);

    // document.querySelector(switchportTemplateSelector).value = beautify.html(
    //     switchportTemplate.template || switchportTemplateOriginal.template,
    //     {
    //         indent_size: 2,
    //         wrap_attributes: 'force-expand-multiline',
    //     },
    // );

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
    updateUI();
}

async function resetTemplate($event) {
    $event.preventDefault();

    const data = await browser.storage.local.get();
    const switchportTemplateOriginal = _.get(data, SWITCHPORT_TEMPLATE_ORIGINAL_STORAGE_KEY, {});

    await browser.storage.local.set({[SWITCHPORT_TEMPLATE_STORAGE_KEY]: switchportTemplateOriginal});
    await updateUI();
}

const getPropsTemplateChunk = (propsList) => {
    return propsList.reduce(
        (acc, prop) => {
            const data = TEMPLATE_PROP_DATA[prop];

            let ngString = `port.${data.prop}`;

            if (data.fallback) {
                ngString = `(${ngString} || port.${data.fallback})`;
            }

            if (data.filter) {
                ngString = `${ngString} | ${data.filter}`;
            }

            if (data.prefix) {
                ngString = `("${data.prefix}" + ${ngString})`;
            }

            if (data.propToCheck) {
                ngString = `(port.${data.propToCheck} ? ${ngString} : '&nbsp;')`;
            } else {
                ngString = `(${ngString}) || '&nbsp;'`;
            }

            return `${acc}\n<div>{{ ${ngString} }}</div>`;
        },
        '',
    );
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
        addElementToUl(parentEl, propToElement(prop), propToPropsList(prop));
    });
}

const generateAvailablePropsList = (parentEl) => {
    generatePropsList(
        parentEl,
        SWITCHPORT_TEMPLATE_PROP,
        prop => TEMPLATE_PROP_LABEL[prop],
        prop => ({[DATA_PROP]: prop}),
    );
};

const generateSelectedPropsList = (parentEl, selectedProps) => {
    generatePropsList(
        parentEl,
        selectedProps,
        prop => TEMPLATE_PROP_LABEL[prop],
        prop => ({[DATA_PROP]: prop}),
    );
};

const generatePropsPreviewList = (parentEl, selectedProps) => {
    generatePropsList(
        parentEl,
        selectedProps,
        prop => TEMPLATE_PROP_DATA[prop].testValue,
    );
};

const awaitTimeout = (delayInMs, resolveValue = true) => {
    return new Promise(resolve => {
        setTimeout(() => {resolve(resolveValue)}, delayInMs);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    updateUI();

    document.querySelector('#updateShortcut').addEventListener('click', updateShortcut);
    document.querySelector('#resetShortcut').addEventListener('click', resetShortcut);

    document.querySelector('#replaceTextareaCursor').addEventListener('change', updateResetTextareaCursorValue);
});
