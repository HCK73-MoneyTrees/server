const { createApolloServer } = require("../app");
const { db } = require("../config/mongodb");
const request = require("supertest");

const queryAddWallet = {
    query: `
        mutation AddWallet($form: walletForm) {
            addWallet(form: $form) {
                _id
                name
                type
                ownerId
                total
                members {
                    _id
                    name
                    username
                    email
                    }
                invited {
                    _id
                    name
                    username
                    email
                }
             }
        }`,
    variables: {
        form: {
            name: "Arisan",
            type: "Group",
            userId: []
        },
    },
};

const queryAddTrx = (
    walletId,
    type = "expense",
    nominal = 400000,
    category = "fnb"
) => ({
    query: `
        mutation AddTrx($form: TrxForm) {
            AddTrx(form: $form) {
                _id
                nominal
                userId
                walletId
                type
                category
                note
            }
        }`,
    variables: {
        form: {
            walletId,
            type,
            note: "Test transaction",
            nominal,
            inputDate: "2024-09-29T00:00:00.000Z",
            category,
        },
    },
});

const queryGetUserLoginTrx = (walletId) => ({
    query: `
        query UserLoginTrxAll($id: String!) {
        userLoginTrxAll(_id: $id) {
            user {
                _id
                name
                username
                email
            }
            result {
                _id
                nominal
                userId
                walletId
                type
                category
                note
                inputDate
            }
            income {
                _id
                nominal
                userId
                walletId
                type
                category
                note
                inputDate
            }
            expense {
                _id
                nominal
                userId
                walletId
                type
                category
                note
                inputDate
            }
            wallet {
                _id
                name
                type
                ownerId
                total
                members {
                    _id
                    name
                    username
                    email
                }
                invited {
                    _id
                    name
                    username
                    email
                }
            }
        }
        }`,
    variables: {
        id: walletId,
    },
});

const queryDataRegister = {
    query: `mutation Register($form: UserForm) {
        register(form: $form) {
            _id
            name
            username
            email
        }
    }`,
    variables: {
        form: {
            email: "abcdefg@mail.com",
            name: "abcdefg",
            password: "123123",
            username: "abcdefg",
        },
    },
};

const queryDataLogin = {
    query: `mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
            accessToken
            _id
            email
        }
    }`,
    variables: {
        username: "abcdefg",
        password: "123123",
    },
};

let server, url, accessToken, walletId;

describe("Transaction Tests", () => {
    beforeAll(async () => {
        ({ server, url } = await createApolloServer({ port: 0 }));

        const registerResponse = await request(url)
            .post("/")
            .send(queryDataRegister);
        expect(registerResponse.body.data.register).not.toBeNull();

        const loginResponse = await request(url).post("/").send(queryDataLogin);
        expect(loginResponse.body.data.login).not.toBeNull();
        accessToken = loginResponse.body.data.login.accessToken;

        const addWalletResponse = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryAddWallet);
        expect(addWalletResponse.body.data.addWallet).not.toBeNull();
        walletId = addWalletResponse.body.data.addWallet._id;
    });

    afterAll(async () => {
        await db.collection("Trx").deleteMany({});
        await db.collection("Wallet").deleteMany({});
        await server.stop();
    });

    it("should add an expense transaction successfully", async () => {
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryAddTrx(walletId));

        expect(response.body.data.AddTrx).not.toBeNull();
        expect(response.body.data.AddTrx).toMatchObject({
            _id: expect.any(String),
            nominal: -400000,
            userId: expect.any(String),
            walletId,
            type: "expense",
            category: "fnb",
            note: "Test transaction",
        });
    });

    it("should add an income transaction successfully", async () => {
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryAddTrx(walletId, "income", 500000, "salary"));

        expect(response.body.data.AddTrx).not.toBeNull();
        expect(response.body.data.AddTrx).toMatchObject({
            _id: expect.any(String),
            nominal: 500000,
            userId: expect.any(String),
            walletId,
            type: "income",
            category: "salary",
            note: "Test transaction",
        });
    });

    it("should fail to add a transaction without authorization", async () => {
        const response = await request(url)
            .post("/")
            .send(queryAddTrx(walletId));

        expect(response.body.errors).toBeDefined();
        expect(response.body.errors[0].message).toContain("Invalid tokena");
    });

    it("should show list transaction successfully", async () => {
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryGetUserLoginTrx(walletId));

        console.log(response.body.data.userLoginTrxAll);
        expect(response.body.data.userLoginTrxAll).not.toBeNull();
        expect(response.body.data.userLoginTrxAll).toMatchObject({
            // _id: expect.any(String),
            // nominal: expect.any(Number),
            // userId: expect.any(String),
            // walletId,
            // type: expect.any(String),
            // category: expect.any(String),
            // note: expect.any(String),
            user: {
                _id: expect.any(String),
                name: expect.any(String),
                username: expect.any(String),
                email: expect.any(String),
            },
            result: expect.any(Array),
            income: expect.any(Array),
            expense: expect.any(Array),
            wallet: {
                _id: expect.any(String),
                name:  expect.any(String),
                type:  expect.any(String),
                ownerId:  expect.any(String),
                total: expect.any(Number),
                members: expect.any(Array),
                invited: expect.any(Array)
            } 
        });
    });
    

});