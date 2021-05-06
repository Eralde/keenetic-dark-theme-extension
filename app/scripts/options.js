import * as _ from 'lodash';
import * as beautify from 'js-beautify';
import {
    REPLACE_TEXTAREA_CURSOR_STORAGE_KEY,
    SWITCHPORT_TEMPLATE_ORIGINAL_STORAGE_KEY,
    SWITCHPORT_TEMPLATE_STORAGE_KEY,
} from './lib/constants';

const inputSelector = '#shortcut';
const switchportTemplateSelector = '#template';
const commandName = 'toggle-theme';

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

    document.querySelector(switchportTemplateSelector).value = beautify.html(
        switchportTemplate.template || switchportTemplateOriginal.template,
        {
            indent_size: 2,
            wrap_attributes: 'force-expand-multiline',
        },
    );

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

async function updateTemplate($event) {
    $event.preventDefault();

    const template = document.querySelector(switchportTemplateSelector).value;

    const data = await browser.storage.local.get();
    const switchportTemplateOriginal = _.get(data, SWITCHPORT_TEMPLATE_ORIGINAL_STORAGE_KEY, {});

    const {prefix, suffix} = switchportTemplateOriginal;
    await browser.storage.local.set({[SWITCHPORT_TEMPLATE_STORAGE_KEY]: {prefix, suffix, template}});
}

async function resetTemplate($event) {
    $event.preventDefault();

    const data = await browser.storage.local.get();
    const switchportTemplateOriginal = _.get(data, SWITCHPORT_TEMPLATE_ORIGINAL_STORAGE_KEY, {});

    await browser.storage.local.set({[SWITCHPORT_TEMPLATE_STORAGE_KEY]: switchportTemplateOriginal});
    await updateUI();
}

document.addEventListener('DOMContentLoaded', () => {
    updateUI();

    document.querySelector('#updateShortcut').addEventListener('click', updateShortcut);
    document.querySelector('#resetShortcut').addEventListener('click', resetShortcut);

    document.querySelector('#saveTemplate').addEventListener('click', updateTemplate);
    document.querySelector('#resetTemplate').addEventListener('click', resetTemplate);

    document.querySelector('#replaceTextareaCursor').addEventListener('change', updateResetTextareaCursorValue);
});
