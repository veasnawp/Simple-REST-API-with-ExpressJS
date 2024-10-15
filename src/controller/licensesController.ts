import mongoose from "mongoose";
import { LicensesModel, User} from "../mongodb/model/index.js";
import { Request, Response } from "express";
import { getIdentity } from "../middlewares/index.js";


/**
 * @api {get} /userID/records
 * @apiGroup Records
 * @access Private
 */
const getAllRecords = async (req: Request, res: Response) => {
  let { userId } = req.params
  const {
    _end,
    _order,
    _start,
    _sort,
    productId = '',
    status = '',
    toolName = '',
    category = '',
    paymentMethod = '',
  } = req.query;

  const query = {} as LicenseRecord & {_id: string[]};

  const filterQueries = Object.entries({
    category,
    paymentMethod,
    status,
    toolName,
    productId,
  })

  for (const queryObj of filterQueries){
    const [key, val] = queryObj as string[];
    if (val !== "") {
      query[key] = key === 'amount' ? Number(val) : val;
    }
  }
  // if (title_like) {
  //   query.title = { $regex: title_like, $options: "i" };
  // }

  try {
    const findBy = userId.startsWith('user') ? { userId: userId } : { _id: userId }
    const user = await User.findOne(findBy);
    if (!user) return res.status(401).send({ error: "User not found" });

    query.userId = userId
    const count = await LicensesModel.countDocuments({ ...query });

    const start = Number(_start || 0);
    const end = Number(_end || 10);
    
    let filterRecords = LicensesModel.find(query)
    .limit(end)
    .skip(start)
    
    if(_sort && _order && ["asc","desc"].some(v => v === _order)){
      const sort = String(_sort);
      filterRecords = filterRecords.sort({ [sort]: _order as any });
    }
    let records = (await filterRecords.lean())
    if(records.length > 0){
      records = await Promise.all(
        records.map((dt) => {
          let status = dt.status;
          let isExpired = false;
          if(status !== 'expired'){
            const currentDate = new Date();
            const expiredDate = dt.expiresAt ? new Date(dt.expiresAt) : null
            isExpired = Boolean(expiredDate && currentDate.getTime() > expiredDate.getTime())
            if(isExpired){
              status = 'expired';

              let user = getIdentity(req);
              const keyId = `${dt.toolName}-${dt._id.toString()}`
              if(user && user.options && user.options[keyId] !== "expired"){
                User.findById(userId).then(async(user) => {
                  if(user){
                    if(user.options && keyId in user.options){
                      user.options = {...user.options, [keyId]: "expired"}
                    }
                    await user.save();
                  }
                })
              }
            }
          }
          return {
            ...dt,
            status,
          }
        }) as typeof records
      )
    }

    res.header("x-total-count", String(count));
    res.header("Access-Control-Expose-Headers", "x-total-count");

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};


/**
 * @api {get} /userID/records/id
 * @apiGroup Records
 * @access Private
 */

const getRecordById = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    const user = await User.findOne({ _id: userId }).lean();
    if (!user) return res.status(401).send({ error: "User not found" });

    const licenses = user.licenses.map(v=>v.toString());
    if (!licenses.some(v => v === id)) return res.status(401).send({error: "Record not found"});

    let license = await LicensesModel.findById({ _id: id });
    if(license){
      let status = license.status;
      let isExpired = false;
      if(status !== 'expired'){
        const currentDate = new Date();
        const expiredDate = license.expiresAt ? new Date(license.expiresAt) : null
        isExpired = Boolean(expiredDate && currentDate.getTime() > expiredDate.getTime())
        if(isExpired){
          status = 'expired'
          license.status = status
          license = await license.save();
        }
      }
    }

    res.status(200).json(license);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const createNewLicense = async (userId:string, newRecordBody: any)=> {
  try {

    let findBy = userId ? {_id: userId } : { email: newRecordBody.email }

    const session = await mongoose.startSession();
    session.startTransaction();

    const user = await User.findOne(findBy).session(session);
    if (!user) 
      return {status: 401, error: "User not found" };

    if(newRecordBody.email){
      delete newRecordBody.email
    }
    newRecordBody.userId = userId
    const license = await LicensesModel.create(newRecordBody);

    user.licenses.push(license._id);
    const toolName = license.toolName;
    user.options = {
      ...user.options,
      [`${toolName}-${license._id}`]: license.status
    }
    
    await user.save({ session });
    await session.commitTransaction();

    return {status: 200, data: license };
  } catch (error) {
    return {status: 500, error: (error as Error).message };
  }
}

/**
 * @api {post} /userID/records/id
 * @apiGroup Records
 * @access Private
 */
const createRecord = async (req: Request, res: Response) => {
  const { userId } = req.params
  const newRecordBody = req.body;
  const r = await createNewLicense(userId, newRecordBody);
  if(r.error){
    return res.status(r.status).send({error: r.error})
  }
  return res.status(r.status).send(r.data)
};

export const updateLicense = async (userId:string, id:string, newRecordBody: any) => {
  try {
    if (!(userId.length > 22 && userId.length < 28)) 
      return {status: 401, error: "User not found" };

    newRecordBody.userId = userId
    const license = await LicensesModel.findByIdAndUpdate(
      { _id: id },
      {...newRecordBody},
      { new: true }
    );
    if (!license) 
      return {status: 401, error: "Record not found" };

    if(newRecordBody.status){
      const user = await User.findById(userId);
      if(user){
        const toolName = license.toolName;
        user.options = {
          ...user.options,
          [`${toolName}-${license._id}`]: license.status
        }
        await user.save();
      }
    }
    return {status: 200, data: license };
  } catch (error) {
    return {status: 500, error: (error as Error).message };
  }
}

/**
 * @api {patch} /userID/records/id
 * @apiGroup Records
 * @access Private
 */
const updateRecord = async (req: Request, res: Response) => {
  const { userId, id } = req.params
  const newRecordBody = req.body;

  const r = await updateLicense(userId, id, newRecordBody);
  if(r.error){
    return res.status(r.status).send({error: r.error})
  }
  return res.status(r.status).send(r.data)
};

const deleteRecord = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    const user = await User.findOne({ _id: userId });
    if (!user) return res.status(401).send({ error: "User not found" });

    const recordToDelete = await LicensesModel.findById({ _id: id }).lean();
    if (!recordToDelete) return res.status(401).send("Record not found");

    await LicensesModel.findByIdAndDelete({ _id: id }).lean()

    user.licenses = user.licenses.filter(record => record.toString() !== id);

    let options = {...user.options}
    let optKeys = Object.keys(options).filter(k => k.includes(id))
    if(optKeys.length > 0){
      const key = optKeys[0]
      try {
        delete options[key]
      } catch {}
      user.options = options
    }
    await user.save();

    res.status(200).json({ message: "Record deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export {
  getAllRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord
};