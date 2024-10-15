import { generateAccessToken } from "../helper/index.js";
import { LicensesModel, User } from "../mongodb/model/index.js";
import { Request, Response } from "express";
import { expireTime, setCookie } from "./authentication.js";
import { isAdminEmail } from "../middlewares/index.js";


/**
 * @api {get} /users Get All Records
 * @apiGroup Users
 * @access Private
 */
export const getAllUsers = async (req: Request, res: Response) => {
  const {
    _end,
    _order,
    _start,
    _sort,
    _with_licenses,
  } = req.query;

  const start = Number(_start||0);
  const end = Number(_end||10);

  try {
    let users = await User.find().limit(end).skip(start).lean();
    if(typeof _with_licenses === 'string' && _with_licenses === 'true'){
      users = await Promise.all(users.map(async(user)=>{
        if(user.licenses.length > 0){
          const _ids = user.licenses.map(l => l.toString())
          const $licenses = await Promise.all(_ids.map(async(_id) => await LicensesModel.findById(_id).lean()));
          user.licenses = ($licenses as any[])
        }
        return user
      }))
    }
    return res.status(200).json(users);
    
  } catch (error) {
    res.status(404).send({error: (error as Error).message});
  }
};


/**
 * @api {put} /users Update Many Records By User IDs
 * @apiGroup Users
 * @access Private
 */
export const updateMultipleUsers = async (req: Request, res: Response) => {
  const newRecordsBody = req.body.records as FinancialRecordDoc[];
  const allowCreateNewRecord = req.body.allowCreateNewRecord as boolean

  if (!(newRecordsBody && typeof newRecordsBody === "object" && Array.isArray(newRecordsBody))) {
    return res.status(400).send({ error: "Please provide an records body" });
  }

  const newRecords = await Promise.all(
    newRecordsBody.map(async(newRecord) => {
      const id = newRecord._id
      try {
        if(!id && allowCreateNewRecord){
          const record = new User(newRecord);
          const savedRecord = await record.save();
          return savedRecord;
        }
        const record = await User.findByIdAndUpdate(
          id,
          newRecord,
          { new: true }
        );
        // Check for existing user's record
        if (!record || (record && !record._id)) {
          return {error: "No record found", id};
        }
        return record;
      } catch (error) {
        return {error: (error as Error).message, id};
      }
    })
  )
  const validRecords = newRecords
  if(validRecords.filter(v => !v.error).length === 0){
    return res.status(500).send(newRecords.filter(v => v.error));
  }
  res.status(200).send(validRecords)
};

/**
 * @api {post} /users Create New Record
 * @apiGroup Users
 * @access Public
 */
export const createNewUser = async (req: Request, res: Response) => {
  const newUserBody = req.body;
  const { email } = req.body

  try {
    let userExists = await User.findOne({email}).select('authentication');

    if (userExists) return res.status(400).json({email, error: "username already exists"});

    const userCreated = new User(newUserBody);
    const user = await userCreated.save();

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({error: (error as Error).message, email});
  }
};

/**
 * @api {post} /users/userID
 * @apiGroup Users
 * @access Private
 */
export const getUserByUserId = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { _with_licenses } = req.query

  if (!id) {
    return res.status(400).send({ error: "Please provide an user ID" });
  }

  try {
    const user = await User.findOne({ _id: id }).lean()
    if (!user) {
      return res.status(401).send({ error: "User not found" });
    }
    if(typeof _with_licenses === 'string' && _with_licenses === 'true'){
      if(user.licenses.length > 0){
        const _ids = user.licenses.map(l => l.toString())
        const $licenses = await Promise.all(_ids.map(async(_id) => await LicensesModel.findById(_id).lean()));
        user.licenses = ($licenses as any[])
      }
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({error: (error as Error).message, id});
  }
};

/**
 * @api {put} /users/userID
 * @apiGroup Users
 * @access Private
 */
export const updateUserByUserId = async (req: Request, res: Response) => {
  const { id } = req.params;
  const newUserBody = req.body;
  const { email, username } = newUserBody;

  // if (!(email)) {
  //   return res.status(400).send({ error: "Please provide an user ID" });
  // }

  try {
    const user = await User.findOne({_id: id}).lean()
    if(!user) return res.status(401).send({ error: "User not found" });
    
    if(username && typeof username === 'string' && user?.username?.toLowerCase() !== username?.toLowerCase()){
      const usernameExists = await User.findOne({username})
      if(usernameExists){
        return res.status(400).send({ error: "username already exists" });
      }
    }
    let isEmailChanged = false;
    if(email && typeof email === 'string' && user?.email?.toLowerCase() !== email?.toLowerCase()){
      const userExists = await User.findOne({email}).lean()
      if(userExists){
        return res.status(400).send({ error: "email already exists" });
      } else {
        isEmailChanged = true
      }
    }

    if(username === '' || typeof username !== "string"){
      delete newUserBody.username
    }

    let accessToken: string | undefined;
    if(email === '' || typeof email !== "string"){
      delete newUserBody.email
    } else if(isEmailChanged) {
      accessToken = generateAccessToken({email}, 'access', {expiresIn: expireTime});
      const refreshToken = generateAccessToken({email}, 'refresh');
      const userAuth = (await User.findOne({_id: id}).select('authentication').lean())?.authentication
      newUserBody.authentication = {
        ...userAuth,
        sessionToken: accessToken, 
        refreshToken,
      }
    }
    
    if(newUserBody._id){
      delete newUserBody._id
    }
    if(!isAdminEmail(user.email)){
      newUserBody.role = user.role
    }

    const userUpdate = await User.findByIdAndUpdate(
      id,
      newUserBody,
      { new: true }
    );
    if (!userUpdate) {
      return res.status(401).send({ error: "User not found" });
    }
    if(accessToken){
      setCookie(res, accessToken);
    }
    const userObj = userUpdate.toObject();
    if(newUserBody.authentication){
      if(newUserBody.authentication.password)
        delete newUserBody.authentication.password
      userObj.authentication = newUserBody.authentication
    }
    res.status(200).send(userObj);
  } catch (error) {
    res.status(500).send({error: (error as Error).message, id});
  }
};

/**
 * @api {delete} /users/userID
 * @apiGroup Users
 * @access Private
 */
export const deleteUserByUserId = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).send({ error: "Please provide an user ID" });
  }

  try {
    const user = await User.findByIdAndDelete(id).lean();
    // Check for existing user
    if (!user) {
      return res.status(404).send();
    }
    res.status(200).send({message: "User deleted successful", ...user});
  } catch (error) {
    res.status(500).send({error: (error as Error).message, id});
  }
};
