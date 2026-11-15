import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};
  
  const CHATTO_TOKEN = "chatto-token";
  
  export { corsOptions, CHATTO_TOKEN };
