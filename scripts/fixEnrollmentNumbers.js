// Migration script to enforce enrolmentNo format across existing student records
// Run with: node scripts/fixEnrollmentNumbers.js

const mongoose = require('mongoose');
const Student = require('../server/model/Student');

// Helper to format enrolment numbers
function formatEnrol(enrol) {
  if (!enrol) return enrol;
  const upper = enrol.toString().toUpperCase().trim();
  const parts = upper.split(/[^A-Z0-9]/).filter(Boolean);
  if (parts.length === 3) {
    const prefix = parts[0];
    const year = parts[1].padStart(2, '0').slice(-2);
    const num = parts[2].padStart(3, '0').slice(-3);
    return `${prefix}/${year}/${num}`;
  }
  return upper; // keep as‑is if it doesn't match expected parts
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to DB');

    const cursor = Student.find({}).cursor();
    let updated = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const original = doc.enrolmentNo;
      const formatted = formatEnrol(original);
      if (original !== formatted) {
        doc.enrolmentNo = formatted;
        await doc.save();
        updated++;
        console.log(`Updated ${doc._id}: ${original} → ${formatted}`);
      }
    }
    console.log(`Migration complete. ${updated} records updated.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();
