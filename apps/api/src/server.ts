import cors from "cors";
import express from "express";
import simulationRoutes from "./routes/simulation";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/simulation", simulationRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Simulation API running on http://localhost:${port}`);
});
