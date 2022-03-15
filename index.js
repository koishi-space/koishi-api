const winston = require("winston");

const express = require("express");
const app = express();

require("./startup/config")();
if (process.env.NODE_ENV === "production") require("./startup/prod")(app);
require("./startup/logging")();
require("./startup/db")();
require("./startup/routes")(app);

const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("New client: " + socket.id); // x8WIv7-mJelg7on_ALbx

  socket.on("private message", ({ content, to }) => {
    socket.to(to).emit("private message", {
      content,
      from: socket.id,
    });
  });

  socket.on("end", () => {
    socket.disconnect();
    console.log("Client " + socket.id + "disconnected");
  });
});

const port = process.env.PORT || 3000;

const server = http.listen(port, () => {
  winston.info(
    `[SERVER] Server startup! listening on port ${port} in mode ${process.env.NODE_ENV}`
  );
  console.log(
    `[SERVER] Server startup! listening on port ${port} in mode ${process.env.NODE_ENV}`
  );
});

module.exports = server;
