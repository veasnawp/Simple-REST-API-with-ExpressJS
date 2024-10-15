import express from "express";
import authRoutes from "./authentication.js";
import userRoute from './users.js';
import licensesRoutes from './licenses.js'
import recordsRoutes from './records.js'
import nodeRoutes from './node.js'

const router = express.Router();

export default (): express.Router => {
    authRoutes(router)
    userRoute(router)
    licensesRoutes(router)
    recordsRoutes(router)
    nodeRoutes(router)
    return router
}