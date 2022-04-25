/**
 * Setup a socket.io server for realtime collections
 * @param {Object} http Http server
 * @returns {void}
 */
module.exports = function (http) {
  const io = require("socket.io")(http, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    // Create a tunnel between the interface (data source) and a web (where the graph is displayed)
    socket.on("realtime session", ({ content, to }) => {
      socket.to(to).emit("realtime session", {
        content,
        from: socket.id,
      });
    });

    // Manually end a connection
    socket.on("end", () => {
      socket.disconnect();
    });
  });
};
