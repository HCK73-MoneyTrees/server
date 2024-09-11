let bcrypt = require("bcryptjs");

function hashPassword(password) {
  return bcrypt.hashSync(password);
}

function comparePassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

module.exports = {
    hashPassword,comparePassword
}