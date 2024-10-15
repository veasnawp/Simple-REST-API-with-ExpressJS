import express from "express";
import cors from 'cors'
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import 'dotenv/config'
import url from 'url';
import path from 'path'
import connectDB from "./mongodb/connect.js";
import router from "./router/index.js";
import downloadRouter from "./router/aioDL.js";
import customRouter from "./router/routes.js";
import { errorHandler, notFound } from "./controller/authentication.js";
import expressAsyncHandler from "./async-handler/index.js";
import { isProtectedRoute } from "./router/routes.js";

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const __dirPublic = path.join(process.cwd(), 'public')

const app = express();

app.use(
  express.json(), 
  express.static('public'),
  bodyParser.urlencoded({ extended: false }),
);

app.use(
  compression(),
  cookieParser(),
  bodyParser.json(),
  cors({
    credentials: true,
  }),
);

connectDB();

app.get("/goto/*", expressAsyncHandler((req, res) => {
  const path = req.originalUrl.replace('/goto/','/')
  res.redirect(path)
}))

app.use("/api/v1", router());
app.use("/", downloadRouter());
customRouter(app);

app.get("/refresh", (req, res) => {
  res.redirect('/')
})

app.post("/", (req, res) => {
  res.status(200).send({message: "Welcome to My Simple Rest API"}).end()
})

app.get("*", expressAsyncHandler(async (req, res) => {
  // const domain = url.format({ host: req.get('host') });
  const isProtected = await isProtectedRoute(req);
  if(!isProtected){
    return res.redirect('/not-found/');
  }
  const html = path.join(__dirPublic, 'index.html');
  res.sendFile(html);
}))

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5501;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

export default app;
