module.exports = createAdapter = () => {
    const provider = window.BinanceChain;
    const connect = async () => {
        return new Promise(async (resolve, reject) => {
            try {
                provider.request({ method: 'eth_requestAccounts' })
                .then((accounts) => {
                    resolve(accounts[0]);
                })
                .catch(error => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    return {
        key: 'binancewallet',
        name: 'Binance Wallet',
        type: 'browser',
        provider,
        connect,
        download: 'https://chrome.google.com/webstore/detail/binance-wallet/fhbohimaelbohpjbbldcngcnapndodjp'
    }
}