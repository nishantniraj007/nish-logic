const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for mobile app access
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

app.get('/', (req, res) => {
  res.send('<h1>Walkie Talkie Server is Running</h1>');
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (room) => {
    console.log(`User ${socket.id} joined room: ${room}`);
    socket.join(room);
  });

  // Relay audio data
  socket.on('audio', (data) => {
    // Expected data: { room: 'default', buffer: <base64 or binary> }
    const room = data.room || 'default';
    // Broadcast to everyone in the room EXCEPT sender
    socket.to(room).emit('audio', data.buffer);
    // console.log(`Relayed audio chunk from ${socket.id} to room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});
