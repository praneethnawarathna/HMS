const mongoose = require('mongoose');
const Payment = require('./model/Payment');
const Student = require('./model/Student');
const Allocation = require('./model/Allocation');
const Hostel = require('./model/Hostel');
require('dotenv').config();

async function testPayments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Check Allocations
        const totalAlloc = await Allocation.countDocuments();
        const activeTrue = await Allocation.countDocuments({ active: true });
        const activeFalse = await Allocation.countDocuments({ active: false });
        const activeUndefined = await Allocation.countDocuments({ active: { $exists: false } });
        console.log(`\n📍 Allocations: Total=${totalAlloc}, active=true: ${activeTrue}, active=false: ${activeFalse}, active undefined: ${activeUndefined}`);

        const sampleAlloc = await Allocation.find().limit(3).lean();
        console.log('Sample raw allocations:');
        console.log(JSON.stringify(sampleAlloc, null, 2));

        // Check Payments
        const paymentCount = await Payment.countDocuments();
        console.log(`\n💰 Total payments: ${paymentCount}`);
        const samplePayment = await Payment.find().limit(3).lean();
        console.log('Sample raw payments:');
        console.log(JSON.stringify(samplePayment, null, 2));

        // Check Students
        const studentCount = await Student.countDocuments();
        console.log(`\n🎓 Total students: ${studentCount}`);
        const sampleStudent = await Student.find().limit(3).lean();
        console.log('Sample raw students:');
        console.log(JSON.stringify(sampleStudent, null, 2));

        // Check Hostels
        const hostels = await Hostel.find().lean();
        console.log('\n🏨 Hostels:');
        console.log(hostels.map(h => ({ _id: h._id, name: h.name, hostelID: h.hostelID })));

        // Test matching between Allocation and Student
        if (sampleAlloc.length > 0) {
            const firstAlloc = sampleAlloc[0];
            console.log('\n🔍 Testing First Alloc matching:');
            console.log('alloc.studentId:', firstAlloc.studentId);
            console.log('alloc.regNo:', firstAlloc.regNo);
            if (firstAlloc.studentId) {
                const sById = await Student.findById(firstAlloc.studentId).lean();
                console.log('Student found by firstAlloc.studentId:', sById ? { _id: sById._id, enrolmentNo: sById.enrolmentNo, name: sById.name } : 'NOT FOUND');
            }
            if (firstAlloc.regNo) {
                const sByEnrol = await Student.findOne({ enrolmentNo: firstAlloc.regNo }).lean();
                console.log('Student found by firstAlloc.regNo:', sByEnrol ? { _id: sByEnrol._id, enrolmentNo: sByEnrol.enrolmentNo, name: sByEnrol.name } : 'NOT FOUND');
            }
        }

        // Test matching between Payment and Student
        if (samplePayment.length > 0) {
            const firstPay = samplePayment[0];
            console.log('\n🔍 Testing First Payment matching:');
            console.log('pay.studentId:', firstPay.studentId);
            if (firstPay.studentId) {
                const sById = await Student.findById(firstPay.studentId).lean();
                console.log('Student found by firstPay.studentId:', sById ? { _id: sById._id, enrolmentNo: sById.enrolmentNo } : 'NOT FOUND');
            }
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

testPayments();

