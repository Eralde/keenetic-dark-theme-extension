import * as _ from 'lodash';

import {
    FLAGS,
} from './constants.js';

const ACL_TYPE = {
    PERMIT: 'permit',
    DENY: 'deny',
    NONE: 'none',
};

/**
 * @param {object} host
 * @param {object} acl
 * @returns {boolean}
 */
export const isHostBlockedByAcl = (host, acl) => {
    return acl.type === ACL_TYPE.PERMIT && !acl.address.includes(host.mac)
        || (acl.type === ACL_TYPE.DENY && acl.address.includes(host.mac));
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

export const processAclConfigurations = (aclVars, registeredHosts, aclConfiguration) => {
    const acls = _.filter(aclConfiguration.segments, x => x.acl.type !== ACL_TYPE.NONE);

    const blockedInSegment = _.reduce(
        acls,
        (acc, segmentAcl) => {
            const {description, acl, id} = segmentAcl;
            const hosts = registeredHosts
                .filter(h => isHostBlockedByAcl(h, acl))
                .map(h => h.mac);

            return {
                ...acc,
                [id]: {hosts, description},
            };
        },
        {},
    );

    const blockedInSomeSegment = _
        .chain(blockedInSegment)
        .flatMap(item => item.hosts)
        .uniq()
        .value();

    return {
        blockedInSegment,
        blockedInSomeSegment,
    };
}
