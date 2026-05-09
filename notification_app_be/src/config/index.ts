import dotenv from "dotenv";
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || "5001", 10),

  auth: {
    email: process.env.AUTH_EMAIL || "",
    name: process.env.AUTH_NAME || "",
    rollNo: process.env.AUTH_ROLL_NO || "",
    accessCode: process.env.AUTH_ACCESS_CODE || "",
    clientID: process.env.AUTH_CLIENT_ID || "",
    clientSecret: process.env.AUTH_CLIENT_SECRET || "",
  },

  externalApi: {
    baseUrl: "http://4.224.186.213/evaluation-service",
    notificationsUrl: "http://4.224.186.213/evaluation-service/notifications",
    authUrl: "http://4.224.186.213/evaluation-service/auth",
    logsUrl: "http://4.224.186.213/evaluation-service/logs",
  },
};

const missingKeys = Object.entries(config.auth)
  .filter(([_, val]) => !val)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error(`missing env vars: ${missingKeys.join(", ")} — check your .env file`);
}

export default config;
