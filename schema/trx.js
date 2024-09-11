const { hashSync } = require("bcryptjs");
const { db } = require("../config/mongodb");
// const Post = require("../models/post");
// const redis = require("../config/redis");
const Trx = require("../models/trx");
const { ObjectId } = require("mongodb");

const trxTypeDefs = `#graphql
  
    type Trx {
        _id: String
        nominal: Int
        userId: String
        walletId: String
        type: String
        category: String
        note: String
    }

    type Query {
        posts: [Trx]
        postById(id: String!): Trx
    }

    input TrxForm {
        nominal: Int!
        walletId: String
        type: String
        category: String!
        note: String
        inputDate: String!
    }

    type Mutation {
        AddTrx(form: TrxForm): Trx
    }
`;

const trxResolver = {
  Mutation: {
    AddTrx: async (parent, { form }, contextValue) => {
      const user = await contextValue.authentication();
      // console.log(user);
      console.log(form, "<<<<<addtrx");
      if (!form.nominal) {
        throw new Error("Nominal cannot be empty");
      }

      if(form.type === "expense"){
        form.nominal = Number(-form.nominal)
      }

      form.walletId = new ObjectId(form.walletId)
      form.userId = user._id;

      const result = await Trx.create(form);
      let wallet = await db.collection('Wallet').findOne({_id: form.walletId})
      console.log(form, wallet, "<<<<<DI SCHEMA TRX");
      await db.collection('Wallet').updateOne({_id: form.walletId}, {$set: {total: wallet.total + form.nominal}})
      return result;
    },
    
  },
};

module.exports = {
  trxTypeDefs,
  trxResolver,
};
