module.exports = switcher = (provider) => {
    const {selectedNetwork} = require('../index.js');
    const {isNumeric, hex} = require('../utils.js');


    this.addNetwork = (network) => {
        return new Promise(async (resolve, reject) => {
            try {
                provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: network.hexId,
                        chainName: network.name,
                        rpcUrls: [network.rpcUrl],
                        nativeCurrency: network.nativeCurrency,
                        blockExplorerUrls: [network.explorerUrl]
                    }],
                })
                .then(() => {
                    resolve(true);
                })
                .catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    this.changeNetwork = (network) => {
        network = JSON.parse(JSON.stringify(network));
        return new Promise(async (resolve, reject) => {
            provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: network.hexId }],
            })
            .then(() => {
                resolve(true);
            })
            .catch((error) => {
                if (error.code === 4902) {
                    this.addNetwork(network)
                    .then(() => {
                        resolve(true);
                    })
                    .catch((error) => {
                        reject(error);
                    });
                } else {
                    reject(error);
                }
            });
        });
    }

    this.getChainHexId = async () => {
        let id = await provider.request({method: 'eth_chainId'});
        if (isNumeric(id)) return hex(id);
        return id;
    }

    this.maybeSwitch = () => {
        return new Promise(async (resolve, reject) => {
            if (await this.getChainHexId() != selectedNetwork.hexId) {
                this.changeNetwork(selectedNetwork)
                .then(() => {
                    resolve(true);
                })
                .catch((error) => {
                    reject(error);
                });
            } else {
                resolve(true);
            }
        });
    }

    return this;
}