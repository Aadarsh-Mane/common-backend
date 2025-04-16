import twilio from "twilio";
const TWILIO_ACCOUNT_SID = "AC35d86e0d9c60d2eb91c76053c7c863e1";
const TWILIO_AUTH_TOKEN = "7f9dc6bdf9cc474dcef00e303cf190fc";

export const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
