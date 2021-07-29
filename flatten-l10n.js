const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const argv = require('yargs')(process.argv.slice(2))
    .usage('Usage: $0 -f [filename] -l [lang]')
    .demandOption(['f'])
    .argv;

const filename = argv.f;
const lang = argv.l || 'en';

if (!fs.existsSync(filename)) {
    console.log(`Passed file (${filename}) does not exist`);
    process.exit(-1);
}

const extensionL10n = path.join(__dirname, 'app', '_locales', lang, 'messages.json');

if (!fs.existsSync(extensionL10n)) {
    console.log(`messages.json file for the "${lang}" language does not exist`);
    process.exit(-1);
}

const jsonStr = fs.readFileSync(filename, {encoding: 'utf-8'});
const messagesStr = fs.readFileSync(extensionL10n, {encoding: 'utf-8'});

const flattenL10nJson = (obj, prefix = '') => {
    const keys = Object.keys(obj);

    return keys.reduce(
        (acc, key) => {
            const _key = prefix
                ? `${prefix}.${key}`
                : key;

            if (_.isString(obj[key])) {
                acc[_key] = obj[key];

                return acc;
            }

            return {
                ...acc,
                ...flattenL10nJson(obj[key], _key),
            };
        },
        {},
    );
}

// const formatAsL10n = (flatL10n) => {
//     return ```
// {
//
// }
//     ```
// }

try {
    const data = JSON.parse(jsonStr);
    const messagesJson = JSON.parse(messagesStr);

    const flattenedL10n = flattenL10nJson(data);

    const updatedJson = _.reduce(
        flattenedL10n,
        (acc, value, key) => {
            // Message ID restrictions
            // @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference
            const chunks = key.split(/\./).map(chunk => _.camelCase(chunk));
            const _key = chunks.join('_');

            return {
                ...acc,
                [_key]: {
                    message: value,
                },
            };
        },
        messagesJson,
    );

    _.forEach(flattenedL10n, (value, key) => {
        const chunks = key.split(/\./).map(chunk => _.camelCase(chunk));
        const _key = chunks.join('_');

        process.stdout.write(`${_key}: getL10n('${_key}'),\n`);
    });
    //
    // console.log(
    //     _.mapValues(flattenedL10n, (value, key) => `getL10n('${key}')`)
    // );

    fs.writeFileSync(extensionL10n, JSON.stringify(updatedJson, null, 2));
} catch (error) {
    console.log(`Failed to decode file contents: ${error}`);
    process.exit(-1);
}
