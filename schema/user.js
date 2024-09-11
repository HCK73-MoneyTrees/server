const { hashSync } = require("bcryptjs");
const User = require("../models/user");
const { db } = require("../config/mongodb");
const { validate } = require("graphql");
const { comparePassword } = require("../helpers/bcrypt");
const { signToken } = require("../helpers/jwt");
const { sign } = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const Wallet = require("../models/wallet");

const userTypeDefs = `#graphql
    type User {
        _id: String
        name: String
        username: String
        email: String
    }

    type Wallet {
    
        _id: String
        name: String
        type: String
        ownerId: String
        total: Int
    }

    type Trx {
        _id: String
        nominal: Int
        userId: String
        walletId: String
        type: String
        category: String
        note: String
        inputDate: String
    }

    type UserResponse {
        user: User
        result: [Trx]
        income: [Trx]
        expense: [Trx]
        wallet: Wallet
    }

    type Query {
        users: [User]
        userById(id: String!): User
        userByUsername(username: String): [User]
        profile(userId: String!): UserResponse
        userLoginProfile: UserResponse
        userLoginTrxAll(_id: String!): UserResponse
        searchUser(keywords: String): [User]
    }

    input UserForm {
        name: String
        username: String!
        email: String!
        password: String!
    }

    type LoginResponse {
        accessToken: String
        _id: String
        email: String
    }

    type Mutation {
        register(form: UserForm): User
        #pass belom diapus pas regis
        login(email: String, username: String, password: String!): LoginResponse
    }
`;

const userResolver = {
  Query: {
    // users: async () => {
    //   return await User.findAll();
    // },
    // userById: async (parent, args, contextValue) => {
    //   return await User.findByPk(args.id);
    // },
    userLoginTrxAll: async (parent, args, contextValue) => {
      console.log(args._id, "-- di schema user");
      const { _id } = args;

      const user = await contextValue.authentication();
      if (!user) {
        throw new Error("User not found");
      }
      const trx = [];
      const trxIncome = [];
      const trxExpense = [];
      // const wallet
      const trxs = await db
        .collection("User")
        .aggregate([
          {
            $lookup: {
              from: "Trx",
              localField: "_id",
              foreignField: "userId",
              as: "result",
            },
          },
          { $unwind: "$result" },
          {
            $match: {
              "result.walletId": new ObjectId(_id),
            },
          },
          {
            $addFields: {
              "result.inputDate": {
                $dateFromString: { dateString: "$result.inputDate" },
              },
            },
          },
          {
            $sort: {
              "result.inputDate": -1,
            },
          },
        ])
        .toArray();

      const trxsIncome = await db
        .collection("User")
        .aggregate([
          {
            $lookup: {
              from: "Trx",
              localField: "_id",
              foreignField: "userId",
              as: "income",
            },
          },
          {
            $unwind: "$income",
          },
          {
            $match: {
              "income.walletId": new ObjectId(_id),
              "income.type": "income",
            },
          },
        ])
        .toArray();

      const wallets = await db
        .collection("User")
        .aggregate([
          {
            $lookup: {
              from: "Wallet",
              localField: "_id",
              foreignField: "ownerId",
              as: "wallet",
            },
          },
          {
            $unwind: "$wallet",
          },
          {
            $match: {
              "wallet._id": new ObjectId(_id),
            },
          },
        ])
        .toArray();
      const trxsExpense = await db
        .collection("User")
        .aggregate([
          {
            $lookup: {
              from: "Trx",
              localField: "_id",
              foreignField: "userId",
              as: "expense",
            },
          },
          {
            $unwind: "$expense",
          },
          {
            $match: {
              "expense.walletId": new ObjectId(_id),
              "expense.type": "expense",
            },
          },
        ])
        .toArray();

      console.log(wallets, "aaaaa");
      trxs.map((el) => {
        return trx.push(el.result);
      });
      trxsIncome.map((el) => {
        return trxIncome.push(el.income);
      });
      trxsExpense.map((el) => {
        return trxExpense.push(el.expense);
      });

      return {
        user,
        result: trx,
        income: trxIncome,
        expense: trxExpense,
        wallet: wallets[0].wallet,
      };
    },
    searchUser: async (parent, { keywords }) => {
      const result = await User.searchUser(keywords);
      // console.log(result, "DIIII SCHEMA");
      return result;
    },
  },
  Mutation: {
    register: async (parent, { form }) => {
      if (!form.username) {
        throw new Error("Username cannot be empty");
      }

      const checkUsername = await db
        .collection("User")
        .findOne({ username: form.username });

      if (checkUsername) {
        throw new Error("Username must be unique");
      }

      if (!form.email) {
        throw new Error("Email cannot be empty");
      }

      const validateEmail = (email) => {
        return email.match(
          /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
      };

      if (!validateEmail(form.email)) {
        throw new Error("Invalid email format");
      }

      const email = form.email;
      const checkEmail = await db.collection("User").findOne({ email });

      if (checkEmail) {
        throw new Error("Email must be unique");
      }

      if (!form.password) {
        throw new Error("Password cannot be empty");
      }

      if (form.password.length < 5) {
        throw new Error("Password length min 5");
      }
      form.password = hashSync(form.password);
      const result = await User.create(form);

      console.log(result, "<<<< di regist");

      await Wallet.create({
        ownerId: result._id,
        name: "Personal",
        type: "Personal",
        total: 0,
      });

      delete result.password;

      return result;
    },

    login: async (parent, { email, username, password }) => {
      if (!email && !username)
        throw new Error("Email or Username is required!");
      if (!password) throw new Error("Password is required!");

      const user = email
        ? await User.findUserByEmail(email)
        : await User.findUserByUser(username);

      if (!user) throw new Error("Sorry, User not found");

      const isPasswordValid = comparePassword(password, user.password);

      if (!isPasswordValid) throw new Error("Invalid password!");

      user.accessToken = signToken({ _id: user._id });

      return user;
    },
  },
};

module.exports = {
  userTypeDefs,
  userResolver,
};
