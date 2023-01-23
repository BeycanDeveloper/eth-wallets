module.exports = createAdapter = () => {
    const {infuraId, selectedNetwork} = require('../index.js');
    const WalletConnectProvider = require('@walletconnect/web3-provider').default;

    // function isLocalHost() {
    //     return location.hostname === "localhost" || location.hostname === "127.0.0.1";
    // }

    // function checkNetwork(network) {
    //     if (isLocalHost() && network.hexId == "0x61") {
    //         return false;
    //     }
    //     return true;
    // }
    // Object.values(networks).forEach((network) => {
    //     if (!checkNetwork(network)) return;
    //     rpcIdMapping[network.id] = network.rpcUrl;
    // });

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
    
    provider.on('disconnect', () => {
        localStorage.removeItem('walletconnect');
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