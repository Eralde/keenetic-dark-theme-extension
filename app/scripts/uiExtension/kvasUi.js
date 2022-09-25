import * as ndmUtils from '../lib/ndmUtils';
import kvasUiPageTemplate from '../../pages/ui/kvas-ui/kvas-ui.html';
import {getAngularService} from '../lib/ndmUtils';
import {KvasUiController} from './kvasUi/kvas-ui.controller';

const menuService = getAngularService('menuService');
const $stateRegistry = ndmUtils.getAngularService('$stateRegistry');

const origGetMenu = menuService.getMenu;

const KVAS_UI_STATE = 'controlPanel.kvas';

const addKvasUiPageState = () => {
    $stateRegistry.register({
        name: KVAS_UI_STATE,
        menuTitle: 'kvas',
        url: '/kvas',
        views: {
            templateUrl: 'app/page/controlPanel/controlPanel.html',
            'cp-main': {
                template: kvasUiPageTemplate,
                controller: KvasUiController,
                controllerAs: 'vm',
            },
        },
    });

    menuService.getMenu = () => {
        return origGetMenu().then(menuContents => {
            const kvasUiItem = {
                menuTitle: 'kvas',
                url: '/kvas',
                sref: KVAS_UI_STATE,
            };

            // const statusGroup = menuContents['menu.dashboard'];
            // console.log(statusGroup);
            // statusGroup.points[kvasUiStateName] = kvasUiItem;
            menuContents[KVAS_UI_STATE] = kvasUiItem;

            return menuContents;
        });
    };
}

export const addKvasUiPage = {
    onAuth: addKvasUiPageState,
};