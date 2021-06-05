import {LOG_PREFIX} from './constants';

export const logWarning = (...args) => {
    console.warn(LOG_PREFIX, ...args);
}
