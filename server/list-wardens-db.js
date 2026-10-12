require('dotenv').config();
const ConnectDB = require('./config/DB');
// Ensure related models are registered before populating
const User = require('./model/User');
const Hostel = require('./model/Hostel');
const Warden = require('./model/Warden');

(async () => {
  try {
    await ConnectDB();
    const wardens = await Warden.find().populate('userId', 'username email').populate('hostelId', 'name hostelID');
    console.log('Warden count:', wardens.length);
    wardens.forEach((w, i) => {
      console.log(`${i+1}. user: ${w.userId?.username || 'N/A'} (${w.userId?.email || 'N/A'}) - hostel: ${w.hostelId?.name || 'N/A'}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
})();