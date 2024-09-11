const { ObjectId } = require("mongodb");
const { db } = require("../config/mongodb");
class User {
    static col(){
        return db.collection("User")
    }

    static async findByPk(id){
        const result = await this.col().findOne({_id: new ObjectId(id)})
        return result
    }

    // static async findAll() {
    //     const result = await this.col().find().toArray();
    //     return result;
    // }

    static async findUserByEmail(email) {
        const result = await this.col().findOne({ email: email });
        return result;
    }

    static async findUserByUser(username) {
        const result = await this.col().findOne({ username: username });
        return result;
    }

    static async create(newUser){
        const result = await this.col().insertOne(newUser)

        return {
            ...newUser,
            _id: result.insertedId
        }
    }

    static async searchUser(keywords) {
        const result = await this.col().find({
            $or: [
                {
                    name: { $regex: keywords, $options: "i" }
                },
                {
                    username: ({ $regex: keywords, $options: "i" })
                }
            ]
        }).toArray()

        // console.log(result);
        return result
    }

}

module.exports = User