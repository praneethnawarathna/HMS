require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../model/Role');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

async function addPermission() {
  try {
    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      console.error('Admin role not found');
      process.exit(1);
    }
    if (!adminRole.permissions.includes('delete-hostel')) {
      adminRole.permissions.push('delete-hostel');
      await adminRole.save();
      console.log('Added delete-hostel permission to admin role');
    } else {
      console.log('Admin role already has delete-hostel permission');
    }
  } catch (err) {
    console.error('Error updating role:', err);
  } finally {
    mongoose.disconnect();
  }
}

addPermission();
