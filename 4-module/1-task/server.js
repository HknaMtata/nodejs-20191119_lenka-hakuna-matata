const url = require('url');
const http = require('http');
const path = require('path');
const fs = require('fs');

const server = new http.Server();

function sendFile(file, res) {
  file.pipe(res);
  file
    .on('error', function(error){
      if (error.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('File not found');
      } else {
        res.statusCode = 500;
        res.end('Internal server error');
      }
    })
    .on('open', function(){
      console.log('open');
    })
    .on('finish', function(){
      console.log('finish');
      res.statusCode = 200;
      res.end();
    });
  res
    .on('close', function(){
      if (res.finished) return;
      file.destroy();
    });
}

server.on('request', (req, res) => {
  const pathname = url.parse(req.url).pathname.slice(1);
  const filepath = path.join(__dirname, 'files', pathname);
  
  switch (req.method) {
    case 'GET':
      if (pathname.includes('/') || pathname.includes('..')) {
        res.statusCode = 400;
        res.end('Nested paths are not allowed');
        break;
      }
      let file = new fs.ReadStream(filepath);
      sendFile(file, res);
      break;
    default:
      res.statusCode = 501;
      res.end('Not implemented');
  }
});

module.exports = server;
