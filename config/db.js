const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 7000 });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('\n❌ Could not connect to MongoDB.');
    console.error('   Reason: ' + err.message);
    console.error('   • Using local MongoDB?  Make sure the MongoDB service is running.');
    console.error('   • Using Atlas?  Check your username/password, and that your IP is allowed (Network Access).');
    console.error('   • Check MONGODB_URI in your .env file.\n');
    process.exit(1);
  }
}

module.exports = connectDB;
