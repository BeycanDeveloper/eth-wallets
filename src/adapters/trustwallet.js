module.exports = createAdapter = () => {
    const provider = window.ethereum;
    const switcher = require('./switcher.js')(provider);

    const connect = async () => {
        return new Promise(async (resolve, reject) => {
            try {
                provider.request({ method: 'eth_requestAccounts' })
                .then(async (accounts) => {
                    switcher.maybeSwitch()
                    .then(() => {
                        resolve(accounts[0]);
                    })
                    .catch((error) => {
                        reject(error);
                    });
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
        key: 'trustwallet',
        name: 'Trust Wallet',
        type: 'mobile',
        provider,
        connect,
        deepLink: "https://link.trustwallet.com/open_url?coin_id=60&url=",
        download: 'https://trustwallet.com/download'
    }
}