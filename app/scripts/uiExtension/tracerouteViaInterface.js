import {injectStringIntoTemplate} from '../lib/ngTemplate';
import {MAIN_DIAGNOSTICS_TAB_TEMPLATE_PATH} from '../lib/constants';
import tracerouteViaTemplate from '../../pages/ui/traceroute-via/traceroute-via.html';

const injectViaInterfaceSelectbox = () => {
    injectStringIntoTemplate(
        MAIN_DIAGNOSTICS_TAB_TEMPLATE_PATH,
        tracerouteViaTemplate,
        [
            'disabled=\'diagnostics.tools.isBusy\'',
            '<ndm-details',
            '<ndm-fieldset',
        ],
        'failed to determine proper place to inject "via" selectbox for the traceroute',
    );
};

export const tracerouteViaInterfaceExtension = {
    onInit: injectViaInterfaceSelectbox,
};