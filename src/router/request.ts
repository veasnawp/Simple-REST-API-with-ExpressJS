import { Express, Request, Router } from "express";
import expressAsyncHandler from "../async-handler/index.js";
import { Encryption } from "../helper/encryption.js";
import fetch from "node-fetch";
import http from "http";
import https from "https";
import contentDisposition from "content-disposition";


const request = expressAsyncHandler(async (req, res) => {
  const { data } = req.query;
  if (!data || typeof data !== 'string') {
    return res.sendStatus(404);
  }
  const encryption = new Encryption();
  const secretKey = encryption.simpleSecretKey;
  let { url, responseType, options, useData, hash, encodeResponse, title, stopSize } = JSON.parse(encryption.decrypt(data, secretKey));

  if (!url || typeof url !== 'string') {
    return res.status(400).send({ errorCode: 1, message: 'Please provide an URL' });
  }
  else if (hash !== req.params.hash) {
    return res.status(400).send({ errorCode: 1, message: 'Invalid token' });
  }
  let __responseType = responseType as 'json' | 'text' | undefined | null;

  if (
    options &&
    typeof options === 'object' &&
    !Array.isArray(options) &&
    options.body
  ) {
    options.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }
  const r = await fetch(url, options);
  const headers = {} as Record<string, any>;
  for (const key of r.headers.keys()) {
    headers[key] = r.headers.get(key);
  }

  let dataSend = {
    data: null,
    status: r.status,
    statusText: r.statusText,
    ok: r.ok,
    // body: r.body, bodyUsed: r.bodyUsed,
    headers,
    url: r.url,
    redirected: r.redirected,
  } as Record<string,any>;

  if (useData === 'no' || useData === 'buffer') {
    if(useData === 'buffer'){
      url = r.url
      const request = url.startsWith('https://') ? https : http;
      const resp = request.get(url, async stream => {
        const headers = stream.headers;
        console.log(headers)

        if (!(headers['accept-ranges'] && headers['content-length'])) {
          return res.redirect(url);
        }
        let type = headers['content-type']?.split('/')[1].split(';')[0];
        if (
          headers['content-type']?.toLowerCase()?.includes('audio') &&
          type === 'mp4'
        ) {
          type = 'm4a';
        }

        const filename = (title || 'download') + '.' + (type || 'mp4');
        res.setHeader('Content-Disposition', contentDisposition(filename));

        if(typeof stopSize === 'number'){
          let chunkSize = 0;
          let stop = false
          stream.on('data', (chunk)=> {
            chunkSize += chunk.length
            if(typeof stopSize === 'number' && chunkSize >= stopSize && !stop){
              stop = true
              stream.destroy() 
              
              res.end(chunk)
            } else {
              if(stream.readable){
                res.write(chunk)
              }
            }
            if(stream.complete){
              console.log("complete")
              res.end()
            }
          })
               
          stream.on('end', () => {console.log("end"); res.end()})
          stream.on('error', () => {console.log("error"); res.end()})
          stream.on('close', () => {console.log("close"); res.end()})
        } else {
          stream.pipe(res);
        }
      });
      return resp.end();
    }
    if(encodeResponse){
      dataSend = {
        data: encryption.encrypt(JSON.stringify(dataSend), secretKey)
      }
    }
    return res.status(200).send(dataSend);
  }

  let resData: any;
  if (
    __responseType &&
    typeof __responseType === 'string' &&
    ['json', 'text'].some(v => v === responseType)
  ) {
    try {
      resData = await r[__responseType]();
    } catch (error) {
      return res.status(400).send({ errorCode: 1, message: (error as Error).message });
    }
  } else {
    try {
      resData = await r.json();
    } catch (error) {
      resData = await r.text();
    }
  }
  dataSend.data = resData;
  if(encodeResponse){
    dataSend = {
      data: encryption.encrypt(JSON.stringify(dataSend), secretKey)
    }
  }
  res.status(200).send(dataSend);
});

export const requestRouter = (router: Router) => {
  router.route("/api/request/:hash").get(request);
}
