export const RESPONSE_STATUS = {
    AUTH_FAILED: 'AUTH_FAILED',
    MALFORMED_RESPONSE: 'MALFORMED_RESPONSE',
    REQUEST_FAILED: 'REQUEST_FAILED',
};

export const UNBLOCK_LIST_ACTION = {
    ADD: 'ADD',
    REMOVE: 'REMOVE',
};

export const UI_ERROR = {
    NO_BACKEND_ADDRESS: 'NO_BACKEND_ADDRESS',
    UI_IS_LOCKED: 'UI_IS_LOCKED',
};

export const KVAS_UI_L10N = {
    backend: {
        address: 'Backend address',
        username: 'Username',
        password: 'Password',
        testConnectionBtn: 'Test backend connection',
    },
    unblockList: {
        refresh: 'Refresh unblock list',
        addHost: 'Add host',
        removeHost: 'Remove host',
    },
    notification: {
        addressIsEmpty: 'Address is empty',
        successfullyConnected: 'Successfully connected to the backend',
        failedToConnectToBackend: 'Failed to connect to the backend',
    },
    backendSettings: {
        hide: 'Hide backend connection settings',
        show: 'Show backend connection settings',
    }
};