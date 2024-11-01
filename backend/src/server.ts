import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import botRoutes from "./routes/BotsRoute";
import companyRoutes from "./routes/CompanyRoute";

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 8080;

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your React app's URL
    credentials: true, // Allow credentials if needed (e.g., cookies)
  })
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // Replace with your frontend URL
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});
app.use(express.json());

/* ---------------------------------------------------------------------------------------------- */
/*                                             Routes                                             */
/* ---------------------------------------------------------------------------------------------- */

app.use("/api/bot", botRoutes);
app.use("/api/company", companyRoutes);

/* ---------------------------------------------------------------------------------------------- */
/*                                              Port                                              */
/* ---------------------------------------------------------------------------------------------- */

app.listen(port, () => {
  console.log(`Log server listening at http://localhost:${port}`);
});
