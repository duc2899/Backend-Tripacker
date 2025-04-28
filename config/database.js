const mongoose = require("mongoose");

class Database {
  constructor() {
    this.connection = null;
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect() {
    if (this.connection) {
      return this.connection;
    }

    try {
      this.connection = await mongoose.connect(`${process.env.DATABASE_URL}`);
      console.log(`MongoDB Connected: ${this.connection.connection.host}`);
      return this.connection;
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }
}

module.exports = Database;
