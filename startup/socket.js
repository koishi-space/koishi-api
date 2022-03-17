module.exports = function (http) {
  const io = require("socket.io")(http, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("SOCKET / connect " + socket.id);

    socket.on("realtime session", ({ content, to }) => {
      socket.to(to).emit("realtime session", {
        content,
        from: socket.id,
      });
    });

    socket.on("end", () => {
      socket.disconnect();
      console.log("Client " + socket.id + "disconnected");
    });
  });
};
