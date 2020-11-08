import {getAngularService, getProp} from './ndmUtils';
import {l10n} from './l10n';

export const DEFAULT_LOCALE = 'en';

export const getL10n = (msg, locale = '') => {
    let _locale = locale;

    if (!locale) {
        const language = getAngularService('language');

        _locale = getProp(language, 'getRealLanguage') ? language.getRealLanguage() : DEFAULT_LOCALE;
    }

    return getProp(l10n, `${_locale}.${msg}`) || getProp(l10n, `${DEFAULT_LOCALE}.${msg}`)
};
