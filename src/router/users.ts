import { Router } from "express";
import { getUserByUserId, getAllUsers, updateUserByUserId, deleteUserByUserId, updateMultipleUsers } from "../controller/userControllers.js";
import { getUserBySessionToken, isAdmin, isAuthentication, isOwner } from "../middlewares/index.js";


export default (router: Router) => {
    // Get All Users
    router.route("/users").get(isAuthentication, isAdmin, getAllUsers);
    router.route("/users").post(isAuthentication, isAdmin, getAllUsers);

    // Update Many Users By User IDs
    router.route("/users").put(isAuthentication, isAdmin, updateMultipleUsers);
    
    // Create New User
    // router.route("/users").post(createNewUser); use auth/register instead
    
    // Get User By User ID
    router.route("/users/:id").post(isAuthentication, isOwner, getUserByUserId);
    
    // Get User By User Session Token
    router.route("/users/session").post(getUserBySessionToken);
    
    // Update User By User ID
    // router.route("/users/:id").put(updateUserByUserId);
    router.route("/users/:id").put(isAuthentication, isOwner, updateUserByUserId);
    
    // Delete User By User ID
    router.route("/users/:id").delete(isAuthentication, isOwner, deleteUserByUserId);
}
