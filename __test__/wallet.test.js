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

const queryAddTrx = (walletId, type) => ({
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
                inputDate
            }
        }
`,
    variables: {
        form: {
            walletId,
            type: type,
            note: "Test transaction",
            nominal: 400000,
            inputDate: "2024-09-29T00:00:00.000Z",
            category: "fnb",
        },
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
            email: "abcdef@mail.com",
            name: "abcdef",
            password: "123123",
            username: "abcdef",
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
        username: "abcdef",
        password: "123123",
    },
};

const queryGetWalletByUserLogin = {
    query: `
        query {
            getWalletByUserLogin {
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
            }
        }`,
};

const queryGetStatsByDateAndWalletId = {
    query: `
        query GetStatsByDateAndWalletId($id: String!, $date: String!) {
            getStatsByDateAndWalletId(id: $id, date: $date) {
                _id
                totalAmount
                count
            }
        }`,
    variables: {
        id: "your-wallet-id",
        date: "2024-09-01",
    },
};

const queryGetStatsByDateAndWalletIdIncome = {
    query: `
        query GetStatsByDateAndWalletIdIncome($id: String!, $date: String!) {
            getStatsByDateAndWalletIdIncome(id: $id, date: $date) {
                _id
                totalAmount
                count
            }
        }`,
    variables: {
        id: "your-wallet-id",
        date: "2024-09-01",
    },
};

const GetInvitedWalletByUserLogin = {
    query: `
    query GetInvitedWalletByUserLogin {
        getInvitedWalletByUserLogin {
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
            result {
            _id
            name
            username
            email
            }
        }
    }
    `
}

const decInvitation = {
    query: `
    mutation DecInvitation($form: invForm) {
        decInvitation(form: $form) {
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
    `,
    variables: {
        form: {
            userId: "your-user-id",
            walletId: "your-wallet-id"
        }
    }
}

let server, url, accessToken, walletId, userId;

describe("Wallet Mutation and Queries", () => {
    beforeAll(async () => {
        ({ server, url } = await createApolloServer({ port: 0 }));

        // Register a new user
        const registerResponse = await request(url)
            .post("/")
            .send(queryDataRegister);
        expect(registerResponse.body.data.register).not.toBeNull();
        userId = registerResponse.body.data.register._id;
        console.log(registerResponse.body.data.register, "<<Register");

        // Login to get an access token
        const loginResponse = await request(url).post("/").send(queryDataLogin);
        expect(loginResponse.body.data.login).not.toBeNull();
        accessToken = loginResponse.body.data.login.accessToken;

        // Add a wallet
        const addWalletResponse = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryAddWallet);
        expect(addWalletResponse.body.data.addWallet).not.toBeNull();
        walletId = addWalletResponse.body.data.addWallet._id;

        // Update query variables with the new walletId
        queryGetStatsByDateAndWalletId.variables.id = walletId;
        queryGetStatsByDateAndWalletIdIncome.variables.id = walletId;

        // Add a transaction
        const addTrxResponseIncome = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryAddTrx(walletId, "income"));
        console.log(addTrxResponseIncome.body, "Add Transaction response");
        expect(addTrxResponseIncome.body.data).not.toBeNull();

        const addTrxResponseExpense = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryAddTrx(walletId, "expense"));
        console.log(addTrxResponseExpense.body, "Add Transaction response");
        expect(addTrxResponseExpense.body.data).not.toBeNull();
    });

    afterAll(async () => {
        await db.collection("Trx").deleteMany({});
        await db.collection("Wallet").deleteMany({});
        await server.stop();
    });

    it("should add a wallet successfully", async () => {
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryAddWallet);

        expect(response.body.data.addWallet).not.toBeNull();
        expect(response.body.data.addWallet).toMatchObject({
            _id: expect.any(String),
            name: "Arisan",
            type: "Group",
            ownerId: expect.any(String),
            total: 0,
            members: expect.any(Array),
            invited: expect.any(Array),
        });
    });

    it("should get wallet by user login successfully", async () => {
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryGetWalletByUserLogin);

        expect(response.body.data.getWalletByUserLogin).not.toBeNull();
        expect(response.body.data.getWalletByUserLogin).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    _id: expect.any(String),
                    name: expect.any(String),
                    type: expect.any(String),
                    ownerId: expect.any(String),
                    total: expect.any(Number),
                    members: expect.any(Array),
                }),
            ])
        );
    });

    it("should get stats by date and wallet ID successfully", async () => {
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryGetStatsByDateAndWalletId);
        console.log(response.body, "Stats by Date and Wallet ID response");
        console.log(
            queryGetStatsByDateAndWalletId,
            "<queryGetStatsByDateAndWalletId"
        );
        expect(response.body.data.getStatsByDateAndWalletId).not.toBeNull();
        expect(response.body.data.getStatsByDateAndWalletId).toBeInstanceOf(
            Array
        );
        expect(
            response.body.data.getStatsByDateAndWalletId.length
        ).toBeGreaterThan(0);
        expect(response.body.data.getStatsByDateAndWalletId[0]).toMatchObject({
            _id: expect.any(String),
            totalAmount: expect.any(Number),
            count: expect.any(Number),
        });
    });

    it("should get stats by date and wallet ID (income) successfully", async () => {
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryGetStatsByDateAndWalletIdIncome);
        console.log(
            response.body,
            "Stats by Date and Wallet ID Income response"
        );

        expect(
            response.body.data.getStatsByDateAndWalletIdIncome
        ).not.toBeNull();
        expect(response.body.data.getStatsByDateAndWalletIdIncome).toBeInstanceOf(
            Array
        );
        expect(
            response.body.data.getStatsByDateAndWalletIdIncome.length
        ).toBeGreaterThan(0);
        expect(
            response.body.data.getStatsByDateAndWalletIdIncome[0]
        ).toMatchObject({
            _id: expect.any(String),
            totalAmount: expect.any(Number),
            count: expect.any(Number),
        });
    });

    it("should fail to get wallet by user login without authorization", async () => {
        const response = await request(url)
            .post("/")
            .send(queryGetWalletByUserLogin);

        expect(response.body.errors).toBeDefined();
        expect(response.body.errors[0].message).toContain("Invalid tokena");
    });

    it("should add an income transaction successfully", async () => {
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryAddTrx(walletId, "income"));

        expect(response.body.data.AddTrx).not.toBeNull();
        expect(response.body.data.AddTrx).toMatchObject({
            _id: expect.any(String),
            nominal: 400000,
            userId: expect.any(String),
            walletId: walletId,
            type: "income",
            category: "fnb",
            note: "Test transaction",
        });
    });

    it("should add an expense transaction successfully", async () => {
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(queryAddTrx(walletId, "expense"));

        expect(response.body.data.AddTrx).not.toBeNull();
        expect(response.body.data.AddTrx).toMatchObject({
            _id: expect.any(String),
            nominal: -400000,
            userId: expect.any(String),
            walletId: walletId,
            type: "expense",
            category: "fnb",
            note: "Test transaction",
        });
    });

    it("should fail to add a transaction without authorization", async () => {
        const response = await request(url)
            .post("/")
            .send(queryAddTrx(walletId, "income"));

        expect(response.body.errors).toBeDefined();
        expect(response.body.errors[0].message).toContain("Invalid tokena");
    });

    it("should get all invited wallets by user login", async () => {
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(GetInvitedWalletByUserLogin);
        // console.log(response, "<<<<<<TEST");
        // Check that the response is not null
        expect(response.body.data.getInvitedWalletByUserLogin).not.toBeNull();

        // Ensure that the response is an array
        expect(Array.isArray(response.body.data.getInvitedWalletByUserLogin)).toBe(true);

        // Check that the array contains wallets with the expected structure
        response.body.data.getInvitedWalletByUserLogin.forEach(wallet => {
            expect(wallet).toMatchObject({
                _id: expect.any(String),
                name: expect.any(String),
                type: expect.any(String),
                ownerId: expect.any(String),
                total: expect.any(Number),
                members: expect.any(Array),
                invited: expect.any(Array),
                result: expect.any(Object),
            });

            // Check that each member has the expected structure
            wallet.members.forEach(member => {
                expect(member).toMatchObject({
                    _id: expect.any(String),
                    name: expect.any(String),
                    username: expect.any(String),
                    email: expect.any(String),
                });
            });

            // Check that each invited user has the expected structure
            wallet.invited.forEach(invitedUser => {
                expect(invitedUser).toMatchObject({
                    _id: expect.any(String),
                    name: expect.any(String),
                    username: expect.any(String),
                    email: expect.any(String),
                });
            });

            // Check that the result field has the expected structure
            expect(wallet.result).toMatchObject({
                _id: expect.any(String),
                name: expect.any(String),
                username: expect.any(String),
                email: expect.any(String),
            });
        });
    });

    it("should decline an invitation and return the updated wallet", async () => {
        // Update decInvitation query with dynamic userId and walletId
        const decInvitationQuery = {
            query: `
                mutation DecInvitation($form: invForm) {
                    decInvitation(form: $form) {
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
            `,
            variables: {
                form: {
                    userId,   // Use captured userId
                    walletId, // Use captured walletId
                },
            },
        };
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(decInvitationQuery);

        // Check if the mutation response is not null
        expect(response.body.data.decInvitation).not.toBeNull();

        // Check if the result is an object containing the correct wallet information
        expect(response.body.data.decInvitation).toMatchObject({
            _id: expect.any(String),
            name: expect.any(String),
            type: expect.any(String),
            ownerId: expect.any(String),
            total: expect.any(Number),
            members: expect.any(Array),
            invited: expect.any(Array),
        });

        // Check if the members array is correctly populated
        expect(response.body.data.decInvitation.members).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    _id: expect.any(String),
                    name: expect.any(String),
                    username: expect.any(String),
                    email: expect.any(String),
                }),
                expect.objectContaining({
                    _id: expect.any(String),
                    name: expect.any(String),
                    username: expect.any(String),
                    email: expect.any(String),
                }),
            ])
        );

        // Check if the invited array is correctly updated, without the removed user
        expect(response.body.data.decInvitation.invited).toEqual(
            expect.any(Array)
        );

        // Make sure the user who declined the invitation (e.g., user._id) is no longer in the invited array
        expect(response.body.data.decInvitation.invited).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    _id: expect.any(String) // assuming this is the user who declined the invitation
                }),
            ])
        );
    });

    it("should accept an invitation and return the updated wallet", async () => {
        // Update decInvitation query with dynamic userId and walletId
        const accInvitationQuery = {
            query: `
                mutation AccInvitation($form: invForm) {
                accInvitation(form: $form) {
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
            `,
            variables: {
                form: {
                    userId,   // Use captured userId
                    walletId, // Use captured walletId
                },
            },
        };
        const response = await request(url)
            .post("/")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(accInvitationQuery);

        // Check if the mutation response is not null
        expect(response.body.data.accInvitation).not.toBeNull();

        // Check if the result is an object containing the correct wallet information
        expect(response.body.data.accInvitation).toMatchObject({
            _id: expect.any(String),
            name: expect.any(String),
            type: expect.any(String),
            ownerId: expect.any(String),
            total: expect.any(Number),
            members: expect.any(Array),
            invited: expect.any(Array),
        });

        // Check if the members array is correctly populated
        expect(response.body.data.accInvitation.members).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    _id: expect.any(String),
                    name: expect.any(String),
                    username: expect.any(String),
                    email: expect.any(String),
                }),
                expect.objectContaining({
                    _id: expect.any(String),
                    name: expect.any(String),
                    username: expect.any(String),
                    email: expect.any(String),
                }),
            ])
        );

        // Check if the invited array is correctly updated, without the removed user
        expect(response.body.data.accInvitation.invited).toEqual(
            expect.any(Array)
        );

        // Make sure the user who declined the invitation (e.g., user._id) is no longer in the invited array
        expect(response.body.data.accInvitation.invited).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    _id: expect.any(String) // assuming this is the user who declined the invitation
                }),
            ])
        );
    });



});