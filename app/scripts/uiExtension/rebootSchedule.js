import * as _ from 'lodash';
import {
    REBOOT_SECTION_TEMPLATE_PATH,
    SYSTEM_REBOOT,
    SHOW_RC_SYSTEM_REBOOT,
} from '../lib/constants';
import {injectStringIntoTemplate} from '../lib/ngTemplate';
import {getL10n} from '../lib/l10nUtils';
import {getAngularService, getElementController, getElementScope, onLanguageChange} from '../lib/ndmUtils';
import rebootScheduleTemplate from '../../pages/ui/reboot-schedule/reboot-schedule.html';

const $q = getAngularService('$q');
const router = getAngularService('router');

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

    vm.requester.registerCallback(
        [SHOW_RC_SYSTEM_REBOOT],
        (responses) => {
            vm.rebootSchedule = _.get(responses, `[0].${SHOW_RC_SYSTEM_REBOOT}.schedule`, '');

            _.invoke(vm, 'rebootScheduleForm.$setPristine');

            vm.isLocked = false;
        },
        true,
    );

    const originalSave = vm.save;

    vm.save = () => {
        const original$ = _.isFunction(originalSave)
            ? $q.when(originalSave())
            : $q.when(true);

        return original$.then(() => {
            const query = vm.rebootSchedule
                ? _.set({}, SYSTEM_REBOOT, {schedule: vm.rebootSchedule})
                : _.set({}, SYSTEM_REBOOT, {schedule: '', no: true});

            return router.postToRciRoot(query);
        });
    };
}

export const rebootSchedule = {
    onInit: addRebootScheduleSelectbox,
    onLoad: patchRebootSectionController,
};