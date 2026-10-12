const mongoose = require('mongoose');
const Payment = require('./model/Payment');
const Student = require('./model/Student');
const User = require('./model/User');
const Warden = require('./model/Warden');
const Allocation = require('./model/Allocation');
require('dotenv').config();

async function testPayments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Check if payments exist
        const paymentCount = await Payment.countDocuments();
        console.log(`\n📊 Total payments in DB: ${paymentCount}`);

        if (paymentCount > 0) {
            const payments = await Payment.find().limit(3).populate('studentId');
            console.log('\n📋 Sample payments:');
            console.log(JSON.stringify(payments, null, 2));
        } else {
            console.log('⚠️  No payments found. You need to collect some payments first.');
        }

        // Check wardens
        const wardenCount = await Warden.countDocuments();
        console.log(`\n👤 Total wardens: ${wardenCount}`);

        // Check allocations
        const allocCount = await Allocation.countDocuments();
        console.log(`📍 Total allocations: ${allocCount}`);

        // Check students
        const studentCount = await Student.countDocuments();
        console.log(`🎓 Total students: ${studentCount}`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

testPayments();
