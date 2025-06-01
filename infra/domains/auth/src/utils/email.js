import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient();

export async function sendEmail(email, code) {
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
}
