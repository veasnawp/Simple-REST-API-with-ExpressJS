import bcrypt from "bcrypt"
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import CryptoJS from "crypto-js";
import { decodeJsonBtoa, encodeJsonBtoa } from "../util/index.js";

const TOKEN_SECRET = process.env.TOKEN_SECRET
const ACCESS_TOKEN = TOKEN_SECRET + '-ACCESS-TOKEN'; //-ACCESS-TOKEN
const REFRESH_TOKEN = TOKEN_SECRET + '-REFRESH-TOKEN';


export async function generateHashedPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

export async function passwordMatch(inputPassword: string, userPassword: string) {
  return await bcrypt.compare(
    inputPassword,
    userPassword
  )
}

export const random = () => crypto.randomBytes(128).toString('base64');

export const authentication = (salt: string, password: string) => {
  return crypto.createHmac('sha256', [salt, password].join('/')).update(ACCESS_TOKEN).digest('hex')
}

export async function passwordMatchToken(inputPassword: string, userPassword: string, salt: string) {
  return authentication(salt, inputPassword) === userPassword;
}

export const generateAccessToken = (user: string | object | Buffer, key: "access" | "refresh", options?: jwt.SignOptions) => {
  const secretKey = key === "access" ? ACCESS_TOKEN : REFRESH_TOKEN;
  return jwt.sign(user, secretKey, options)
}

export const verifyToken = (token: string, callback?: jwt.VerifyCallback<string | jwt.JwtPayload> | undefined) => {
  return jwt.verify(token, ACCESS_TOKEN, callback)
}

export const verifyRefreshToken = (refreshToken: string, callback?: jwt.VerifyCallback<string | jwt.JwtPayload> | undefined) => {
  return jwt.verify(refreshToken, REFRESH_TOKEN, callback)
}

export function generatePassword(passwordLength = 18, useLowercaseCb = true, useUppercaseCb = true, useDigitsCb = true, useSpecialsCb = true) {
  let dictionary = "";
  if (useLowercaseCb) {
    dictionary += "qwertyuiopasdfghjklzxcvbnm";
  }
  if (useUppercaseCb) {
    dictionary += "QWERTYUIOPASDFGHJKLZXCVBNM";
  }
  if (useDigitsCb) {
    dictionary += "1234567890";
  }
  if (useSpecialsCb) {
    dictionary += "!@#$%^&*()_+-={}[];<>:";
  }
  const length = passwordLength;

  if (length < 1 || dictionary.length === 0) {
    return;
  }

  let password = "";
  for (let i = 0; i < length; i++) {
    const pos = Math.floor(Math.random() * dictionary.length);
    password += dictionary[pos];
  }

  return password
}

export function cryptoEncrypt(obj:object, key?:string){
  const message = JSON.stringify(obj)
  const cipherText = CryptoJS.DES.encrypt(message, key || TOKEN_SECRET || "SIMPLE_SECRET_KEY").toString(CryptoJS.format.OpenSSL);
  const cipherTextEncode = encodeJsonBtoa({text: cipherText})
  return cipherTextEncode
}

export function cryptoDecrypt(cipherTextEncode:string, key?:string){
  var cipherText = decodeJsonBtoa(cipherTextEncode)?.text
  var plaintext  = CryptoJS.DES.decrypt(cipherText, key || TOKEN_SECRET || "SIMPLE_SECRET_KEY");
  return JSON.parse(plaintext.toString(CryptoJS.enc.Utf8));
}