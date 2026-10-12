const Role = require("../model/Role");
const User = require("../model/User");
const mongoose = require("mongoose");

function getCompatibleUserIdFilter(id) {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return null;

    const candidates = [normalizedId];
    if (mongoose.Types.ObjectId.isValid(normalizedId)) {
        candidates.unshift(new mongoose.Types.ObjectId(normalizedId));
    }

    return {
        _id: candidates.length === 1
            ? candidates[0]
            : { $in: candidates }
    };
}

async function findUserByIdCompatible(id) {
    const filter = getCompatibleUserIdFilter(id);
    if (!filter) return null;

    const user = await User.collection.findOne(
        filter,
        { projection: { password: 0 } }
    );

    if (!user) return null;

    const roleIds = Array.isArray(user.roles) ? user.roles : [];
    const roles = roleIds.length
        ? await Role.collection.find({ _id: { $in: roleIds } }).toArray()
        : [];

    return { ...user, roles };
}


const UserController = {
    getallusers: async (req, res) => {
        try {
            // Fetch all users with their roles populated
            const users = await User.find().populate('roles');
            const Student = require('../model/Student');
            const filtered = [];
            for (const u of users) {
                // Determine if this user is a synthetic student (has a role named 'student')
                const isStudentRole = u.roles?.some(r => (typeof r === 'string' ? r : r.name) === 'student');
                if (isStudentRole) {
                    // Include only if a matching student record exists
                    const student = await Student.findOne({ enrolmentNo: u.username });
                    if (student) filtered.push(u);
                } else {
                    // Non‑student users (admin, director, warden) are always included
                    filtered.push(u);
                }
            }
            return res.json({ Result: filtered });
        } catch (err) {
            console.log(err);
        }
    },

    getoneuser: async (req, res) => {
        try {
            const { id } = req.params;
            const getoneuserdata = await findUserByIdCompatible(id);

            if (!getoneuserdata) {
                return res.status(404).json({
                    Status: 'Fail',
                    Error: 'User not found',
                    Result: null
                });
            }

            return res.json({
                Status: 'Success',
                Result: getoneuserdata
            });
        }
        catch (err) {
            console.error('getoneuser error:', err);
            return res.status(500).json({
                Status: 'Fail',
                Error: 'Failed to load user'
            });
        }
    },

    verifyEmailBydir: async (req, res) => {
        try {
            const { id } = req.params

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const updatedUser = await User.findByIdAndUpdate(
                id,
                { $set: { emailVerified: !user.emailVerified } },
                { new: true }
            );

            if (updatedUser) {
                return res.json({ Status: "Success", Message: "User Updated Success" })
            }
            else {
                return res.json({ Error: "Internal Server Error while Updating User" })
            }


        }
        catch (err) {
            console.log(err)
        }
    },

    avtiveAnddactiveUser: async (req, res) => {
        try {
            const { id } = req.params

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const updatedUser = await User.findByIdAndUpdate(
                id,
                { $set: { active: !user.active } },
                { new: true }
            );

            if (updatedUser) {
                return res.json({ Status: "Success", Message: "User Updated Success" })
            }
            else {
                return res.json({ Error: "Internal Server Error while Updating User" })
            }
        }
        catch (err) {
            console.log(err)
        }
    },

    updateUserRole: async (req, res) => {
        try {
            const { userID, roleID } = req.body;

            const user = await User.findById(userID);
            if (!user) {
                return res.json({ error: "User not found" });
            }

            const roleExists = await Role.findById(roleID);
            if (!roleExists) {
                return res.json({ error: "Role not found" });
            }

            const updatedUser = await User.findByIdAndUpdate(
                userID,
                { $set: { roles: [roleID] } }, 
                { new: true }
            );

            return res.json({ message: "User role updated successfully", user: updatedUser });
        } catch (err) {
            console.error(err);
            return res.json({ error: "Server error" });
        }
    }

    ,

    // Update user details (username, email)
    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            const { username, email } = req.body;

            const user = await User.findById(id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            if (username) user.username = username;
            if (email) user.email = email;

            await user.save();
            return res.json({ Status: 'Success', Message: 'User updated', Result: user });
        } catch (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ Error: 'Failed to update user' });
        }
    }

    ,

    // Update user by body (accepts id in body) - helper to avoid path issues
    updateUserByBody: async (req, res) => {
        try {
            const { id, username, email } = req.body;
            if (!id) return res.status(400).json({ Error: 'Missing id in request body' });

            const user = await User.findById(id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            if (username) user.username = username;
            if (email) user.email = email;

            await user.save();
            return res.json({ Status: 'Success', Message: 'User updated', Result: user });
        } catch (err) {
            console.error('Error updating user by body:', err);
            return res.status(500).json({ Error: 'Failed to update user' });
        }
    }

    ,

    // Delete user and associated warden record (if any)
    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;
            const Warden = require('../model/Warden');
            const Hostel = require('../model/Hostel');
            const Student = require('../model/Student');

            const user = await User.findById(id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            // If user has warden records, remove them and clear hostel references
            await Hostel.updateMany({ warden: id }, { $unset: { warden: "" } });
            await Warden.deleteMany({ userId: id });
            
            // If this user is a synthetic student account, clean up student data
            // Synthetic usernames correspond to enrolmentNo of the student.
            const student = await Student.findOne({ enrolmentNo: user.username });
            if (student) {
                const Allocation = require('../model/Allocation');
                const SpecialNeeds = require('../model/SpecialNeeds');
                const EmergencyContact = require('../model/EmergencyContact');
                // Remove allocations referencing this student
                await Allocation.deleteMany({ studentId: student._id });
                // Remove special needs and emergency contacts linked via student _id (regNo)
                await SpecialNeeds.deleteMany({ regNo: student._id });
                await EmergencyContact.deleteMany({ regNo: student._id });
                // Delete the student document
                await Student.findByIdAndDelete(student._id);
            }

            // Delete the user record
            await User.findByIdAndDelete(id);
            return res.json({ Status: 'Success', Message: 'User and related records removed' });
        } catch (err) {
            console.error('Error deleting user:', err);
            return res.status(500).json({ Error: 'Failed to delete user' });
        }
    }




};

module.exports = UserController;
