// routes/distributorRoutes.js
import express from "express";
import {
  addToInventory,
  createCustomer,
  createDistributor,
  createMedicinesBulk,
  deleteCustomer,
  deleteDistributor,
  deleteInventory,
  deleteMedicine,
  getCustomer,
  getCustomers,
  getDistributor,
  getDistributorMedicines,
  getDistributors,
  getInventory,
  getMedicine,
  getMedicines,
  searchCustomers,
  searchMedicineInInventory,
  updateCustomer,
  updateDistributor,
  updateInventory,
} from "../controllers/pharma/pharmaOperation.js";
import { updateMedicine } from "../controllers/doctorController.js";
import {
  createReturn,
  createSale,
  createSaleFromPatientPrescription,
  getAllPrescriptions,
  getDashboardStats,
  getInventoryAnalytics,
  getReturn,
  getReturnByNumber,
  getReturns,
  getSale,
  getSaleByBillNumber,
  getSales,
  getSalesAnalytics,
  getSalesByCustomer,
} from "../controllers/pharma/pharmaController.js";

const pharmaRouter = express.Router();

pharmaRouter.post("/createDistributor", createDistributor);
pharmaRouter.get("/getDistributors", getDistributors);
pharmaRouter.get("/getDistributor/:id", getDistributor);
pharmaRouter.patch("/updateDistributor/:id", updateDistributor);
pharmaRouter.get(
  "/getDistributorMedicines/:distributorId",
  getDistributorMedicines
);
pharmaRouter.delete("/deleteDistributor/:id", deleteDistributor);

pharmaRouter.post("/createMedicine", createMedicinesBulk);
pharmaRouter.get("/getMedicines", getMedicines);
pharmaRouter.get("/getMedicine/:id", getMedicine);
pharmaRouter.post("/updateMedicine/:id", updateMedicine);

pharmaRouter.delete("/deleteMedicine/:id", deleteMedicine);

// routes/inventoryRoutes.js

pharmaRouter.post("/addToInventory", addToInventory);
pharmaRouter.get("/getInventory", getInventory);
pharmaRouter.get("/search", searchMedicineInInventory);
pharmaRouter.put("/updateInventory/:id", updateInventory);
pharmaRouter.delete("/deleteInventory/:id", deleteInventory);

pharmaRouter.post("/createCustomer", createCustomer);
pharmaRouter.get("/getCustomers", getCustomers);
pharmaRouter.get("/search", searchCustomers);
pharmaRouter.get("/getCustomer/:id", getCustomer);
pharmaRouter.put("/updateCustomer/:id", updateCustomer);
pharmaRouter.delete("/deleteCustomer/:id", deleteCustomer);

pharmaRouter.post("/createSale", createSale);
pharmaRouter.get("/getSales", getSales);
// pharmaRouter.get("/bill/:billNumber", getSaleByBillNumber);
// pharmaRouter.get("/customer/:customerId", getSalesByCustomer);
// pharmaRouter.get("/:id", getSale);

pharmaRouter.post("/createReturn", createReturn);
pharmaRouter.get("/getAllPrescriptions", getAllPrescriptions);
pharmaRouter.post(
  "/createSaleFromPatientPrescription",
  createSaleFromPatientPrescription
);
pharmaRouter.get("/getReturns", getReturns);
// pharmaRouter.get("/number/:returnNumber", getReturnByNumber);
// pharmaRouter.get("/:id", getReturn);

// pharmaRouter.get("/dashboard", getDashboardStats);
// pharmaRouter.get("/sales", getSalesAnalytics);
// pharmaRouter.get("/inventory", getInventoryAnalytics);

export default pharmaRouter;
