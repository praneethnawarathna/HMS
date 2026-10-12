const mongoose = require('mongoose');
const Payment = require('./model/Payment');
const Student = require('./model/Student');
const Warden = require('./model/Warden');
const Allocation = require('./model/Allocation');
require('dotenv').config();

async function diagnosePaymentIssue() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('🔍 PAYMENT DIAGNOSIS REPORT\n');
        console.log('=' .repeat(50));

        // 1. Check total payments
        const paymentCount = await Payment.countDocuments();
        console.log(`1️⃣  Total Payments in DB: ${paymentCount}`);

        if (paymentCount === 0) {
            console.log('   ⚠️  NO PAYMENTS FOUND - This is why you see "No payment records found"\n');
            console.log('   ✅ SOLUTION: Run "node seed-payments.js" to create test payment data\n');
        } else {
            console.log(`   ✓ Payments exist\n`);
        }

        // 2. Check payment structure
        if (paymentCount > 0) {
            const sample = await Payment.findOne().populate('studentId');
            console.log('2️⃣  Sample Payment Structure:');
            console.log('   StudentID:', sample.studentId);
            console.log('   Amount:', sample.amount);
            console.log('   Type:', sample.type);
            console.log('   Date:', sample.paidDate, '\n');
        }

        // 3. Check wardens
        const wardenCount = await Warden.countDocuments();
        console.log(`3️⃣  Total Wardens: ${wardenCount}\n`);

        // 4. Check allocations
        const allocCount = await Allocation.countDocuments();
        console.log(`4️⃣  Total Allocations: ${allocCount}\n`);

        // 5. Check students
        const studentCount = await Student.countDocuments();
        console.log(`5️⃣  Total Students: ${studentCount}\n`);

        // 6. Check if payments have valid studentId references
        if (paymentCount > 0) {
            const paymentsWithStudents = await Payment.find().populate('studentId').limit(3);
            const validCount = paymentsWithStudents.filter(p => p.studentId).length;
            console.log(`6️⃣  Payments with valid student references: ${validCount}/${Math.min(3, paymentCount)}\n`);

            if (validCount === 0) {
                console.log('   ⚠️  ISSUE: Payments exist but student references are broken!\n');
            }
        }

        console.log('=' .repeat(50));
        console.log('\n📝 NEXT STEPS:');
        console.log('1. Check browser console (F12) for API responses');
        console.log('2. Check server terminal for DEBUG logs');
        console.log('3. If paymentCount=0, run: node seed-payments.js');
        console.log('4. Refresh the page and check payments display\n');

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

diagnosePaymentIssue();
