const adapters = {
    metamask: require('./adapters/metamask'),
    binancewallet: require('./adapters/binancewallet'),
    trustwallet: require('./adapters/trustwallet'),
    walletconnect: require('./adapters/walletconnect')
}

module.exports = getAdapter = (adapter) => {
    return adapters[adapter]();
}