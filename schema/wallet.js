const { ObjectId } = require("mongodb");
const Wallet = require("../models/wallet");
const { db } = require("../config/mongodb");
const User = require("../models/user");

const walletTypeDefs = `#graphql

type Wallet {
    _id: String
    name: String
    type: String
    ownerId: String
    total: Int
    members: [User]
    invited: [User]
}
type WalletInvited {
    _id: String
    name: String
    type: String
    ownerId: String
    total: Int
    members: [User]
    invited: [User]
    result: User
}

input walletForm {
    name: String
    type: String
    userId: [String]
}

type Category{
        _id: String
        totalAmount: Int
        count: Int
}

input invForm {
    walletId: String
    userId: String
}

type Query {
    getWalletByUserLogin: [Wallet]
    getStatsByDateAndWalletId(id:String, date:String): [Category]
    getStatsByDateAndWalletIdIncome(id:String, date:String): [Category]
    getInvitedWalletByUserLogin: [WalletInvited]
}

type Mutation {
    addWallet(form: walletForm) : Wallet
    inviteMember(userId: String): String
    accInvitation(form: invForm): Wallet
    decInvitation(form: invForm): Wallet
}
`;

const walletResolver = {
  Query: {
    getWalletByUserLogin: async (parent, args, contextValue) => {
      console.log(args);

      const user = await contextValue.authentication();
      // if (!user) {
      //   throw new Error("User not found");
      // }
      const result = await db
        .collection("Wallet")
        .aggregate([
          {
            $match: {
              $or: [
                { "members._id": new ObjectId(user._id) },
                { ownerId: new ObjectId(user._id) },
              ],
            },
          },
        ])
        .toArray();
      console.log(result);

      return result;
    },
    getStatsByDateAndWalletId: async (parent, args, contextValue) => {
      console.log(args, "kkkk");

      const user = await contextValue.authentication();
      // if (!user) {
      //   throw new Error("User not found");
      // }
      // Parse date string into JavaScript Date objects
      const startDate = new Date(args.date);
      // const startDate = new Date("2024-09-01T00:00:00.000Z");
      // const endDate = new Date("2024-10-01T00:00:00.000Z");
      const endDate = new Date(startDate).setMonth(startDate.getMonth() + 1);

      console.log(new Date(endDate), startDate, "ddddd");

      const result = await db
        .collection("Wallet")
        .aggregate([
          {
            $lookup: {
              from: "Trx",
              localField: "_id",
              foreignField: "walletId",
              as: "result",
            },
          },
          { $unwind: "$result" },
          {
            $addFields: {
              "result.inputDate": {
                $dateFromString: { dateString: "$result.inputDate" },
              },
            },
          },
          {
            $match: {
              "result.inputDate": {
                $gte: startDate,
                $lt: new Date(endDate),
              },
              "result.walletId": new ObjectId(args.id),
              "result.type": "expense",
            },
          },
          {
            $group: {
              _id: "$result.category", // Group by category
              totalAmount: { $sum: "$result.nominal" }, // Sum of nominal
              count: { $sum: 1 }, // Count of transactions
            },
          },
          {
            $sort: { totalAmount: -1 }, // Optional: Sort by totalAmount in descending order
          },
        ])
        .toArray();

      console.log(result);
      return result;
    },
    getStatsByDateAndWalletIdIncome: async (parent, args, contextValue) => {
      console.log(args, "kkkk");

      const user = await contextValue.authentication();
      // if (!user) {
      //   throw new Error("User not found");
      // }
      // Parse date string into JavaScript Date objects
      const startDate = new Date(args.date);
      // const startDate = new Date("2024-09-01T00:00:00.000Z");
      // const endDate = new Date("2024-10-01T00:00:00.000Z");
      const endDate = new Date(startDate).setMonth(startDate.getMonth() + 1);

      console.log(new Date(endDate), startDate, "ddddd");

      const result = await db
        .collection("Wallet")
        .aggregate([
          {
            $lookup: {
              from: "Trx",
              localField: "_id",
              foreignField: "walletId",
              as: "result",
            },
          },
          { $unwind: "$result" },
          {
            $addFields: {
              "result.inputDate": {
                $dateFromString: { dateString: "$result.inputDate" },
              },
            },
          },
          {
            $match: {
              "result.inputDate": {
                $gte: startDate,
                $lt: new Date(endDate),
              },
              "result.walletId": new ObjectId(args.id),
              "result.type": "income",
            },
          },
          {
            $group: {
              _id: "$result.category", // Group by category
              totalAmount: { $sum: "$result.nominal" }, // Sum of nominal
              count: { $sum: 1 }, // Count of transactions
            },
          },
          {
            $sort: { totalAmount: -1 }, // Optional: Sort by totalAmount in descending order
          },
        ])
        .toArray();

      console.log(result);
      return result;
    },
    getInvitedWalletByUserLogin: async (parent, args, contextValue) => {
      console.log(args);

      const user = await contextValue.authentication();
      if (!user) {
        throw new Error("User not found");
      }
      console.log(user._id, "serrrr");

      const result = await db
        .collection("Wallet")
        .aggregate([
          {
            $match: {
              "invited._id": new ObjectId(user._id),
            },
          },
          {
            $lookup: {
              from: "User",
              localField: "ownerId",
              foreignField: "_id",
              as: "result",
            },
          },
          {
            $unwind: "$result",
          },
        ])
        .toArray();
      console.log(result);

      return result;
    },
  },

  Mutation: {
    addWallet: async (parent, { form }, contextValue) => {
      try {
        const user = await contextValue.authentication();
        // if (!user) {
        //   throw new Error("User not found");
        // }
        console.log(form, "INI FORMMMM");

        form.ownerId = new ObjectId(user._id);

        if (form.type === "Group") {
          form.members = [];
          form.members.push(user);
        } else {
          form.members = [];
        }

        form.total = 0;
        form.invited = [];

        await Promise.all(
          form.userId.map(async (userToInvite) => {
            let invitedUser = await User.findByPk(userToInvite);
            console.log(invitedUser, "ADAKAH??");
            form.invited.push(invitedUser);
            console.log(form.invited, "ke push gasihhhh???");
            // Wallet.push(invitedUser, walletId)
            return;
          })
        );

        console.log(form.invited, "INI YG DIINVITEEE");

        delete form.userId;
        const result = await Wallet.create(form);

        return result;
      } catch (error) {
        console.log(error, "ERROR DIIII ADD WALLET");
      }
    },
    decInvitation: async (parent, { form }, contextValue) => {
      console.log(form);

      const user = await contextValue.authentication();
      if (!user) {
        throw new Error("User not found");
      }
      const findWallet = await db
        .collection("User")
        .findOne({ _id: new ObjectId(user._id) });
      console.log(findWallet, "ketemuuuuu");

      const result = await db.collection("Wallet").updateOne(
        { _id: new ObjectId(form.walletId) },
        {
          $pull: { invited: { _id: { $in: [new ObjectId(user._id)] } } },
        }
      );
      console.log(result);
      const docAfter = await db
        .collection("Wallet")
        .findOne({ _id: new ObjectId(form.walletId) });
      console.log("Document after update:", docAfter);
      return docAfter;
    },
    accInvitation: async (parent, { form }, contextValue) => {
      console.log(form);

      const user = await contextValue.authentication();
      if (!user) {
        throw new Error("User not found");
      }
      const findWallet = await db
        .collection("User")
        .findOne({ _id: new ObjectId(user._id) });
      console.log(findWallet, "ketemuuuuu");

      const result = await db.collection("Wallet").updateOne(
        { _id: new ObjectId(form.walletId) },
        {
          $pull: { invited: { _id: { $in: [new ObjectId(user._id)] } } },
          $push: { members: user },
        }
      );
      console.log(result);
      const docAfter = await db
        .collection("Wallet")
        .findOne({ _id: new ObjectId(form.walletId) });
      console.log("Document after update:", docAfter);
      return docAfter;
    },
  },
};

module.exports = { walletTypeDefs, walletResolver };
