import {Router} from "express";
import { login, logout, register, requestPasswordReset, token } from "../controller/authentication.js";
import { getUserSession, isAuthentication, isOwner } from "../middlewares/index.js";
import { limiter } from "../lib/utils.js";

const customLimitRequest = () => {
  const limit = 10;
  return limiter({
    windowMs: 30 * 60 * 1000, limit,
  });
}

const limiterRequest = customLimitRequest();

export default (router: Router) => {
    router.route("/auth/register").post(limiterRequest, register);
    router.route("/auth/login").post(limiterRequest, login);
    router.route("/auth/logout").post(logout);
    router.route("/auth/token").post(token);
    router.route("/auth/:id/password-reset").post(isAuthentication, isOwner, requestPasswordReset);
    router.route("/auth/session").post(getUserSession);
};