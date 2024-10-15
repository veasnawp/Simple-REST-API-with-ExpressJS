import { NextFunction, Request, Response } from "express";
import asyncHandler from "../async-handler/index.js";
import { User } from "../mongodb/model/index.js";
import { generatePassword, generateAccessToken, passwordMatch, generateHashedPassword, verifyRefreshToken } from "../helper/index.js";
import ms from 'ms';
import { isDev, isNumber } from "../util/index.js";
import { getIpAddress } from "../router/node.js";
// import url from 'url';



export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found — ${req.originalUrl}`);
  res.status(400);
  next(error);
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  if(err.name === 'CastError' ){ // && err.kind === 'ObjectId'
    statusCode = 400
    message = 'Resource not found';
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  })
}

/**
 * @desc Token expires in of value of maxAge
 * @example const maxAge = 24 * 3600 * 1000 // 1 day
 * const maxAge = 60 * 1000 // 1 minute
 */
export const defaultMaxAge = 30 * 24 * 3600 * 1000
/**
 * @readDocs https://www.npmjs.com/package/ms
 */
export const expireTime = ms(defaultMaxAge)

export const setCustomCookie = (res: Response, cookie_name:string, cookie_value: string, maxAge=defaultMaxAge) => {
  res.cookie(cookie_name, cookie_value, { 
    maxAge: maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict'
  })
}

export const setCookie = (res: Response, accessToken: string, maxAge=defaultMaxAge) => {
  res.cookie('user_session', accessToken, { 
    maxAge: maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict'
  })
}

export const setExpireCookie = (res: Response, cookie_name?:string) => {
  res.cookie(cookie_name || 'user_session', '', { 
    httpOnly: true,
    expires: new Date(0),
  })
}

export const isValidEmail = (email: string) => {

  // /^\S+@\S+$/ /?_end=([0-9])&_start=([0-9])$/
  return /^(([^<>()[\]\\.,;:#\s@"]+(\.[^<>()[\]\\.,;:#\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    .test(email.toLowerCase())
}

export const isInValidPassword = (value:string) => {
  if (value.length < 6) {
    return "Password must be at least 6 characters long";
  }

  if (!/[A-Z]/.test(value)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[a-z]/.test(value)) {
    return "Password must contain at least one lowercase letter";
  }

  if (!/[0-9]/.test(value)) {
    return "Password must contain at least one number";
  }

  if (value.length > 60) {
    return "Password is too long";
  }
}

/**
 * @api {post} /register
 * @apiGroup Authentication
 * @access Public
 */
export const register = asyncHandler(async (req, res) => {
  
  let newUserBody = req.body;
  let { email, username, password, withSocial, name, provider } = newUserBody;

  const withOauth = withSocial && typeof withSocial === "boolean" && provider === 'oauth';
  if (!password && withOauth) {
    password = generatePassword() + "__random";
    withSocial = true;
  } else {
    withSocial = false;
  }

  if (!['oauth','credentials'].some(v => v === provider)) 
    return res.status(401).send({ error: "Invalid Credentials" });
  if (!email || !password) 
    return res.status(400).send({ error: "Please provide an email"});

  if(!isValidEmail(email)){
    return res.status(400).json({
      error: "incorrect email"
    });
  }

  const invalidPasswordMessage = isInValidPassword(password)
  if(invalidPasswordMessage){
    return res.status(400).json({
      error: invalidPasswordMessage
    });
  }
  
  if ((email.length > 56 || name.length > 40)) 
    return res.status(400).json({
      error: "email or name is too long"
    });

  const userExists = await User.findOne({ email })
  if (userExists) 
    return res.status(200).json({
      email: userExists.email, 
      error: "user already registered"
    });

  const ip = (await getIpAddress(''))?.ip
  const users = await User.find({'authentication.ip': ip}).select('authentication');
  const ips = users.map(user => user.authentication?.ip);
  if(!isDev && ips.length >= 1){
    return res.status(400).json({
      error: "User created many accounts", 
      message: "Please don't create many accounts. You can delete old account and create a new one."
    });
  }

  if(!username){
    const emailSplit = email.split('@')
    newUserBody.username = (emailSplit[0] + '_' + emailSplit[1].split('.')[0]).toLowerCase();
  }

  const accessToken = generateAccessToken({email}, 'access', {expiresIn: expireTime});
  const refreshToken = generateAccessToken({email}, 'refresh');
  // const salt = random();

  if (password) {
    const hashedPassword = await generateHashedPassword(password);
    newUserBody = {
      ...newUserBody,
      authentication: {
        // salt,
        password: hashedPassword,
        sessionToken: accessToken, 
        refreshToken,
        withSocial,
        ip
      }
    }
  }

  const userCreated = new User(newUserBody);
  const user = await userCreated.save();
  setCookie(res, accessToken);
  
  const userObj = user.toObject();
  if(userObj.authentication){
    delete userObj.authentication
  }
  res.status(200).send(userObj).end();
})

/**
 * @api {post} /login
 * @apiGroup Authentication
 * @access Public
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  let newUserBody = req.body;
  let { email, password, withSocial, provider } = newUserBody;

  const withOauth = withSocial && typeof withSocial === "boolean" && provider === 'oauth';
  if (!password && withOauth) {
    password = generatePassword() + "__random";
    withSocial = true;
  } else {
    withSocial = false;
  }


  if (!['oauth','credentials'].some(v => v === provider)) 
    return res.status(401).send({ error: "Invalid Credentials" });
  if (!email || !password)
    return res.status(400).send({ error: "Please provide an email" });

  const user = await User.findOne({ email })
  if (!user) return res.status(401).send({ error: "User not found" });

  const userAuth = (await User.findOne({ email }).select('authentication'))?.authentication

  // console.log("userAuth",userAuth)

  if (userAuth && userAuth.password) {
    if (!userAuth.withSocial && !withOauth) {
      const passwordIsValid = await passwordMatch(password, userAuth.password);
      // const passwordIsValid = passwordMatchToken(password, userAuth.password as string, userAuth.salt);
      if (!passwordIsValid) {
        return res.status(403).send({ error: "Incorrect password" });
      }
    }

    let userAuthUpdate = {
      ...userAuth,
    }
    let accessToken = userAuth.sessionToken as string
    if(accessToken){
      const decodedJwt = JSON.parse(atob(accessToken.split(".")[1]));
      if(decodedJwt?.exp * 1000 < Date.now()) {
        accessToken = generateAccessToken({email}, 'access', {expiresIn: expireTime});
        const refreshToken = generateAccessToken({email}, 'refresh');
        userAuthUpdate.sessionToken = accessToken
        userAuthUpdate.refreshToken = refreshToken
      }
    }
    user.authentication = {
      ...userAuthUpdate
    }
    if(withOauth){
      user.provider = provider
      if(typeof newUserBody.avatar === 'string')
      user.avatar = newUserBody.avatar
    }
    const machineId = newUserBody.options?.machineId as string
    if(machineId && !user.options?.machineId){
      user.options = {
        ...user.options, machineId: machineId.toUpperCase()
      }
    }

    await user.save();

    setCookie(res, accessToken);
  }

  let userObj = user.toObject();
  if(userObj.authentication?.password){
    delete userObj.authentication.password
    if(userObj.authentication.salt)
    delete userObj.authentication.salt
  }

  res.status(200).send(userObj).end();
})

/**
 * @api {post} /logout
 * @apiGroup Authentication
 * @access Public
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  setExpireCookie(res);
  res.status(200).json({message: "User logged out"})
})

/**
 * @api {post} /token
 * @apiGroup Authentication
 * @access Public
 */
export const token = asyncHandler(async (req: Request, res: Response) => {
  let refreshToken = req.body.token || req.query.token;
  let maxAge = req.body.maxAge || req.query.maxAge;

  if (!refreshToken) return res.sendStatus(401);

  const user = await User.findOne({ "authentication.refreshToken": refreshToken }).select('authentication')
  const userAuth = user?.authentication
  if (!user || !userAuth || userAuth.refreshToken !== refreshToken) return res.status(401).send({ error: "User not found" });

  verifyRefreshToken(refreshToken, async (err, userToken) => {
    if(err) return res.sendStatus(403);
    if(!userToken || typeof userToken === 'string' || !userToken.email) return res.status(401).send({ error: "User not found" });

    let expiresIn = expireTime;
    if(isNumber(maxAge)){
      maxAge = Number(maxAge);
      expiresIn = ms(maxAge);
    } else {
      maxAge = undefined
    }
    const email = userToken.email
    const accessToken = generateAccessToken({ email }, 'access', {expiresIn});
    user.authentication = { ...userAuth, sessionToken: accessToken }
    await user.save();

    setCookie(res, accessToken, maxAge);

    res.status(200).send({ accessToken: accessToken }).end()
  })
})

/**
 * @api {post} /passwordReset
 * @apiGroup Authentication
 * @access Private
 */
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  let newUserBody = req.body;
  let { password, provider } = newUserBody;

  const withOauth = provider === 'oauth';
  if (!password && withOauth) {
    password = generatePassword() + "__random";
  }

  if (!['oauth','credentials'].some(v => v === provider)) 
    return res.status(401).send({ error: "Invalid Credentials" });
  if (!password) 
    return res.status(400).send({ error: "Please provide an password"});

  const invalidPasswordMessage = isInValidPassword(password)
  if(invalidPasswordMessage){
    return res.status(400).json({
      error: invalidPasswordMessage
    });
  }

  const user = await User.findById(id).select('authentication');
  const userAuth = user?.authentication

  if (!user || !userAuth) 
    return res.status(401).send({ error: "User not found" });

  const email = user.email
  const accessToken = generateAccessToken({ email }, 'access');
  const refreshToken = generateAccessToken({ email }, 'refresh');
  const hashedPassword = await generateHashedPassword(password);
  user.authentication = { 
    ...userAuth, 
    password: hashedPassword, 
    sessionToken: accessToken, 
    refreshToken 
  }
  await user.save();

  setCookie(res, accessToken);
  res.status(200).send({ message: 'Your password changed successful', accessToken }).end()
})
