const { db } = require("../config/mongodb");


class Wallet {
    static col() {
        return db.collection('Wallet')
    }

    static async create(newWallet){
        newWallet.createdAt = newWallet.updatedAt = new Date().toISOString()
        // console.log(newWallet, "<<<<<DI MODEL WALLET");
        const result = await this.col().insertOne(newWallet)
        // console.log(result, "DAPETKAH????");
        return {
            ...newWallet,
            _id: result.insertedId
        }
    }

    // static async findOne(filter) {
    //     try {
    //         const result = await this.col().findOne(filter)
    //         // console.log(result, "DIIIII MODEL");
    //         return result
    //     } catch (error) {
    //         console.log(error);
    //     }
    // }

    // static async push(invitedUser, walletId) {
        
    //     const result = await this.col().updateOne(
    //         {_id: new ObjectId(walletId)},
    //         {$push: {invited: invitedUser}}
    //     )
    //     // console.log(result);
    //     return result
    // }
   
}

module.exports = Wallet