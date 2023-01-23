const Web3  = require('web3');
const utils = require('./utils');
const Coin  = require('./entity/coin');
const Token = require('./entity/token');
const Transaction = require('./entity/transaction');
const {selectedNetwork} = require('./index.js');
const getAdapter = require('./get-adapter');

class Wallet {

    web3;

    adapter;

    provider;

    connectedNetwork;
    
    connectedAccount;

    constructor(adapter) {
        this.setAdapter(adapter);
    }

    setAdapter(adapter) {
        this.adapter = getAdapter(adapter);
        this.provider = this.adapter.provider;
    }

    getKey() {
        return this.adapter.key;
    }

    getName() {
        return this.adapter.name;
    }

    getType() {
        return this.adapter.type;
    }

    getDeepLink() {
        return this.adapter.deepLink;
    }

    getProvider() {
        return this.provider;
    }

    request(params) {
        return this.provider.request(params);
    }

    getAccounts() {
        return this.request({ method: 'eth_accounts' });
    }

    async getChainHexId() {
        let id = await this.request({method: 'eth_chainId'});
        if (id == '0x01') return '0x1';
        if (utils.isNumeric(id)) return '0x' + id.toString(16);
        return id;
    };

    async isConnected() {
        return (await this.getAccounts()).length !== 0;
    }

    connect() {
        return new Promise((resolve, reject) => {

            if (this.getKey() == 'walletconnect') {
                this.setAdapter(this.getKey());
            }

            let result = this.connection();

            let time = 0;
            let timeout = 15;
            let timer = setInterval(async () => {
                time += 1;
                if (time > timeout) {
                    clearInterval(timer);
                    reject('timeout');
                }
            }, 1000);

            result.then((connectedAccount) => {
                resolve(connectedAccount);
            })
            .catch((error) => {
                utils.rejectMessage(error, reject);
            })
            .finally(() => {
                clearInterval(timer);
            });
        });
    }

    connection() {
        return new Promise((resolve, reject) => {
            this.adapter.connect()
            .then(async connectedAccount => {
                let chainHexId = await this.getChainHexId();
                if (selectedNetwork.hexId == chainHexId) {
                    this.web3 = new Web3(this.provider);
                    this.connectedAccount = connectedAccount;
                    this.connectedNetwork = selectedNetwork;

                    // EthWallets
                    let EthWallets = require('./index');
                    EthWallets.connectedWallet = this;
                    EthWallets.connectedAccount = connectedAccount;
                    
                    resolve(connectedAccount);
                } else {
                    reject('not-accepted-chain');
                }
            })
            .catch(error => {
                utils.rejectMessage(error, reject);
            });
        })
    }

    sendTransaction(params) {
        return new Promise(async (resolve, reject) => {
            this.request({
                method: 'eth_sendTransaction',
                params,
            })
            .then((transactionId) => {
                resolve(transactionId);
            })
            .catch((error) => {
                utils.rejectMessage(error, reject);
            });
        });
    }

    /**
     * @param {String} to
     * @param {Integer} amount
     * @param {String} tokenAddress
     * @return {Transaction|Object}
     * @throws {Error}
     */
    tokenTransfer(to, amount, tokenAddress) {
        return new Promise((resolve, reject) => {
            try {
                this.validate(to, amount, tokenAddress);
                (new Token(tokenAddress)).transfer(to, amount)
                .then((transactionId) => {
                    resolve(this.transaction(transactionId));
                })
                .catch((error) => {
                    utils.rejectMessage(error, reject);
                });
            } catch (error) {
                utils.rejectMessage(error, reject);
            }
        });
    }

    /**
     * @param {String} to
     * @param {Integer} amount
     * @return {Transaction|Object}
     * @throws {Error}
     */
    coinTransfer(to, amount) {
        return new Promise((resolve, reject) => {
            try {
                this.validate(to, amount);
                (new Coin()).transfer(to, amount)
                .then((transactionId) => {
                    resolve(this.transaction(transactionId));
                })
                .catch((error) => {
                    utils.rejectMessage(error, reject);
                });
            } catch (error) {
                utils.rejectMessage(error, reject);
            }
        });
    }

    /**
     * @param {String} to
     * @param {Integer} amount
     * @param {String|null} tokenAddress
     * @return {Transaction|Object}
     * @throws {Error}
     */
    transfer(to, amount, tokenAddress = null) {
        if (tokenAddress) {
            return this.tokenTransfer(to, amount, tokenAddress);
        } else {
            return this.coinTransfer(to, amount);
        }
    }

    /**
     * @param {Array} abi 
     * @param {String|null} address 
     * @return {Object}
     */
    contract(abi, address = null) {
        if (!address) {
            return this.web3.eth.contract(abi);
        } else {
            return this.web3.eth.contract(abi).at(address);
        }
    }

    /**
     * @param {String} address 
     * @param {Array} abi 
     * @return {Token}
     */
    token(address, abi = null) {
        return new Token(address, abi);
    }

    /**
     * @return {Coin}
     */
    coin() {
        return new Coin();
    }

    /**
     * @param {String} transactionId 
     * @return {Transaction}
     */
    transaction(transactionId) {
        return new Transaction(transactionId, this)
    }
    
    getGasPrice() {
        return new Promise((resolve, reject) => {
            this.web3.eth.getGasPrice(function(err, gasPrice) {
                if (!err) {
                    resolve(utils.hex(gasPrice.toString()));
                } else {
                    utils.rejectMessage(err, reject);
                }
            });
        });
    }

    /**
     * @param {Object} data 
     * @returns 
     */
    getEstimateGas(data) {
        return new Promise((resolve, reject) => {
            this.web3.eth.estimateGas(data, function(err, gas) {
                if (!err) {
                    resolve(utils.hex(gas));
                } else {
                    utils.rejectMessage(err, reject);
                }
            });
        });
    }

    /**
     * @param {String} to
     * @param {Integer} amount
     * @param {String|null} tokenAddress
     * @return {Boolean}
     * @throws {Error}
     */
    validate(to, amount, tokenAddress = null) {
        if (!this.connectedAccount) {
            throw new Error("no-linked-wallet");
        } 

        if (amount <= 0) {
            throw new Error("transfer-amount-error");
        } 

        if (utils.isAddress(to) === false) {
            throw new Error("invalid-receiver-address");
        }

        if (tokenAddress && utils.isAddress(tokenAddress) === false) {
            throw new Error("invalid-token-address");
        }

        return true;
    }

    // Events    
    chainChanged(callback) {
        this.provider.on('chainChanged', (chainHexId) => {
            callback(chainHexId);
        });
    }

    accountsChanged(callback) {
        this.provider.on('accountsChanged', (accounts) => {
            callback(accounts);
        });
    }

    networkChanged(callback) {
        this.provider.on('networkChanged', (param) => {
            callback(param);
        });
    }
    
    disconnectEvent(callback) {
        this.provider.on('disconnect', (code, reason) => {
            callback(code, reason);
        });
    }
    
} 

module.exports = Wallet;