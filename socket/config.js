const { io } = require("socket.io-client");

const socket = io(process.env.WEB_SERVER_SOCKET_URL, {
    reconnection: true,
    transports: ['websocket'],
    query: {
        "token": "WEB"
    }
});

socket.on("connect", () => {
  console.log("[GAME API] Connected to Socket Server:", socket.id);
});

module.exports = socket