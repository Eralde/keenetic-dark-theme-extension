import {
    FLAGS,
} from './constants.js';

/**
 * @param {object} host
 * @param {object} acl
 * @returns {boolean}
 */
export const isHostInAcl = (host, acl) => {
    return acl.type === 'permit' && !acl.address.includes(host.mac)
        || (acl.type === 'deny' && acl.address.includes(host.mac));
};

export const hostFilterConstructor = (flags, isOfflinePredicate, isBlockedInSomeSegmentPredicate) => {
    return host => {
        const hideOfflineHosts = flags.get(FLAGS.HIDE_OFFLINE_HOSTS);
        const hideHostsBlockedByMac = flags.get(FLAGS.HIDE_HOSTS_BLOCKED_BY_MAC);

        const isHostBlockedInSomeSegment = isBlockedInSomeSegmentPredicate(host);
        const isHostOffline = isOfflinePredicate(host);

        if (hideHostsBlockedByMac && isHostBlockedInSomeSegment) {
            return false;
        }

        if (hideOfflineHosts && isHostOffline) {
            return false;
        }

        return true;
    };
};
