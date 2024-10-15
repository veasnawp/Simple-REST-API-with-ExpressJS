import express from 'express'
import core from 'express-serve-static-core';

const asyncUtil = (fn: (...args: any[]) => any) =>
  function asyncUtilWrap(...args: any[]) {
    const fnReturn = fn(...args)
    const next = args[args.length-1]
    return Promise.resolve(fnReturn).catch(next)
  }

export default function expressAsyncHandler<
  P = core.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = core.Query,
>(handler: (...args: Parameters<express.RequestHandler<P, ResBody, ReqBody, ReqQuery>>) => ResBody | Promise<ResBody>): express.RequestHandler<P, ResBody, ReqBody, ReqQuery>{
  return asyncUtil(handler)
};
