import * as _ from 'lodash';
import {getAngularService} from './ndmUtils';
import {l10n} from './l10n';

export const DEFAULT_LOCALE = 'en';

export const getL10n = (msg, locale = '') => {
    let _locale = locale;

    if (!locale) {
        const language = getAngularService('language');

        _locale = _.get(language, 'getRealLanguage')
            ? language.getRealLanguage()
            : DEFAULT_LOCALE;
    }

    return _.get(l10n, `${_locale}.${msg}`)
        || _.get(l10n, `${DEFAULT_LOCALE}.${msg}`);
};
