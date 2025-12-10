require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const loginRoute = require("./routes/login");
const passwordResetOTPRoutes = require("./routes/passwordResetOTP");
const { init } = require('./models/init');

// middleware
app.use(cors()); // enable CORS for all routes (helps when using Live Server)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// routes (ensure each require resolves to an Express router)
app.use("/api/login", loginRoute);
app.use("/api/password-reset", passwordResetOTPRoutes);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/admins', require('./routes/admin')); // file is admin.js (singular)
app.use('/api/events', require('./routes/events'));
app.use('/api/payments', require('./routes/payments'));

//start server
const PORT = process.env.PORT || 5000;
init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database tables', err);
  process.exit(1);
});
