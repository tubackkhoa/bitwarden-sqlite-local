/* eslint-disable arrow-body-style */
/* eslint-disable prefer-const */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable import/no-extraneous-dependencies */
import express from 'express';
import fs from 'fs';
import YAML from 'yaml';
import { argv } from 'yargs';

const proxy = (handler) => {
  return (req, res) => {
    const event = getEvent(req);
    const callback = getCallback(res);
    return handler(event, null, callback);
  };
};

const getEvent = (req) => {
  return {
    isBase64Encoded: false,
    header: req.header,
    pathParameters: {
      domain: 'localhost',
      uuid: 'caster',
    },
    email: 'tubackkhoa@gmail.com',
    code: '123456',
    body: req.body.toString('utf8'),
  };
};

const getCallback = (res) => {
  return (obj, { statusCode, headers, body }) => {
    if (headers) {
      Object.entries(headers).forEach(([key, val]) => res.set(key, val));
    }
    res.status(statusCode).send(body);
  };
};

const file = fs.readFileSync('./serverless.yml', 'utf8');
const {
  functions,
  default_cors: { cors },
} = YAML.parse(file);

const app = express();
app.use(express.raw());
const { origin, allowMethods } = cors;
const allowHeader = cors.headers.join(', ');
app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Headers', allowHeader);
  res.header('Access-Control-Allow-Methods', allowMethods);

  res.setHeader('X-Powered-By', 'Caster');
  if (req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});

Object.values(functions).forEach(({ handler, events }) => {
  if (!events || !events.length) return;

  let {
    http: { method, path },
  } = events[0];
  const [, src, obj] = handler.match(/(.*?)\.([^.]+)/);
  const { [obj]: fn } = require(`./${src}`);
  if (method === 'any') {
    method = 'all';
    path = '/';
  }
  //   console.log(method, fn);
  app[method](`/${path}`, proxy(fn));
});

app.listen(argv.port || 3000);
