// routes/distributorRoutes.js
import express from "express";
import {
  addToInventory,
  createCustomer,
  createDistributor,
  createMedicine,
  deleteCustomer,
  deleteDistributor,
  deleteInventory,
  deleteMedicine,
  getCustomer,
  getCustomers,
  getDistributor,
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
// pharmaRouter.get("/", getDistributors);
// pharmaRouter.get("/:id", getDistributor);
// pharmaRouter.put("/:id", updateDistributor);
// pharmaRouter.delete("/:id", deleteDistributor);

pharmaRouter.post("/createMedicine", createMedicine);
pharmaRouter.get("/getMedicines", getMedicines);
pharmaRouter.get("/getMedicine/:id", getMedicine);
// pharmaRouter.put("/:id", updateMedicine);

// pharmaRouter.delete("/:id", deleteMedicine);

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
// pharmaRouter.put("/:id", updateCustomer);
// pharmaRouter.delete("/:id", deleteCustomer);

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
