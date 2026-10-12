require('dotenv').config();
const mongoose = require('mongoose');
const ConnectDB = require('./config/DB');
const Role = require('./model/Role');
const User = require('./model/User');

const email = String(process.argv[2] || '').trim().toLowerCase();
const roleName = String(process.argv[3] || '').trim().toLowerCase();
const replaceExisting = process.argv.includes('--replace');
const allowedRoles = new Set(['student', 'warden', 'admin', 'director']);

(async () => {
  try {
    if (!email || !allowedRoles.has(roleName)) {
      throw new Error('Usage: node assign-role.js <email> <student|warden|admin|director> [--replace]');
    }

    await ConnectDB();

    const role = await Role.findOne({ name: roleName });
    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    const result = await User.updateOne(
      { email },
      replaceExisting
        ? { $set: { roles: [role._id] } }
        : { $addToSet: { roles: role._id } }
    );

    if (result.matchedCount !== 1) {
      throw new Error(`User not found: ${email}`);
    }

    // Re-query raw references first so restore-related dangling IDs are visible.
    const updated = await User.findOne({ email }).select('roles').lean();
    if (!updated) {
      throw new Error(`User disappeared while assigning role: ${email}`);
    }

    const rawRoleIds = (updated.roles || []).map(item => item.toString());
    const resolvedRoles = await Role.find({ _id: { $in: updated.roles || [] } })
      .select('name')
      .lean();

    console.log('Update matched:', result.matchedCount, 'modified:', result.modifiedCount);
    console.log('Raw role IDs:', rawRoleIds);
    console.log('Assigned roles:', resolvedRoles.map(item => item.name));
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
