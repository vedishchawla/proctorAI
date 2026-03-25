const { io } = require("socket.io-client");

const testPort = (port) => {
  console.log(`Testing port ${port}...`);
  const socket = io(`http://localhost:${port}`, {
    reconnection: false,
    timeout: 3000
  });

  socket.on("connect", () => {
    console.log(`SUCCESS: Connected on port ${port}!`);
    process.exit(0);
  });

  socket.on("connect_error", (err) => {
    console.log(`Failed on port ${port}:`, err.message);
  });
};

testPort(3001);
testPort(3002);

setTimeout(() => {
  console.log("Both timed out.");
  process.exit(1);
}, 4000);
