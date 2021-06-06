// popup events/flags
export const THEME_IS_ENABLED_KEY = 'DARK_THEME_IS_ENABLED';
export const UI_EXTENSIONS_KEY = 'UI_EXTENSIONS_ENABLED';
export const MENU_ANIMATIONS_KEY = 'MENU_ANIMATIONS_ENABLED';

export const TOGGLE_DEFAULT_VALUES = {
    [THEME_IS_ENABLED_KEY]: true,
    [UI_EXTENSIONS_KEY]: true,
    [MENU_ANIMATIONS_KEY]: false,
}

export const THEME_IS_ENABLED_WINDOW_PROP = 'themeIsEnabled';
export const UI_EXTENSIONS_WINDOW_PROP = 'uiExtensionsEnabled';
export const MENU_ANIMATIONS_WINDOW_PROP = 'menuAnimationsEnabled';

// theme & UI extensions CSS files
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

// extension icons
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

// UI extension: device filters
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

// END UI extension: device filters

export const FW2X_BRANCHES = [
    '1.4',
    '1.5',
    '1.6',
];

export const OLD_FW3X_BRANCHES = [
    '1.7',
    '1.8',
]

export const FW3X_WITHOUT_SWITCHPORT_OVERLOAD = [
    ...OLD_FW3X_BRANCHES,
    '3.1',
    '3.2',
    '3.3',
]

export const NO_TAG = 'NO_TAG';

export const MOUSEOVER_INTERCEPTED_DATA_ATTR = 'mouseoverIntercepted';

export const DASHBOARD_SWITCHPORTS_TEMPLATE_PATH = 'app/page/dashboard/card_switchports.html';
export const SYSTEM_SWITCHPORTS_TEMPLATE_PATH = 'app/page/controlPanel/control/system/switchports/switchports.html';
export const OTHER_CONNECTIONS_TEMPLATE_PATH = 'app/page/controlPanel/myInternet/otherConnections/otherConnections.html';
export const NDM_TEXTAREA_TEMPLATE_PATH = 'app/components/ndm-textarea/ndm-textarea.html';

export const DSL_STATS_FILENAME = 'proc:/driver/ensoc_dsl/dsl_stats';

// l10n IDs
export const DASHBOARD_TITLE = 'menu.dashboard';
export const LOG_LINK_TITLE = 'diagnostics.log.header-title';
export const REBOOT_LINK_TITLE = 'system.reboot.button';

// CSS classes
export const FILTERS_TOGGLE_CLASS = 'show-filter-checkboxes';
export const LOG_LINK_CLASS = 'log-link';
export const REBOOT_LINK_CLASS = 'reboot-link';
export const DSL_DIAGNOSTICS_LINK_CLASS = 'dsl-diagnostics-link';
export const SAVE_LOG_BTN_CLASS = 'save-log-btn';

// CSS selectors
export const NDM_PAGE_SELECTOR = '.ndm-page';
export const NDM_MENU_SELECTOR = '.ndm-menu';

// ui-router states
export const DASHBOARD_STATE = 'dashboard';
export const WIFI_CLIENTS_STATE = 'controlPanel.wifiClients';
export const DEVICES_LIST_STATE = 'controlPanel.devicesList';
export const POLICIES_STATE = 'controlPanel.policies';
export const CONTROL_SYSTEM_STATE = 'controlPanel.system';
export const DIAGNOSTICS_STATE = 'controlPanel.diagnostics';
export const DIAGNOSTICS_LOG_STATE = 'controlPanel.diagnostics.log';
export const OTHER_CONNECTIONS_STATE = 'controlPanel.otherConnections';
export const WEBCLI_STATE = 'cli';
export const LOGIN_STATE = 'login';

// extension events
export const BACKGROUND_PAGE_INITIALIZED_EVENT = 'BACKGROUND_PAGE_INITIALIZED_EVENT';
export const TOGGLE_UI_EXTENSIONS_EVENT = 'TOGGLE_UI_EXTENSION';
export const TOGGLE_UI_EXTENSIONS_RECEIVED_EVENT = 'TOGGLE_UI_EXTENSION_RECEIVED';
export const RELOAD_PAGES_WITH_OVERRIDDEN_SWITCHPORTS = 'RELOAD_PAGES_WITH_OVERRIDDEN_SWITCHPORTS';
export const INJECTED_JS_INITIALIZED = 'INJECTED_JS_INITIALIZED';
export const ORIGINAL_SWITCHPORTS_TEMPLATE = 'ORIGINAL_SWITCHPORTS_TEMPLATE';
export const INITIAL_STORAGE_DATA = 'INITIAL_STORAGE_DATA';

// storage keys
export const SWITCHPORT_TEMPLATE_DATA_KEY = 'switchportTemplate';
export const DASHBOARD_SWITCHPORT_TEMPLATE_ORIGINAL_KEY = 'dashboardSwitchportTemplate';
export const SYSTEM_SWITCHPORT_TEMPLATE_ORIGINAL_KEY = 'systemSwitchportTemplate';
export const SWITCHPORT_TEMPLATE_PROPS_STORAGE_KEY = 'switchportTemplateProps';

export const REPLACE_TEXTAREA_CURSOR_STORAGE_KEY = 'replaceTextareaCursor';
export const NDM_SWITCHPORT_CONTAINER_TAG = 'ndm-switchport-container';

export const STORAGE_DEFAULTS = {
    [REPLACE_TEXTAREA_CURSOR_STORAGE_KEY]: true,
};

export const LOG_PREFIX = '[Keenetic Dark Theme Extension]:';

// switchport template

export const SWITCHPORT_TEMPLATE_PROP = {
    PORT_ID: 'port',
    DESCRIPTION: 'description',
    DUPLEX: 'duplex',
    SPEED: 'speed',
    TXBYTES: 'txbytes',
    RXBYTES: 'rxbytes',
    TXERRORS: 'txerrors',
    RXERRORS: 'rxerrors',
    SEPARATOR: 'separator',
}

export const TEMPLATE_PROP_DATA = {
    [SWITCHPORT_TEMPLATE_PROP.DUPLEX]: {
        label: 'Duplex',
        prop: 'duplex',
        previewValue: 'FDX',
    },
    [SWITCHPORT_TEMPLATE_PROP.SPEED]: {
        label: 'Speed',
        prop: 'speed',
        previewValue: '100M',
    },
    [SWITCHPORT_TEMPLATE_PROP.TXBYTES]: {
        label: 'Transmitted bytes',
        prop: 'txbytes-formatted-short',
        propToCheck: 'txbytes',
        prefix: 'TX ',
        previewValue: 'TX 2.2 GB',
        className: 'kdte-small-row',
    },
    [SWITCHPORT_TEMPLATE_PROP.RXBYTES]: {
        label: 'Received bytes',
        prop: 'rxbytes-formatted-short',
        propToCheck: 'rxbytes',
        prefix: 'RX ',
        previewValue: 'RX 3.5 GB',
        className: 'kdte-small-row',
    },
    [SWITCHPORT_TEMPLATE_PROP.TXERRORS]: {
        label: 'TX errors',
        prop: 'txerrors',
        propToCheck: 'txerrors',
        prefix: 'TXErr ',
        previewValue: 'TXErr 0',
        className: 'kdte-small-row'
    },
    [SWITCHPORT_TEMPLATE_PROP.RXERRORS]: {
        label: 'RX errors',
        prop: 'rxerrors',
        propToCheck: 'rxerrors',
        prefix: 'RXErr ',
        previewValue: 'RXErr 0',
        className: 'kdte-small-row',
    },
    [SWITCHPORT_TEMPLATE_PROP.DESCRIPTION]: {
        label: 'Description',
        prop: 'interfaceDescription',
        alias: 'description',
        fallback: 'name',
        previewValue: 'my desc.',
        className: 'ellipsis',
        valueProps: {
            'style': 'max-width: 7ch;',
            'title': '{{port.interfaceDescription}}',
        },
    },
    [SWITCHPORT_TEMPLATE_PROP.PORT_ID]: {
        label: 'Port #',
        prop: 'portIconLabel',
        fallback: 'port',
        previewValue: '0',
    },
    [SWITCHPORT_TEMPLATE_PROP.SEPARATOR]: {
        label: 'Separator (empty line)',
        prop: 'foobar',
        previewValue: ' ',
        previewValueProps: {'style': 'min-height: 18px;'}
    },
};

export const WIDE_SWITCHPORT_TEMPLATE_PROPS = [
    SWITCHPORT_TEMPLATE_PROP.TXBYTES,
    SWITCHPORT_TEMPLATE_PROP.RXBYTES,
    SWITCHPORT_TEMPLATE_PROP.TXERRORS,
    SWITCHPORT_TEMPLATE_PROP.RXERRORS,
];

export const __SHOW_INTERFACE_STAT_PROPS__ = [
    'rxpackets',
    'rx-multicast-packets',
    'rx-broadcast-packets',
    'rxbytes',
    'rxerrors',
    'rxdropped',
    'txpackets',
    'tx-multicast-packets',
    'tx-broadcast-packets',
    'txbytes',
    'txerrors',
    'txdropped',
    'timestamp',
    'last-overflow',
    'rxbytes-formatted-short',
    'txbytes-formatted-short',
];

// RCI

export const SHOW_INTERFACE = 'show.interface';
export const SHOW_RC_INTERFACE = 'show.rc.interface';
export const SHOW_INTERFACE_STAT = 'show.interface.stat';
