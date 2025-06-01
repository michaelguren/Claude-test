// domains/auth/utils/email.js
// Sends email using AWS SES

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SOURCE_EMAIL } from "infra/domains/_shared/utils/constants.js";
import { logError, logInfo } from "infra/domains/_shared/utils/logger.js";

const sesClient = new SESClient({});

export const sendVerificationEmail = async (email, otp) => {
  const params = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Text: {
          Data: `Your verification code is: ${otp}`,
        },
      },
      Subject: {
        Data: "Minimalist TODO App - Verification Code",
      },
    },
    Source: SOURCE_EMAIL,
  };

  try {
    const command = new SendEmailCommand(params);
    await sesClient.send(command);
    logInfo("Email.sendVerificationEmail", "Verification email sent", {
      email,
    });
  } catch (error) {
    logError("Email.sendVerificationEmail", error, { email });
    throw error;
  }
};
