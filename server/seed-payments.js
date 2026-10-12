const mongoose = require('mongoose');
const Payment = require('./model/Payment');
const Student = require('./model/Student');
const Warden = require('./model/Warden');
const Allocation = require('./model/Allocation');
const User = require('./model/User');
require('dotenv').config();

async function seedPayments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB\n');

        // Get first warden
        const warden = await Warden.findOne().populate('userId').populate('hostelId');
        if (!warden) {
            console.log('❌ No warden found. Please create a warden first.');
            process.exit(1);
        }
        console.log(`✓ Found warden: ${warden.userId?.email}`);

        // Get allocations for warden's hostel
        const allocations = await Allocation.find({ hostelID: warden.hostelId._id }).limit(5);
        if (allocations.length === 0) {
            console.log('❌ No allocations found for warden\'s hostel');
            process.exit(1);
        }
        console.log(`✓ Found ${allocations.length} allocations for hostel\n`);

        // Create sample payments for allocated students
        const createdPayments = [];
        for (let i = 0; i < allocations.length && i < 3; i++) {
            const alloc = allocations[i];
            const studentId = alloc.studentId;

            // Check if payment already exists
            const exists = await Payment.findOne({ studentId });
            if (exists) {
                console.log(`⏭️  Payment already exists for student ${studentId}`);
                continue;
            }

            const payment = new Payment({
                studentId: studentId,
                amount: 5000 + Math.random() * 5000,
                type: 'hostel-fee',
                note: `Sample payment ${i + 1}`,
                academicYear: new Date().getFullYear().toString(),
                paidDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            });

            await payment.save();
            createdPayments.push(payment);
            console.log(`✓ Created payment for student ${studentId}: Rs ${payment.amount.toFixed(2)}`);
        }

        // Get all payments
        const allPayments = await Payment.find()
            .populate('studentId', 'fullName enrolmentNo no')
            .sort({ paidDate: -1 });

        console.log(`\n📊 Total payments in database: ${allPayments.length}`);
        if (allPayments.length > 0) {
            console.log('\n📋 Recent payments:');
            allPayments.slice(0, 5).forEach((p, idx) => {
                console.log(`${idx + 1}. ${p.studentId?.fullName || 'Unknown'} - Rs ${p.amount} on ${p.paidDate.toLocaleDateString()}`);
            });
        }

        await mongoose.connection.close();
        console.log('\n✓ Done!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

seedPayments();
