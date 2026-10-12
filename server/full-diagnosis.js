const mongoose = require('mongoose');
const Payment = require('./model/Payment');
const Student = require('./model/Student');
const Warden = require('./model/Warden');
const Allocation = require('./model/Allocation');
const User = require('./model/User');
const Hostel = require('./model/Hostel');
const Room = require('./model/Room');
require('dotenv').config();

async function fullDiagnosis() {
    try {
        console.time('Full Diagnosis Total');
        console.time('Connect to DB');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.timeEnd('Connect to DB');
        console.log('\n' + '='.repeat(60));
        console.log('📊 COMPLETE DATABASE DIAGNOSIS');
        console.log('='.repeat(60) + '\n');

        console.log('\n' + '='.repeat(60));
        console.log('📊 CHECKING INDEXES ON COLLECTIONS');
        console.log('='.repeat(60) + '\n');
        for (const colName of ['students', 'allocations', 'payments', 'rooms', 'hostels', 'users']) {
            const indexes = await mongoose.connection.db.collection(colName).indexes();
            console.log(`Collection "${colName}" indexes:`, indexes.map(idx => Object.keys(idx.key).join('_')));
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
            const rawStudent = await mongoose.connection.db.collection('students').findOne();
            console.log(`   Raw student:`, JSON.stringify(rawStudent).slice(0, 200));
            console.log(`   _id type in DB:`, typeof rawStudent._id, rawStudent._id.constructor.name);
            const foundWithMongoose = await Student.findOne({ _id: rawStudent._id });
            const foundWithStr = await mongoose.connection.db.collection('students').findOne({ _id: String(rawStudent._id) });
            const foundWithObjId = mongoose.Types.ObjectId.isValid(rawStudent._id) ? await mongoose.connection.db.collection('students').findOne({ _id: new mongoose.Types.ObjectId(String(rawStudent._id)) }) : null;
            console.log(`   Mongoose find: ${!!foundWithMongoose}, raw String find: ${!!foundWithStr}, raw ObjectId find: ${!!foundWithObjId}`);
        }

        // 4. Allocations
        const allocCount = await Allocation.countDocuments();
        const activeTrueCount = await Allocation.countDocuments({ active: true });
        const activeNotFalseCount = await Allocation.countDocuments({ active: { $ne: false } });
        console.log(`🏠 Allocations: total=${allocCount}, active:true=${activeTrueCount}, active:neFalse=${activeNotFalseCount}`);
        
        const activeAllocs = await Allocation.find({ active: true }).limit(5).lean();
        console.log(`   Sample 5 ACTIVE allocations:`);
        for (const a of activeAllocs) {
            console.log(`   Alloc ID: ${a._id}, regNo: ${a.regNo} (${typeof a.regNo}), studentId: ${a.studentId} (${typeof a.studentId}), hostelID: ${a.hostelID}`);
            let stById = null;
            if (a.studentId) {
                stById = await Student.findById(a.studentId).lean();
                if (!stById && typeof a.studentId === 'string') {
                    stById = await Student.findOne({ enrolmentNo: a.studentId }).lean();
                }
            }
            let stByReg = null;
            if (a.regNo) {
                stByReg = await Student.findOne({ enrolmentNo: a.regNo }).lean();
                if (!stByReg && /^[0-9a-fA-F]{24}$/.test(String(a.regNo))) {
                    stByReg = await Student.findById(a.regNo).lean();
                }
            }
            console.log(`      Found by studentId? ${stById ? `YES: ${stById.enrolmentNo} - ${stById.name}` : 'NO'}`);
            console.log(`      Found by regNo? ${stByReg ? `YES: ${stByReg.enrolmentNo} - ${stByReg.name}` : 'NO'}`);
        }

        const allHostels = await Hostel.find().lean();
        console.log(`\n🏨 Hostels in DB (${allHostels.length}):`);
        allHostels.forEach(h => console.log(`   ID: ${h._id}, Name: "${h.name}", Code: "${h.hostelID}"`));

        // 5. Payments
        const paymentCount = await Payment.countDocuments();
        console.log(`💰 Payments: ${paymentCount}`);
        if (paymentCount > 0) {
            const rawPayment = await mongoose.connection.db.collection('payments').findOne();
            console.log(`   Raw payment:`, JSON.stringify(rawPayment));
            console.log(`   studentId type in payment:`, typeof rawPayment.studentId, rawPayment.studentId ? rawPayment.studentId.constructor.name : 'null');
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
        console.timeEnd('Full Diagnosis Total');

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fullDiagnosis();
