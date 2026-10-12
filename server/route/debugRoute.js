const express = require('express');
const Payment = require('../model/Payment');
const Warden = require('../model/Warden');
const Allocation = require('../model/Allocation');
const Student = require('../model/Student');
const { authMiddleware } = require('../middlewares/AuthMiddleware');

const router = express.Router();

// Debug endpoint - check payment data
router.get('/payments-info', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        const paymentCount = await Payment.countDocuments();
        const wardenRecord = await Warden.findOne({ userId });

        let info = {
            totalPayments: paymentCount,
            wardenFound: !!wardenRecord,
            wardenHostelId: wardenRecord?.hostelId?.toString() || null
        };

        let allocationStudentIds = [];
        let allocationRegNos = [];
        if (wardenRecord) {
            const allocations = await Allocation.find({ hostelID: wardenRecord.hostelId });
            info.allocationsCount = allocations.length;
            info.allocationSample = allocations[0] ? {
                id: allocations[0]._id,
                studentId: allocations[0].studentId,
                regNo: allocations[0].regNo,
                hostelID: allocations[0].hostelID
            } : null;
            allocationStudentIds = allocations.filter(a => a.studentId).map(a => a.studentId.toString());
            allocationRegNos = allocations.filter(a => a.regNo).map(a => a.regNo);
            info.allocationStudentIds = allocationStudentIds;
            info.allocationRegNos = allocationRegNos;
        }

        let paymentStudentIds = [];
        let paymentStudentEnrolments = [];
        if (paymentCount > 0) {
            const payments = await Payment.find().populate('studentId');
            paymentStudentIds = payments.map(p => p.studentId?._id?.toString?.() || p.studentId?.toString?.() || null).filter(Boolean);
            paymentStudentEnrolments = payments.map(p => p.studentId?.enrolmentNo || null).filter(Boolean);
            info.paymentStudentIds = paymentStudentIds;
            info.paymentStudentEnrolments = paymentStudentEnrolments;
            info.paymentSamples = payments.slice(0, 3).map(p => ({
                id: p._id,
                studentId: p.studentId?._id || p.studentId,
                enrolmentNo: p.studentId?.enrolmentNo,
                amount: p.amount,
                paidDate: p.paidDate
            }));
        } else {
            info.paymentSamples = [];
            info.message = 'No payments found. Use the form above to collect a payment.';
        }

        // Intersection
        info.matchingStudentIds = allocationStudentIds.filter(id => paymentStudentIds.includes(id));
        info.matchingEnrolments = allocationRegNos.filter(reg => paymentStudentEnrolments.includes(reg));

        res.json(info);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
