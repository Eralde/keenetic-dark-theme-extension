const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const LOCALES_PATH = './app/_locales/';

const getLocalesList = () => fs.readdirSync(LOCALES_PATH);

const readLocaleJson = (locale) => {
    const filename = path.resolve(`./app/_locales/${locale}/messages.json`);
    const file = fs.readFileSync(filename);

    return JSON.parse(file);
};

const toL10nJs = (localeJson) => _.mapValues(localeJson, msgObj => msgObj.message);

const l10n = getLocalesList()
    .reduce(
        (acc, locale) => {
            const localeL10n = toL10nJs(readLocaleJson(locale));

            return {...acc, [locale]: localeL10n};
        },
        {},
    );

fs.writeFileSync(`./app/scripts/lib/l10n.js`, `export const l10n = ${JSON.stringify(l10n)};`);
