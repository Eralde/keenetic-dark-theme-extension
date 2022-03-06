import * as _ from 'lodash';
import {
    REBOOT_SECTION_TEMPLATE_PATH,
    SHOW_RC_SYSTEM_REBOOT,
    SYSTEM_REBOOT_SCHEDULE,
} from '../lib/constants';
import {injectStringIntoTemplate} from '../lib/ngTemplate';
import {getL10n} from '../lib/l10nUtils';
import {getAngularService, getElementController, getElementScope, onLanguageChange} from '../lib/ndmUtils';
import rebootScheduleTemplate from '../../pages/ui/reboot-schedule/reboot-schedule.html';

const router = getAngularService('router');
const rebootService = getAngularService('rebootService');

const REBOOT_SECTION_CLASS = 'system__reboot-section';
const REBOOT_SECTION_SELECTOR = `.${REBOOT_SECTION_CLASS}`;

const addRebootScheduleSelectbox = () => {
    injectStringIntoTemplate(
        REBOOT_SECTION_TEMPLATE_PATH,
        rebootScheduleTemplate,
        [
            'system__reboot-section',
            '<ndm-text',
        ],
        'failed to determine proper place to inject reboot schedule selectbox',
    );

    rebootService.request = {
        initialPaths: [
            SHOW_RC_SYSTEM_REBOOT,
        ],
    };
};

const patchRebootSectionController = async () => {
    const vm = await getElementController(REBOOT_SECTION_SELECTOR);
    const $scope = await getElementScope(REBOOT_SECTION_SELECTOR);

    vm.isLocked = true;

    const updateL10n = () => {
        vm.l10n = {
            rebootScheduleLabel: getL10n('rebootScheduleLabel'),
            rebootScheduleNoScheduleOption: getL10n('rebootScheduleNoScheduleOption'),
        }
    };

    const unbinder = onLanguageChange(() => updateL10n());

    updateL10n();
    $scope.$on('$destroy', unbinder);

    vm.initialRequestCallbackId = vm.requester.registerCallback(
        rebootService.request.initialPaths,
        (responses) => {
            vm.rebootSchedule = _.get(responses, `[0].${SHOW_RC_SYSTEM_REBOOT}.schedule`, '');

            _.invoke(vm, 'rebootScheduleForm.$setPristine');

            vm.isLocked = false;
        },
        true,
    );

    vm.save = () => {
        const query = vm.rebootSchedule
            ? _.set({}, SYSTEM_REBOOT_SCHEDULE, vm.rebootSchedule)
            : {parse: 'system no reboot schedule'};

        return router.postToRciRoot(query);
    };
}

export const rebootSchedule = {
    onInit: addRebootScheduleSelectbox,
    onLoad: patchRebootSectionController,
};