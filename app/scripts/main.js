if (window.NDM && window.angular) {
    window.postMessage({action: 'NDM_CHECK', payload: window.NDM}, '*');

    const ndmVersion = window.NDM ? window.NDM.version : '';
    window.postMessage({action: 'NDM_VER', payload: ndmVersion}, '*');
}
