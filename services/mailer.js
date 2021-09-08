const nodemailer = require("nodemailer");
const config = require("config");

var transporter = nodemailer.createTransport({
  host: "smtp.seznam.cz",
  port: 465,
  secure: true,
  auth: {
    user: "koishi@email.cz",
    pass: config.get("email"),
  },
});

module.exports.sendRegistrationVerificationEmail = async (user) => {
  let content = {
    from: "koishi@email.cz",
    to: user.email,
    subject: "New account verification",
    html: `<!DOCTYPE html>\
    <head>\
      <meta http-equiv=\"Content-Type\" content=\"text/html charset=UTF-8\" />\
    \
      <style>\
        body {\
          font-family: Calibri;\
          margin: 0;\
          padding: 40px;\
          border: none;\
          background-color: whitesmoke;\
        }\
    \
        .divider {\
          height: 1px;\
          width: 100%;\
          background-color: lightgrey;\
        }\
    \
        .main {\
          text-align: center;\
          width: 100%;\
          background-color: white;\
          border: 1px solid lightgray;\
          border-radius: 6px;\
        }\
    \
        .heading {\
          font-weight: bold;\
          font-size: 40px;\
          color: #0066ff;\
          margin: 10px;\
          text-shadow: 0px 0px 6px rgba(0, 0, 0, 0.25);\
        }\
    \
        .text {\
          text-align: center;\
          color: rgb(90, 90, 90);\
          padding-left: 60px;\
          padding-right: 60px;\
          padding-top: 40px;\
        }\
    \
        .code {\
          color: rgb(90, 90, 90);\
          font-size: 50px;\
          margin-top: 0;\
          margin-bottom: 20px;\
          letter-spacing: 4px;\
          letter-spacing: 4px;\
        }\
    \
        .link {\
          color: rgb(90, 90, 90);\
          padding-left: 60px;\
          padding-right: 60px;\
          padding-top: 20px;\
          padding-bottom: 20px;\
          margin: 10px;\
        }\
      </style>\
    </head>\
    <html>\
      <body>\
        <div class=\"main\">\
          <p class=\"heading\">Koishi</p>\
          <div class=\"divider\"></div>\
          <p class=\"text\">\
            Hi,<br />\
            thank you for signing with Koishi UwU.<br />\
            Use the code below to verify your account:<br />\
          </p>\
          <p class=\"code\">${user.verificationCode}</p>\
          <div class=\"divider\"></div>\
          <p></p>\
          <a href=\"https://koishi-space.herokuapp.com\" class=\"link\">\
            Koishi.space\
          </a>\
          <p></p>\
        </div>\
      </body>\
    </html>\
    `
  };

  try {
    await transporter.sendMail(content);
  } catch (e) {
    console.log(e);
  }
};
