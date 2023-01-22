const utils = require('../utils');
const Coin = require('../entity/coin');
const Token = require('../entity/token');

class Transaction {

    /**
     * @var {String} 
     */
    hash;

    /**
     * @var {Object} 
     */
    data;

    /**
     * @var {Object}
     */
    wallet;

    /**
     * @param {String} hash 
     */
    constructor(hash) {
        this.hash = hash;
        let EthWallets = require('../index');
        this.wallet = EthWallets.connectedWallet;
        this.getData();
    }

    /**
     * @returns {String}
     */
    getHash() {
        return this.hash;
    }

    
    /**
     * @returns {Float}
     */
    async getFee() {
        let data = this.data ? this.data : await this.getData();
        return utils.toDec((data.gasPrice * data.gasUsed), this.wallet.connectedNetwork.nativeCurrency.decimals);
    }

    /**
     * @returns {Object}
     */
    async getData() {
        try {
            this.data = await this.wallet.request({
                method: 'eth_getTransactionByHash',
                params: [this.hash]
            });
        } catch (error) {
            throw new Error('data-request-failed');
        }

        try {
            let result = await this.wallet.request({
                method: 'eth_getTransactionReceipt',
                params: [this.hash]
            });
            this.data.status = result.status;
            this.data.gasUsed = result.gasUsed;
        } catch (error) {
            throw new Error('data-request-failed');
        }

        return this.data;
    }

    /**
     * @returns {Object}
     */
    decodeInput() {
        if (this.data.input != '0x') {
            let decodedInput = utils.abiDecoder(this.data.input);
            let receiver = decodedInput.params[0].value;
            let amount = decodedInput.params[1].value;
            return { receiver, amount };
        } else {
            return null;
        }
    }

    /**
     * @returns {Number}
     */
    async getConfirmations() {
        try {
            if (!this.data) await this.getData();
            const currentBlock = await this.wallet.request({method: 'eth_blockNumber'});
            if (this.data.blockNumber === null) return 0;
            let blockNumber = utils.toDec(this.data.blockNumber, 0);
            let confirmations = currentBlock - blockNumber;
            return confirmations < 0 ? 0 : confirmations;
        } catch (error) {}
    }

    /**
     * @param {Number} confirmations 
     * @param {Number} timer 
     * @returns {Number}
     */
    confirmTransaction(confirmations = 10, timer = 1) {
        return new Promise((resolve, reject) => {
            try {
                this.intervalConfirm = setInterval(async () => {
                    const trxConfirmations = await this.getConfirmations(this.hash)
        
                    if (trxConfirmations >= confirmations) {
                        clearInterval(this.intervalConfirm);
                        return resolve(trxConfirmations);
                    }
                }, (timer*1000));
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * @param {Number} timer 
     * @returns {Boolean}
     */
    validateTransaction(timer = 1) {
        return new Promise((resolve, reject) => {
            this.intervalValidate = setInterval(async () => {
                try {

                    await this.getData();

                    let result = null;

                    if (this.data == null) {
                        result = false;
                    } else {
                        if (this.data.blockNumber !== null) {
                            if (this.data.status == '0x0') {
                                result = false;
                            } else {
                                result = true;
                            }
                        }
                    }
    
                    if (typeof result == 'boolean') {
                        clearInterval(this.intervalValidate);
                        if (result == true) {
                            resolve(true);
                        } else {
                            reject(false);
                        }
                    }
    
                } catch (error) {
                    if (error.message == 'data-request-failed') {
                        this.validateTransaction(timer);
                    } else {
                        clearInterval(this.intervalValidate);
                        reject(error);
                    }
                }
            }, (timer*1000));
        });
    }

    /**
     * @param {String} address 
     * @param {Number} timer 
     * @returns {Boolean}
     */
    async verifyTokenTransfer(address, timer = 1) {
        if (utils.isAddress(address = address.toLowerCase()) === false) {
            throw new Error('invalid-token-address');
        }

        if (await this.validateTransaction(timer)) {
            if (this.data.input == '0x') {
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }

    /**
     * @param {Number} timer 
     * @returns {Boolean}
     */
    async verifyCoinTransfer(timer = 1) {
        if (await this.validateTransaction(timer)) {
            if (this.data.value == '0x0') {
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }

    /**
     * @param {String} receiver 
     * @param {Number} amount 
     * @param {String} address 
     * @param {Number} timer 
     * @returns {Boolean}
     */
    async verifyTokenTransferWithData(receiver, amount, address, timer = 1) {
        if (utils.isAddress(receiver = receiver.toLowerCase()) === false) {
            throw new Error('invalid-receiver-address');
        }

        if (await this.verifyTokenTransfer(address, timer)) {
            let decodedInput = this.decodeInput();
            let token = new Token(address);

            let data = {
                receiver: decodedInput.receiver.toLowerCase(),
                amount: utils.toDec(decodedInput.amount, (await token.getDecimals()))
            };

            if (data.receiver == receiver && data.amount == amount) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    /**
     * @param {String} receiver 
     * @param {Number} amount 
     * @param {Number} timer 
     * @returns {Boolean}
     */
    async verifyCoinTransferWithData(receiver, amount, timer = 1) {
        if (utils.isAddress(receiver = receiver.toLowerCase()) === false) {
            throw new Error('invalid-receiver-address');
        }

        if (await this.verifyCoinTransfer(timer)) {

            let coin = new Coin();

            let data = {
                receiver: this.data.to.toLowerCase(),
                amount: utils.toDec(this.data.value, (await coin.getDecimals()))
            };

            if (data.receiver == receiver && data.amount == amount) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    /**
     * @param {String|null} tokenAddress
     * @returns {Boolean}
     */
    verifyTransfer(tokenAddress = null) {
        if (!tokenAddress) {
            return this.verifyCoinTransfer();
        } else {
            return this.verifyTokenTransfer(tokenAddress);
        }
    }

    /**
     * @param {String} receiver
     * @param {Number} amount
     * @param {String|null} tokenAddress
     * @returns {Boolean}
     */
    verifyTransferWithData(receiver, amount, tokenAddress = null) {
        if (!tokenAddress) {
            return this.verifyCoinTransferWithData(receiver, amount);
        } else {
            return this.verifyTokenTransferWithData(receiver, amount, tokenAddress);
        }
    }

    /**
     * @returns {String}
     */
    getUrl() {
        let explorerUrl = this.wallet.connectedNetwork.explorerUrl;
        explorerUrl += explorerUrl.endsWith('/') ? '' : '/';
        explorerUrl += 'tx/'+this.hash;
        return explorerUrl;
    }

}

module.exports = Transaction;