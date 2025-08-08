const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const questions = [];

function sendFile(res, filePath, contentType){
  fs.readFile(filePath, (err, data) => {
    if (err){
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, {'Content-Type': contentType});
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/'){
    sendFile(res, path.join(__dirname, 'public/index.html'), 'text/html');
  } else if (req.method === 'POST' && req.url === '/ask'){
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body);
        const question = { id: Date.now(), text, votes: 0 };
        questions.push(question);
        broadcast({ type: 'question', question });
        res.writeHead(204);
        res.end();
      } catch(err) {
        res.writeHead(400);
        res.end();
      }
    });
  } else if (req.method === 'POST' && req.url === '/upvote'){
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        const q = questions.find(x => x.id === id);
        if (q){
          q.votes++;
          broadcast({ type: 'update', question: q });
        }
        res.writeHead(204);
        res.end();
      } catch(err){
        res.writeHead(400);
        res.end();
      }
    });
  } else if (req.method === 'GET' && req.url.startsWith('/public/')){
    const filePath = path.join(__dirname, req.url);
    const ext = path.extname(filePath);
    const type = ext === '.js' ? 'text/javascript' : 'text/plain';
    sendFile(res, filePath, type);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const wss = new WebSocket.Server({ server });
function broadcast(msg){
  const data = JSON.stringify(msg);
  for (const client of wss.clients){
    if (client.readyState === WebSocket.OPEN){
      client.send(data);
    }
  }
}

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'init', questions }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
