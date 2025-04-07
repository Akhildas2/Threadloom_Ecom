const nodemailer = require('nodemailer');
require("dotenv").config();


const sendResetPasswordEmail = async (name, email, token) => {
  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "For Password Reset",
      html: `<p>Hello ${name},<br><br>You have requested a password reset. Please click the following link to reset your password: <a href="${process.env.BASE_URL}/resetPassword?token=${token}">here</a>.</p>
        `,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent:", info.response);
      }
    });
  } catch (error) {
    console.log(error.message);
  }
};



module.exports = sendResetPasswordEmail;