import express from "express";
import { scrapeAllMedicinesJSON } from "../controllers/scrapperController.js";

const scrapeRouter = express.Router();

scrapeRouter.get("/scrapeAllMedicinesJSON", scrapeAllMedicinesJSON);
// scrapeRouter.get("/getMedicines", getMedicines);

export default scrapeRouter;
