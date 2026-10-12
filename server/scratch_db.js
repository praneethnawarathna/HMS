const mongoose = require('mongoose');
const Student = require('./model/Student');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function check() {
    await mongoose.connect('mongodb://127.0.0.1:27017/NEW_HMS');
    const count = await Student.countDocuments();
    console.log('Total students in DB:', count);
    
    // Find the latest uploaded file in server/uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir)
        .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
        .map(f => ({ name: f, time: fs.statSync(path.join(uploadsDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);
    
    if (files.length > 0) {
        const latestFile = files[0].name;
        console.log('Latest uploaded file:', latestFile);
        const filePath = path.join(uploadsDir, latestFile);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log('Number of rows in latest file:', rows.length);
        if (rows.length > 0) {
            console.log('Keys of first row:', Object.keys(rows[0]));
            console.log('First row data:', rows[0]);
            
            // Test key normalization
            const s = rows[0];
            const norm = {};
            Object.keys(s || {}).forEach(k => {
                const nk = k.replace(/\W/g, '').toLowerCase();
                norm[nk] = s[k];
            });
            console.log('Normalized keys:', Object.keys(norm));
            console.log('enrolmentno:', norm['enrolmentno']);
            console.log('name:', norm['name']);
            console.log('sex:', norm['sex']);
            
            // Check if first row enrolmentNo exists in DB
            const enrolmentNo = norm['enrolmentno'];
            if (enrolmentNo) {
                const existing = await Student.findOne({ enrolmentNo });
                console.log(`Does student with Enrolment No "${enrolmentNo}" exist?`, !!existing);
                if (existing) {
                    console.log('Existing student detail:', {
                        _id: existing._id,
                        enrolmentNo: existing.enrolmentNo,
                        name: existing.name
                    });
                }
            }
        }
    }
    
    await mongoose.disconnect();
}

check();
