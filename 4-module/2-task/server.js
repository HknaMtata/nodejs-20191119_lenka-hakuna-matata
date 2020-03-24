const url = require('url');
const http = require('http');
const path = require('path');
const fs = require('fs');
const LimitSizeStream = require('./LimitSizeStream');

const server = new http.Server();

server.on('request', (req, res) => {
  const pathname = url.parse(req.url).pathname.slice(1);

  const filepath = path.join(__dirname, 'files', pathname);

  switch (req.method) {
    case 'POST':
      if (pathname.includes('/') || pathname.includes('..')) {
        res.statusCode = 400;
        res.end('Nested paths are not allowed');
        break;
      }

      const file = new fs.WriteStream(filepath, {flags: 'wx'});
      file
        .on('error', function(error) {
          if (error.code === 'EEXIST') {
            res.statusCode = 409;
            res.end('File exists');
          } else {
            res.statusCode = 500;
            res.end('Internal server error');
            fs.unlink(filepath, (error) => {});
          }
        })
        .on('close', function(){
          res.statusCode = 201;
          res.end('file has been saved');
        });
      
      let limitStream = new LimitSizeStream({limit: 1e6});
      limitStream
      .on('error', function(error) {
        if (error.code === 'LIMIT_EXCEEDED') {
          res.statusCode = 413;
          res.end('File is too big');
        } else {
          res.statusCode = 500;
          res.end('Internal server error');
        }
        fs.unlink(filepath, (err) => {});
      });

      // Если обрыв соединения
      res
      .on('close', function(){
        if (res.finished) return;
        fs.unlink(filepath, (error) => {});
      });

      req
        .pipe(limitStream)
        .pipe(file);

      break;

    default:
      res.statusCode = 501;
      res.end('Not implemented');
  }
});

module.exports = server;
