const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const { initBackupScheduler } = require('./utils/backupScheduler');


// routes
const ConnectDB = require('./config/DB');
const authRoute = require('./route/authRoute')
const userRoute = require('./route/userRoute')
const studentRoute = require('./route/studentRoute')
const hostelRoute = require('./route/hostelRoute')
const roomRoute = require('./route/roomRoute')
const wardenRoute = require('./route/wardenRoute')
const adminRoute = require('./route/adminRoute')
const debugRoute = require('./route/debugRoute')
const eligibilityRoute = require('./route/eligibilityRoute')

const app = express();
const PORT = process.env.PORT || 5000;

ConnectDB();
initBackupScheduler();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/auth', authRoute)
app.use('/user', userRoute)
app.use('/student', studentRoute)
app.use('/hostel', hostelRoute)
app.use('/room', roomRoute)
app.use('/warden', wardenRoute)
app.use('/admin', adminRoute)
app.use('/debug', debugRoute)
app.use('/eligibility', eligibilityRoute)

app.get('/', (req, res) => {
  res.send(`Server running on port ${PORT}`);
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Restarted server successfully.');
});
