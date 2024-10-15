import { Express, Request, Router } from "express";
import expressAsyncHandler from "../async-handler/index.js";
import { decodeJsonBtoa } from "../util/index.js";

import url from 'url';
import { sharpBase64 } from "./node.js";
import { requestRouter } from "./request.js";

export const ROOT = '/';
export const PUBLIC_ROUTES = ['/login', '/register'];
export const PROTECTED_ROUTES = ['/dashboard', '/admin'];


export const isProtectedRoute = (async (req: Request) => {
  const isProtectedRoute = PROTECTED_ROUTES.some(r => req.path.startsWith(r));
  if(isProtectedRoute){
    const sessionToken = req?.cookies?.['user_session'];
    if (!sessionToken) {
      return false
    }
    return true;
  }
  return true
});

const iconLogo = expressAsyncHandler(async (req, res) => {
  const { size } = req.params;
  if(!size || (size && !['512','192'].some(v => v === size))){
    return res.redirect('/not-found/')
  }
  const domain = url.format({ host: req.get('host') });
  const image = req.protocol.concat('://', domain, '/img/logo.png');
  let img64 = await sharpBase64(image, Number(size))
  if(!img64){
    return res.redirect('/not-found/')
  }

  res.writeHead(200, {
      'Content-Length': img64.length,
      'Content-Type': 'image/jpeg'
  });
  res.end(img64);
})

const resizeImage = expressAsyncHandler(async (req, res) => {
  const { data } = req.query;
  if(!data || typeof data !== 'string'){
    return res.sendStatus(404);
  }
  let { url, width, height, w, h, placeholder, isExpired } = decodeJsonBtoa(data);
  if(!url || typeof url !== 'string'){
    return res.sendStatus(404);
  }
  width = width || w, height = height || h

  width = width ? Number(width) : undefined
  height = height ? Number(height) : undefined

  let img64: Buffer | undefined;
  try {
    img64 = await sharpBase64(url, width, height);
    if(!img64){
      return res.sendStatus(404);
    }
  } catch {
    if(placeholder){
      return res.redirect('/img/no-image-placeholder.svg');
    } else if(isExpired){
      return res.status(301).send({errorCode: 1, message: 'Image is Expired'})
    }
    return res.redirect(url);
  }

  res.writeHead(200, {
      'Content-Length': img64.length,
      'Content-Type': 'image/jpeg'
  });
  res.end(img64);
})


export const rootRouter = (router: Router) => {
  router.route("/icons-:size.png").get(iconLogo);
  router.route("/ct-image").get(resizeImage);
}

export default (app: Express) => {
  const router = Router();
  rootRouter(router);
  requestRouter(router);
  return app.use("/", router);
}
