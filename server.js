require('dotenv').config();
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const http = require('http');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const MACROMETA_API_URL = 'https://api-horn-8ad7ac4f.paas.macrometa.io';
const MACROMETA_API_KEY = process.env.MACROMETA_API_KEY;
const MACROMETA_FABRIC = '_system';

async function macrometaRequest(endpoint, method, body = null) {
    const url = `${MACROMETA_API_URL}/_fabric/${MACROMETA_FABRIC}/_api${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `apikey ${MACROMETA_API_KEY}`
        },
        body: body ? JSON.stringify(body) : null
    };
    const response = await fetch(url, options);
    const data = await response.text();
    if (!response.ok) {
        console.error(`API Request failed: ${url}, Status: ${response.status}, Body: ${data}`);
        throw new Error(`HTTP error! status: ${response.status}, body: ${data}`);
    }
    return JSON.parse(data);
}

async function checkCollectionExists(collectionName) {
    try {
        const result = await macrometaRequest(`/collection/${collectionName}`, 'GET');
        console.log(`Collection ${collectionName} exists:`, result);
        return true;
    } catch (error) {
        if (error.message.includes('404')) {
            console.log(`Collection ${collectionName} does not exist.`);
            return false;
        } else {
            console.error('Error checking collection existence:', error);
            throw error;
        }
    }
}

async function ensureCollectionExists(collectionName) {
    console.log(`Checking if collection ${collectionName} exists...`);
    if (!await checkCollectionExists(collectionName)) {
        console.log(`Creating collection: ${collectionName}`);
        await macrometaRequest('/collection', 'POST', { 
            name: collectionName, 
            isLocal: false,
            keyOptions: { allowUserKeys: false, type: 'autoincrement' },
            cacheEnabled: false, 
            waitForSync: false,
            stream: true
        });
    }
}

async function getHistoricalMessages(collectionName) {
    try {
        const query = `FOR doc IN ${collectionName} RETURN doc`;
        const response = await macrometaRequest('/cursor', 'POST', {
            query: query,
            batchSize: 100,
            ttl: 30 // Time to live for the cursor
        });

        if (response.result) {
            return response.result;
        }
        return [];
    } catch (error) {
        console.error('Error fetching historical messages:', error);
        return [];
    }
}


const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', async function connection(ws, req) {
    // Retrieve the room name from the URL
    const roomName = req.url.substring(1);

    // Fetch historical messages and send them to the client
    try {
        const historicalMessages = await getHistoricalMessages(roomName);
        if (historicalMessages && historicalMessages.length > 0) {
            console.log('Sending historical messages:', historicalMessages);
            ws.send(JSON.stringify(historicalMessages));
        }
    } catch (error) {
        console.error('Error fetching historical messages:', error);
    }

    ws.on('message', function incoming(message) {
        console.log('Received message from client:', message);
    });

    ws.send('Connected to server WebSocket');
});


app.post('/create-room', async (req, res) => {
    const { roomName, userName } = req.body;
    await ensureCollectionExists(roomName);
    res.redirect(`/${roomName}?user=${encodeURIComponent(userName)}`);
});

app.post('/send-message', async (req, res) => {
    const { userName, message, roomName } = req.body;
    const collectionName = roomName;
  
    const query = `
      INSERT { 
        userName: @userName,
        message: @message,  
        timestamp: @timestamp
      } IN ${collectionName}
    `;
  
    const vars = {
      userName,
      message,
      timestamp: new Date().toISOString() 
    };
    
    try {
      const result = await macrometaRequest('/cursor', 'POST', {
        batchSize: 1,
        bindVars: vars,
        query
      });

      // Send message to all connected WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ userName, message, timestamp: new Date().toISOString() }));
        }
      });

      res.status(200).json({result});
    } catch (error) {
      console.error(error);
      res.status(500).json({error});
    }
});

app.get('/:room', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chatRoom.html'));
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
