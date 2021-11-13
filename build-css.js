const util = require('util');
const path = require('path');
const exec = util.promisify(require('child_process').exec);

const THEME_DIR = path.resolve('./theme');
const CSS_OUTPUT_DIR = path.resolve('./app/styles');

const THEME_CSS_FILE_PREFIXES = [
    'theme-2.x',
    'theme-3.x',
];

const EXTRA_STYLE_FILES = [
    {input: path.join('extra', '3.7.40'), output: 'extra__3_7_40'},
];

const UI_EXTENSIONS_CSS_FILE_PREFIXES = [
    'uiExtensions-2.x',
    'uiExtensions-3.x',
    'uiExtensions-3.x--no-menu-animation',
];

const HIDE_UI_EXTENSIONS_CSS_FILE_PREFIXES = [
    'hideUiExtensions-2.x',
    'hideUiExtensions-3.x',
];

const LEGACY_CSS_FILE_PREFIX = '2_11';

const generateCss = async (css) => await exec(`npx lessc --glob ${THEME_DIR}/${css}.less ${CSS_OUTPUT_DIR}/${css}.css`);
const generateAllThemes = async () => Promise.all(THEME_CSS_FILE_PREFIXES.map(generateCss));
const generateAllUiExtensions = async () => Promise.all(UI_EXTENSIONS_CSS_FILE_PREFIXES.map(generateCss));
const generateAllHideUiExtensions = async () => Promise.all(HIDE_UI_EXTENSIONS_CSS_FILE_PREFIXES.map(generateCss));
const generateLegacyCss = async () => await exec(`npx lessc --glob ${THEME_DIR}/version-specific/${LEGACY_CSS_FILE_PREFIX}.less ${CSS_OUTPUT_DIR}/${LEGACY_CSS_FILE_PREFIX}.css`);

const generateAllExtras = async () => Promise.all(EXTRA_STYLE_FILES.map((item) => {
    return exec(`npx lessc --glob ${THEME_DIR}/${item.input}.less ${CSS_OUTPUT_DIR}/${item.output}.css`);
}));

const build = () => {
    return generateAllThemes()
        .then(generateAllUiExtensions)
        .then(generateAllHideUiExtensions)
        .then(generateLegacyCss)
        .then(generateAllExtras)
        .then(async () => {
            await exec(`npx lessc ${THEME_DIR}/extensionPopup.less ${CSS_OUTPUT_DIR}/popup.css`);
            await exec(`npx lessc ${THEME_DIR}/extensionOptions.less ${CSS_OUTPUT_DIR}/options.css`);
        });
};

build();
