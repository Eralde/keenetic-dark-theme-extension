export const THEME_IS_ENABLED_KEY = 'DARK_THEME_IS_ENABLED';
export const MENU_ANIMATIONS_KEY = 'MENU_ANIMATIONS_ENABLED';
export const UI_EXTENSIONS_KEY = 'UI_EXTENSIONS_ENABLED';

export const THEME_IS_ENABLED_WINDOW_PROP = 'themeIsEnabled';
export const MENU_ANIMATIONS_WINDOW_PROP = 'menuAnimationsEnabled';
export const UI_EXTENSIONS_WINDOW_PROP = 'uiExtensionsEnabled';

export const LEGACY_STYLES = {
    'theme-2.x': 'styles/theme-2.x.css',
    'uiExtensions-2.x': 'styles/uiExtensions-2.x.css',
    '2_11': 'styles/2_11.css',
};

export const STYLES_3X = {
    'theme-3.x': 'styles/theme-3.x.css',
    'uiExtensions-3.x': 'styles/uiExtensions-3.x.css',
    'uiExtensions-3.x--no-menu-animation': 'styles/uiExtensions-3.x--no-menu-animation.css',
    'hideUiExtensions-3.x': 'styles/hideUiExtensions-3.x.css',
};

export const STYLES_2X = {
    'theme-2.x': 'styles/theme-2.x.css',
    'uiExtensions-2.x': 'styles/uiExtensions-2.x.css',
    'hideUiExtensions-2.x': 'styles/hideUiExtensions-2.x.css',
};

export const ICON_SIZES = [16, 24, 32, 48];
export const ENABLED_ICON_PREFIX = './images/K-black_';
export const DISABLED_ICON_PREFIX = './images/K-grey_';

export const ENABLED_ICONS = ICON_SIZES.reduce(
    (acc, size) => ({...acc, [String(size)]: `${ENABLED_ICON_PREFIX}${size}.png`}),
    {},
);

export const DISABLED_ICONS = ICON_SIZES.reduce(
    (acc, size) => ({...acc, [String(size)]: `${DISABLED_ICON_PREFIX}${size}.png`}),
    {},
);

export const HIDE_CLASS = '__hidden';
export const FILTERS_ARE_VISIBLE_CLASS = '__filters-are-visible';
export const FLEX_ROW_CLASS = '__flex-row';
export const NDM_LAYOUT_THEME_CLASS = 'ndm-layout--dark-theme';
export const HIDDEN_TABLE_ROW_CLASS = 'hidden-table-row';

export const DEVICE_SETTINGS_PROP = 'DEVICE_SETTINGS';

export const LOCAL_STORAGE_KEY = 'flags';

export const FLAGS = {
    HIDE_UNREGISTERED_HOSTS: 'hideUnregisteredHosts',
    HIDE_HOSTS_BLOCKED_BY_MAC: 'hideHostsBlockedByMac',
    HIDE_OFFLINE_HOSTS: 'hideOfflineHosts',
    SHOW_FILTERS: 'showFilterCheckboxes',
};

export const FLAG_DEFAULTS = {
    [FLAGS.HIDE_UNREGISTERED_HOSTS]: false,
    [FLAGS.HIDE_HOSTS_BLOCKED_BY_MAC]: false,
    [FLAGS.HIDE_OFFLINE_HOSTS]: false,
    [FLAGS.SHOW_FILTERS]: false,
};

export const UNREG_DEVICES_FLAGS = [FLAGS.HIDE_UNREGISTERED_HOSTS];
export const REG_DEVICES_FLAGS = [
    FLAGS.HIDE_HOSTS_BLOCKED_BY_MAC,
    FLAGS.HIDE_OFFLINE_HOSTS,
];

export const FW2X_BRANCHES = [
    '1.4',
    '1.5',
    '1.6',
];

export const FW3X_BRANCHES = [
    '1.7',
    '1.8',
    '3.1',
    '3.2',
    '3.3',
    '3.4',
    '3.5',
    '3.6',
];

export const NO_TAG = 'NO_TAG';
export const DASHBOARD_TITLE = 'menu.dashboard';
export const LOG_LINK_TITLE = 'diagnostics.log.header-title';
export const REBOOT_LINK_TITLE = 'system.reboot.button';

export const MOUSEOVER_INTERCEPTED_DATA_ATTR = 'mouseoverIntercepted';

export const FILTERS_TOGGLE_CLASS = 'show-filter-checkboxes';

export const LOG_LINK_CLASS = 'log-link';
export const REBOOT_LINK_CLASS = 'reboot-link';
export const SAVE_LOG_BTN_CLASS = 'save-log-btn';

export const DASHBOARD_STATE = 'dashboard';
export const WIFI_CLIENTS_STATE = 'controlPanel.wifiClients';
export const DEVICES_LIST_STATE = 'controlPanel.devicesList';
export const POLICIES_STATE = 'controlPanel.policies';
export const CONTROL_SYSTEM_STATE = 'controlPanel.system';
export const DIAGNOSTICS_LOG_STATE = 'controlPanel.diagnostics.log';
export const WEBCLI_STATE = 'cli';
export const LOGIN_STATE = 'login';

export const NDM_PAGE_SELECTOR = '.ndm-page';
export const NDM_MENU_SELECTOR = '.ndm-menu';

export const BACKGROUND_PAGE_INITIALIZED_EVENT = 'BACKGROUND_PAGE_INITIALIZED_EVENT';
export const TOGGLE_UI_EXTENSIONS_EVENT = 'TOGGLE_UI_EXTENSION';
export const TOGGLE_UI_EXTENSIONS_RECEIVED_EVENT = 'TOGGLE_UI_EXTENSION_RECEIVED';

