const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { userTypeDefs, userResolver } = require('./schema/user');
const { trxTypeDefs, trxResolver } = require('./schema/trx');
const { walletTypeDefs, walletResolver } = require('./schema/wallet');
const { verifyToken } = require('./helpers/jwt');
const User = require('./models/user');
const PORT = process.env.PORT || 3000

// Define the server configuration and schema
const createApolloServer = async (listenOptions = { port: PORT }) => {
  const server = new ApolloServer({
    typeDefs: [userTypeDefs, trxTypeDefs, walletTypeDefs],
    resolvers: [userResolver, trxResolver, walletResolver],
    introspection: true,
  });

  const { url } = await startStandaloneServer(server, {
    listen: listenOptions,
    context: async ({ req }) => {
      async function authentication() {
        const authorization = req.headers.authorization || "";
        console.log(authorization);
  
        if (!authorization) {
          throw new Error("Invalid tokena");
        }
        const [bearer, token] = authorization.split(" ");
        if (bearer !== "Bearer") {
          throw new Error("Invalid tokenb");
        }
        const payload = verifyToken(token);
  
        console.log(payload, "---");
        const user = await User.findByPk(payload._id);
  
        return user;
      }
      return { authentication };
    },
  });

  // Return the server instance and the URL the server is listening on
  return { server, url };
};

// For simplicity, we create and start the server if not in a test environment
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    const { url } = await createApolloServer();
    console.log(`🚀 Server ready at ${url}`);
  })();
}

module.exports = {
  createApolloServer
}