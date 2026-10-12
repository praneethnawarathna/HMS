const mongoose = require('mongoose');
const Room = require('./model/Room');
const Allocation = require('./model/Allocation');
const Hostel = require('./model/Hostel');

mongoose.connect('mongodb://localhost:27017/hmsfull', {}).then(async () => {
    const rooms = await Room.find({});
    const hostelGroups = {};
    rooms.forEach(r => {
        const hid = r.hostelID?.toString() || 'unknown';
        if (!hostelGroups[hid]) hostelGroups[hid] = { count: 0, totalCap: 0 };
        hostelGroups[hid].count++;
        hostelGroups[hid].totalCap += (r.capasity || 4);
    });

    const year = new Date().getFullYear().toString();
    const allocs = await Allocation.find({ active: true, academicYear: year });
    const allocGroups = {};
    allocs.forEach(a => {
        const hid = a.hostelID?.toString() || 'unknown';
        allocGroups[hid] = (allocGroups[hid] || 0) + 1;
    });

    const hostels = await Hostel.find({});
    hostels.forEach(h => {
        const hid = h._id.toString();
        const cap = hostelGroups[hid]?.totalCap || 0;
        const assigned = allocGroups[hid] || 0;
        console.log(h.name + ': rooms=' + (hostelGroups[hid]?.count || 0) + ', capacity=' + cap + ', assigned=' + assigned + ', available=' + (cap - assigned));
    });

    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
