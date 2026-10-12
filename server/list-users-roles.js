require('dotenv').config();
const ConnectDB = require('./config/DB');
const User = require('./model/User');
const Role = require('./model/Role');

(async () => {
  try {
    await ConnectDB();
    const users = await User.find({}).populate('roles');
    console.log('Users and roles:');
    users.forEach(u => {
      console.log('---');
      console.log('id:', u._id.toString());
      console.log('username:', u.username);
      console.log('email:', u.email);
      console.log('roles:', u.roles.map(r => ({ name: r.name, permissions: r.permissions })));
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();