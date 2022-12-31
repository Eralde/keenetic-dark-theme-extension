import {injectStringIntoTemplate} from '../lib/ngTemplate';
import {MAIN_DIAGNOSTICS_TAB_TEMPLATE_PATH} from '../lib/constants';
import tracerouteViaTemplate from '../../pages/ui/traceroute-via/traceroute-via.html';
import {isLegacyVersion} from "../lib/ndmUtils";

const injectViaInterfaceSelectbox = (ndwBranch) => {
    const is2xFirmware = isLegacyVersion(ndwBranch);

    injectStringIntoTemplate(
        MAIN_DIAGNOSTICS_TAB_TEMPLATE_PATH,
        tracerouteViaTemplate,
        [
            'disabled=\'diagnostics.tools.isBusy\'',
            '<ndm-details',
            is2xFirmware
                ? '<fieldset'
                : '<ndm-fieldset',
        ],
        'failed to determine proper place to inject "via" selectbox for the traceroute',
    );
};

export const tracerouteViaInterfaceExtension = {
    onInit: injectViaInterfaceSelectbox,
};
