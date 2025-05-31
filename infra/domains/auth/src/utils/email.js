const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const ses = new SESClient();

exports.sendEmail = async (email, code) => {
  const params = {
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: "Your verification code" },
      Body: {
        Text: {
          Data: `Your verification code is:\n\n${code}`,
        },
      },
    },
    Source: process.env.SOURCE_EMAIL,
  };

  await ses.send(new SendEmailCommand(params));
};
