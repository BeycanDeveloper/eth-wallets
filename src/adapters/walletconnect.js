module.exports = createAdapter = () => {
    const {infuraId, selectedNetwork} = require('../index.js');
    const WalletConnectProvider = require('@walletconnect/web3-provider').default;

    const rpcIdMapping = {};
    rpcIdMapping[selectedNetwork.id] = selectedNetwork.rpcUrl;

    const provider =  new WalletConnectProvider({
        infuraId,
        rpc: rpcIdMapping,
        qrcodeModalOptions: {
            mobileLinks: [
                "metamask",
                "trust",
                //"rainbow",
                //"argent",
                //"imtoken",
                //"pillar",
            ],
            desktopLinks: []
        }
    });

    const connect = async () => {
        return new Promise(async (resolve, reject) => {
            provider.enable()
            .then((accounts) => {
                resolve(accounts[0]);
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    return {
        key: 'walletconnect',
        name: 'WalletConnect',
        type: 'qr',
        provider,
        connect
    }
}