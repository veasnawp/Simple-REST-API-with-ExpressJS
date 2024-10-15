import mongoose, { Document, Schema, model } from "mongoose";

interface FinancialRecordCategories {
  business: string | object;
  household: string | object;
  savings: object;
  loans: object;
}


declare global {
  interface UserProps {
    _id: string;
    userId: string;
    name?: string;
    email: string;
    avatar?: string;
    authentication: {
      password?: string
      salt?: string
      sessionToken: string;
      refreshToken: string;
      withSocial: boolean
      ip: string;
    },
    role: "user"|"moderator"|"admin",
    provider: "credentials"|"oauth",
    licenses: LicenseRecord[];
    records: FinancialRecord[];
    options?: {
      machineId?: string
    } & Record<string,any>;
    error?: any;
  }
  type FinancialRecord = {
    id: string;
    userId: string;
    date: number;
    updatedDate?: number;
    amount: number;
    category: keyof FinancialRecordCategories | (string & {});
    childCategory?: string;
    paymentMethod: string;
    note?: string;
  }
  type LicenseRecord = {
    id: string;
    userId: string;
    productId: string;
    status: string;
    modifyDateActivated: string;
    activationDays: { type: Number };
    expiresAt: string;
    currentPlan: string;
    historyLicenseBough: string[];
    toolName: string;
    category: string;
    paymentMethod: string;
    note: string;
    options: Record<string,any>,
  }

  interface FinancialRecordDoc extends UserProps {
    // mathPassword: (pass: string) => Promise<boolean>;
  }
}

const UserRecordSchema = new Schema(
  {
    userId: { type: String },
    name: { type: String },
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true },
    avatar: { type: String },
    authentication: {
      password: { type: String, select: false },
      salt: { type: String, select: false },
      sessionToken: { type: String, select: false },
      refreshToken: { type: String, select: false },
      withSocial: { type: Boolean, select: false },
      ip: { type: String, select: false },
    },
    role: {
      type: String,
      default: "user"
    },
    provider: {
      type: String,
      default: "credentials"
    },
    records: [{ type: mongoose.Schema.Types.ObjectId, ref: "Records" }],
    licenses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Licenses" }],
    options: { type: Object },
    error: { type: String },
  },
  {
    timestamps: true
  }
);

const UserModel = model("User", UserRecordSchema);

export default UserModel;