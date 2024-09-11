const { ObjectId } = require("mongodb");
const { db } = require("../config/mongodb");
class Trx {
  static col() {
    return db.collection("Trx");
  }

  // static async findAll() {
  //   const result = await this.col().find().toArray();
  //   return result;
  // }

  // static async findByPk(id) {
  //   const result = await this.col().findOne({ _id: new ObjectId(id) });
  //   return result;
  // }

  static async create(newTrx) {
    newTrx.createdAt = newTrx.updatedAt = new Date().toISOString()
    const result = await this.col().insertOne(newTrx)
    return {
        ...newTrx,
        _id: result.insertedId
    }
}

}

module.exports = Trx;
