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
        key: 'metamask',
        name: 'MetaMask',
        type: 'browser',
        provider,
        connect,
        deepLink: 'https://provider.app.link/dapp/',
        download: 'https://metamask.io/download/'
    }
}