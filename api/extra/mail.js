const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.NODEMAILER_HOST,
    secure: true,
    port: process.env.NODEMAILER_PORT,
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS,
    },
});

module.exports = {
    sendEmail: async function (mailTo, subject, content) {
        const mailOptions = {
            from: 'Prova Fotografias <no-reply@rafaeljesusaraiva.pt>', // sender address
            to: mailTo, 
            subject: subject, // Subject line
            html: content, // plain text body
        };

        await transporter.sendMail(mailOptions, function(err, info) {
            if (err) {
                console.log(err)
                return err;
            }
        })

        return true;
    }
}