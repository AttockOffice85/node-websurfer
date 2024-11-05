import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import botRoutes from "./src/routes/BotsRoute";
import companyRoutes from "./src/routes/CompanyRoute";

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 8080;

app.use(cors());
app.use(express.json());

/* ---------------------------------------------------------------------------------------------- */
/*                                             Routes                                             */
/* ---------------------------------------------------------------------------------------------- */
app.use("/api/bot", botRoutes);
app.use("/api/company", companyRoutes);

/* ---------------------------------------------------------------------------------------------- */
/*                                          Testing Route                                         */
/* ---------------------------------------------------------------------------------------------- */
app.get("/", (req, res) => {
  res.send("Hello world");
});

/* ---------------------------------------------------------------------------------------------- */
/*                                    Starting The Server Port                                    */
/* ---------------------------------------------------------------------------------------------- */
app.listen(port, () => {
  console.log(`Log server listening at http://localhost:${port}`);
});
