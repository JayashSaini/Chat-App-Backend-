const mongoose = require('mongoose');
const { DB_NAME } = require('../constants.js');
module.exports = async function connectDB() {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );

    console.info(
      '🌏 Mongodb Connecting successfully host : ' +
        connectionInstance.connection.host
    );
  } catch (error) {
    console.error('MongoDB conection error : ' + error);
    process.exit(1);
  }
};
