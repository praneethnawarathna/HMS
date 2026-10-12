const mongoose = require('mongoose');
const Payment = require('./model/Payment');
const Student = require('./model/Student');
const Warden = require('./model/Warden');
const Allocation = require('./model/Allocation');
const User = require('./model/User');
require('dotenv').config();

async function fullDiagnosis() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('\n' + '='.repeat(60));
        console.log('📊 COMPLETE DATABASE DIAGNOSIS');
        console.log('='.repeat(60) + '\n');

        // 1. Users
        const userCount = await User.countDocuments();
        console.log(`👤 Users: ${userCount}`);
        if (userCount > 0) {
            const user = await User.findOne();
            console.log(`   Sample: ${user.email || user.username}, ID: ${user._id}\n`);
        }

        // 2. Wardens
        const wardenCount = await Warden.countDocuments();
        console.log(`📍 Wardens: ${wardenCount}`);
        if (wardenCount > 0) {
            const warden = await Warden.findOne().populate('userId').populate('hostelId');
            console.log(`   ID: ${warden._id}`);
            console.log(`   User: ${warden.userId?.email}`);
            console.log(`   Hostel ID: ${warden.hostelId?._id}\n`);
        }

        // 3. Students
        const studentCount = await Student.countDocuments();
        console.log(`🎓 Students: ${studentCount}`);
        if (studentCount > 0) {
            const student = await Student.findOne();
            console.log(`   ID: ${student._id}`);
            console.log(`   Enrolment: ${student.enrolmentNo}`);
            console.log(`   Name: ${student.fullName}\n`);
        }

        // 4. Allocations
        const allocCount = await Allocation.countDocuments();
        console.log(`🏠 Allocations: ${allocCount}`);
        if (allocCount > 0) {
            const alloc = await Allocation.findOne().populate('roomId').populate('hostelID').populate('studentId');
            console.log(`   ID: ${alloc._id}`);
            console.log(`   Hostel: ${alloc.hostelID?._id}`);
            console.log(`   Student: ${alloc.studentId?._id}`);
            console.log(`   Room: ${alloc.roomId?.roomID}\n`);
        }

        // 5. Payments
        const paymentCount = await Payment.countDocuments();
        console.log(`💰 Payments: ${paymentCount}`);
        if (paymentCount > 0) {
            const payments = await Payment.find().limit(5).populate('studentId');
            console.log(`   Sample Payments:`);
            payments.forEach((p, i) => {
                console.log(`   ${i + 1}. Amount: ${p.amount}, StudentID: ${p.studentId?._id}`);
                console.log(`      Type: ${p.type}, Date: ${p.paidDate}`);
            });
        } else {
            console.log('   ❌ NO PAYMENTS FOUND!\n');
            console.log('   💡 To create test payments, run: node seed-payments.js\n');
        }

        // 6. Check data relationships
        console.log('\n' + '='.repeat(60));
        console.log('🔗 DATA RELATIONSHIP CHECK');
        console.log('='.repeat(60) + '\n');

        if (wardenCount > 0 && allocCount > 0) {
            const warden = await Warden.findOne();
            const wardenAllocs = await Allocation.find({ hostelID: warden.hostelId });
            console.log(`✓ Warden "${warden._id}" has ${wardenAllocs.length} allocations`);

            if (paymentCount > 0) {
                const wardenAllocationStudentIds = wardenAllocs.map(a => a.studentId?.toString()).filter(Boolean);
                const paymentStudentIds = (await Payment.find()).map(p => p.studentId?.toString()).filter(Boolean);
                const matchCount = wardenAllocationStudentIds.filter(id => paymentStudentIds.includes(id)).length;
                console.log(`✓ Payments match allocated students: ${matchCount}/${paymentCount}\n`);
            }
        }

        // 7. Test Query (simulate getPayments)
        if (wardenCount > 0) {
            console.log('🧪 TESTING QUERY (simulating getPayments):');
            const warden = await Warden.findOne();
            const allocations = await Allocation.find({ hostelID: warden.hostelId });
            const studentIds = allocations.map(a => a.studentId?.toString()).filter(Boolean);
            
            console.log(`   Allocations for warden's hostel: ${allocations.length}`);
            console.log(`   Student IDs: ${studentIds.join(', ') || 'NONE'}`);
            
            if (studentIds.length > 0) {
                const testPayments = await Payment.find({ studentId: { $in: studentIds } });
                console.log(`   Payments found: ${testPayments.length}`);
            } else {
                console.log(`   ⚠️  No student IDs to search - checking ALL payments...`);
                const allPayments = await Payment.find();
                console.log(`   All payments in DB: ${allPayments.length}`);
            }
        }

        console.log('\n' + '='.repeat(60) + '\n');

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fullDiagnosis();
