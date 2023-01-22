class EthWallets {

    static infuraId = null;

    static detectedWallets = {};

    static selectedNetwork = null;

    static connectedWallet = null;

    static connectedAccount = null;

    static instance = (config) => {

        this.infuraId = config.infuraId;

        let networks = require('../resources/mainnets.json');
        if (config.testnets) {
            networks = require('../resources/testnets.json');
        }

        if (typeof config.network == 'object') {
            this.selectedNetwork = config.network;
        } else if (networks[config.network]) {
            this.selectedNetwork = networks[config.network];
        } else {
            throw new Error('Network not found!');
        }
        
        this.detectWallets();
    }

    static connectWallet = (adapter) => {
        return new Promise(async (resolve, reject) => {
            if (this.detectedWallets[adapter]) {
                let wallet = this.detectedWallets[adapter];
                wallet.connect()
                .then(() => {
                    resolve(wallet);
                })
                .catch(error => {
                    reject(error);
                });
            } else {
                reject('wallet-not-found');
            }
        });
    }

    static getDetectedWallets = (filter) => {
        return Object.fromEntries(Object.entries(this.detectedWallets).filter(([key]) => {
            return filter.includes(key);
        }));
    }

    static detectWallets = () => {
        const Wallet = require('./wallet');

        if (typeof window != 'undefined') {
            if (window.ethereum) {
                if (window.ethereum.isMetaMask) {
                    this.detectedWallets['metamask'] = new Wallet('metamask');
                }

                if (window.ethereum.isTrust) {
                    this.detectedWallets['trustwallet'] = new Wallet('trustwallet');
                }
            }
            
            if (window.BinanceChain) {
                this.detectedWallets['binancewallet'] = new Wallet('binancewallet');
            }
        }
        
        this.detectedWallets['walletconnect'] = new Wallet('walletconnect');
    }
}

EthWallets.utils = require('./utils');
EthWallets.Coin = require('./entity/coin');
EthWallets.Token = require('./entity/token');
EthWallets.Transaction = require('./entity/transaction');

module.exports = EthWallets;