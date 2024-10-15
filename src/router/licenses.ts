import { Router } from "express";
import {
    getAllRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    getRecordById,
} from "../controller/licensesController.js";
import { isAdmin, isAuthentication, isOwner } from "../middlewares/index.js";


export default (router: Router) => {
  router.route("/:userId/l-records").post(isAuthentication, isAdmin, createRecord);
  router.route("/:userId/l-records").get(isAuthentication, getAllRecords);
  router.route("/:userId/l-records/:id").get(isAuthentication, isOwner, getRecordById);
  router.route("/:userId/l-records/:id").patch(isAuthentication, isOwner, updateRecord);
  router.route("/:userId/l-records/:id").delete(isAuthentication, isOwner, deleteRecord);
}