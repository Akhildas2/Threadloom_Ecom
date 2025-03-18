const Wallet = require("../models/walletModel")



//update or create the wallet
const updateWalletBalance = async (newUserId, referredByUserId) => {
    const newUserBonus = 50;
    const referredUserBonus = 100;

    const updateWallet = async (userId, bonus) => {
        let userWallet = await Wallet.findOne({ userId });
        if (!userWallet) {
            userWallet = new Wallet({
                userId,
                balance: bonus,
                transactions: [{
                    type: 'credit',
                    amount: bonus,
                    date: new Date(),
                    description: 'Referral bonus'
                }]
            });
        } else {
            userWallet.balance += bonus;
            userWallet.transactions.push({
                type: 'credit',
                amount: bonus,
                date: new Date(),
                description: 'Referral bonus'
            });
        }
        await userWallet.save();
    };

    await Promise.all([
        updateWallet(newUserId, newUserBonus),
        updateWallet(referredByUserId, referredUserBonus)
    ]);

};



module.exports = { updateWalletBalance };