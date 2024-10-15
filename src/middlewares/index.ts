import { NextFunction, Request, Response } from "express";
import lodash from 'lodash'
import { User } from "../mongodb/model/index.js";
import expressAsyncHandler from "../async-handler/index.js";
import { setExpireCookie } from "../controller/authentication.js";

export const ADMIN_EMAILS = [...process.env.ADMIN_EMAILS];
export const isAdminEmail = (email:string) => ADMIN_EMAILS.some(mail => mail === email.toLowerCase());

const { get, merge } = lodash;

export const getIdentity = (req: Request) => {
  const user = get(req, 'identity') as unknown;
  return user as UserProps | undefined
}

export const getDataFromRequest = (req: Request, key: string) => {
  const data = get(req, key) as unknown;
  return data as any
}

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  let currentUserId = get(req, 'identity._id') as unknown;

  try {
    if (!currentUserId) {
      return res.sendStatus(403);
    }
    currentUserId = currentUserId.toString()
    const user = await User.findOne({ _id: currentUserId }).lean()
    if (!user || (user && !ADMIN_EMAILS.some(mail => mail === user.email.toLowerCase()))) {
      return res.sendStatus(403);
    }
    next();
  } catch (error) {
    return res.status(400).send({ error: (error as Error).message });
  }
}

export const isOwner = async (req: Request, res: Response, next: NextFunction) => {
  const user = getIdentity(req);
  if(user && ADMIN_EMAILS.some(mail => mail === user.email.toLowerCase())){
    return next();
  }
  const { id, userId } = req.params;

  let ID = id || userId;
  if(userId && !req.path.startsWith('/users/')){
    ID = userId
  }

  const currentUserId = get(req, 'identity._id') as unknown;
  try {
    if (!currentUserId) {
      return res.sendStatus(403);
    }
    if (currentUserId.toString() !== ID) {
      return res.sendStatus(403);
    }
    next();
  } catch (error) {
    return res.status(400).send({ error: (error as Error).message, currentUserId });
  }
}

export const isAuthentication = expressAsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const sessionToken = req?.cookies?.['user_session'];
  
  try {
    if (!sessionToken) {
      console.log("isAuthentication sessionToken", sessionToken)
      return res.sendStatus(403);
    }
    const user = await User.findOne({ "authentication.sessionToken": sessionToken }).lean()
    // .select('authentication');

    if (!user) {
      console.log("isAuthentication ID", { error: "User not found" })
      return res.status(401).send({ error: "User not found" });
    }

    merge(req, { identity: user });
    return next()
  } catch (error) {
    return res.status(400).send({ error: (error as Error).message, sessionToken });
  }
})


export const __getUserBySessionToken = async (
  sessionToken: string,
  res: Response
) => {
  
  if (!sessionToken) {
    return res.status(201).send({error: "no session"});
  }
  try {
    const user = await User.findOne({ "authentication.sessionToken": sessionToken }).lean();
    
    if (!user) {
      setExpireCookie(res)
      return res.status(401).send({ error: "User not found" });
    }
    const userAuth = (await User.findOne({ email: user.email }).select('authentication').lean())?.authentication
    if(userAuth){
      user.authentication = {
        ...userAuth
      }
    }

    const userObj = user;

    if(userObj.authentication?.password){
      delete userObj.authentication.password
      delete userObj.authentication.salt
    }

    return res.status(200).send(userObj).end()
  } catch (error) {
    return res.status(400).send({ error: (error as Error).message, sessionToken });
  }
}

export const getUserBySessionToken = expressAsyncHandler(async (req, res) => {
  const sessionToken = req.body.token;
  return await __getUserBySessionToken(sessionToken, res);
})

export const getUserSession = expressAsyncHandler(async (req, res) => {
  const sessionToken = req?.cookies?.['user_session'];
  if(!req.headers?.["user-agent"]?.startsWith('Mozilla/')){
    return res.status(403).send({message: "no session"})
  }
  return await __getUserBySessionToken(sessionToken, res);
})
