const utils = require('../utils');

class Coin {

    /**
     * @var {String} 
     */
    symbol;

    /**
     * @var {String} 
     */
    decimals;

    /**
     * @var {Object} 
     */
    wallet;

    constructor() {
        let EthWallets = require('../index');
        this.wallet = EthWallets.connectedWallet;
        this.decimals = this.wallet.connectedNetwork.nativeCurrency.decimals;
        this.symbol = this.wallet.connectedNetwork.nativeCurrency.symbol;
    }

    
    /**
     * @param {String} address
     * @returns {Float}
     */
    async getBalance(address) {
        let balance = await this.wallet.request({
            method: 'eth_getBalance', 
            params: [address, 'latest']
        });
        return parseFloat((parseInt(balance) / 10**this.decimals).toFixed(6));
    }

    /**
     * @param {String} to 
     * @param {Float|Integer} amount 
     * @returns {String|Object}
     */
    transfer(to, amount) {
        return new Promise(async (resolve, reject) => {

            if (parseFloat(amount) > await this.getBalance(this.wallet.connectedAccount)) {
                return reject('insufficient-balance');
            }

            if (parseFloat(amount) < 0) {
                return reject('transfer-amount-error');
            }

            amount = utils.toHex(amount, this.decimals);
            
            let gas = await this.wallet.getEstimateGas({
                to,
                from: this.wallet.connectedAccount,
                value: amount
            });


            this.wallet.sendTransaction([{
                to,
                from: this.wallet.connectedAccount,
                value: amount,
                gas
            }])
            .then((transactionId) => {
                resolve(transactionId);
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * @returns {String}
     */
    getSymbol() {
        return this.symbol;
    }

    /**
     * @returns {Integer}
     */
    getDecimals() {
        return this.decimals;
    }
}

module.exports = Coin;