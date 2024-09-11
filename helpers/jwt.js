const jwt = require('jsonwebtoken');
let secret = "wkwk"
function signToken(payload) {
    return jwt.sign(payload,"wkwk")
}

function verifyToken(token) {
    return jwt.verify(token, "wkwk")
}

module.exports = {signToken,verifyToken}