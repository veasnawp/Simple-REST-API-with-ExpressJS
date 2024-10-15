import { Router } from "express";
import {
    getAllRecords,
    createRecord,
    updateRecord,
    deleteRecord,
} from "../controller/recordsController.js";
import { isAuthentication, isOwner } from "../middlewares/index.js";


export default (router: Router) => {
    router.route("/:userId/records").get(isAuthentication, isOwner, getAllRecords);
    router.route("/:userId/records").post(isAuthentication, isOwner, createRecord);
    router.route("/:userId/records/:id").patch(isAuthentication, isOwner, updateRecord);
    router.route("/:userId/records/:id").delete(isAuthentication, isOwner, deleteRecord);
}