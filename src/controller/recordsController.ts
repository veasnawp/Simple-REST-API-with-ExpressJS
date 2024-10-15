import mongoose from "mongoose";
import { RecordsModel, User} from "../mongodb/model/index.js";
import { Request, Response } from "express";


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
    amount = '',
    originalAmount = '',
    category = '',
    childCategory = '',
    paymentMethod = '',
  } = req.query;

  const query = {} as FinancialRecord & {_id: string[]};

  const filterQueries = Object.entries({
    category,
    childCategory,
    paymentMethod,
    amount,
    originalAmount,
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
    const count = await RecordsModel.countDocuments({ ...query });

    const start = Number(_start||0);
    const end = Number(_end||10);
    
    let filterRecords = RecordsModel.find(query)
    .limit(end)
    .skip(start)
    
    if(_sort && _order && ["asc","desc"].some(v => v === _order)){
      const sort = String(_sort);
      filterRecords = filterRecords.sort({ [sort]: _order as any });
    }
    let records = await filterRecords

    res.header("x-total-count", String(count));
    res.header("Access-Control-Expose-Headers", "x-total-count");

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};


/**
 * @api {post} /userID/records/id
 * @apiGroup Records
 * @access Private
 */
const createRecord = async (req: Request, res: Response) => {
  const { userId } = req.params
  try {
    const newRecordBody = req.body;

    let findBy = userId ? {_id: userId } : { email: newRecordBody.email }

    const session = await mongoose.startSession();
    session.startTransaction();

    const user = await User.findOne(findBy).session(session);
    if (!user) return res.status(401).send({ error: "User not found" });

    if(newRecordBody.email){
      delete newRecordBody.email
    }
    newRecordBody.userId = userId
    const record = await RecordsModel.create(newRecordBody);

    user.records.push(record._id);
    await user.save({ session });

    await session.commitTransaction();

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * @api {patch} /userID/records/id
 * @apiGroup Records
 * @access Private
 */
const updateRecord = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params

    if (!(userId.length > 22 && userId.length < 28)) return res.status(401).send({ error: "User not found" });

    const newRecordBody = req.body;

    newRecordBody.userId = userId
    const record = await RecordsModel.findByIdAndUpdate(
      { _id: id },
      {...newRecordBody},
      { new: true }
    );
    if (!record) return res.status(401).send("Record not found");

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

const deleteRecord = async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    const user = await User.findOne({ _id: userId });
    if (!user) return res.status(401).send({ error: "User not found" });

    const recordToDelete = await RecordsModel.findById({ _id: id });
    if (!recordToDelete) return res.status(401).send("Record not found");

    await RecordsModel.findByIdAndDelete({ _id: id })

    user.records = user.records.filter(record => record.toString() !== id);
    await user.save();

    res.status(200).json({ message: "Record deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export {
  getAllRecords,
  createRecord,
  updateRecord,
  deleteRecord
};