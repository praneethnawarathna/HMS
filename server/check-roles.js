require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./model/User');
const Role = require('./model/Role');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // List all roles in the DB
    // Ensure adminDir has both admin and director roles
    const adminRole = await Role.findOne({ name: 'admin' });
    const directorRole = await Role.findOne({ name: 'director' });
    
    if (adminRole && directorRole) {
      await mongoose.connection.db.collection('users').updateOne(
        { email: 'hmstech731@gmail.com' },
        { $set: { roles: [adminRole._id, directorRole._id] } }
      );
    }

    // List all roles in the DB
    const roles = await Role.find({}).lean();
    console.log('=== All Roles in DB ===');
    roles.forEach(r => console.log(`  ID: ${r._id}  Name: "${r.name}"`));

    // Verify adminDir
    const adminDir = await User.findOne({ email: 'hmstech731@gmail.com' }).populate('roles');
    console.log('\n=== adminDir User & Roles ===');
    console.log(`  Username: "${adminDir.username}"  Email: "${adminDir.email}"  Roles: [${adminDir.roles.map(r => r.name).join(', ')}]`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
