const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", function (socket) {
  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
  } else {
    socket.emit("spectatorRole");
  }

  socket.on("disconnect", function () {
    if (socket.id === players.white) {
      delete players.white;
    } else if (socket.id === players.black) {
      delete players.black;
    }
  });

  socket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && socket.id !== players.white) return;
      if (chess.turn() === "b" && socket.id !== players.black) return;
      const result = chess.move(move);
      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move);
        io.emit("boardState", chess.fen());

        // Check if game is over
        if (chess.game_over()) {
          let winner;
          let loser;
          if (chess.in_checkmate()) {
            winner = currentPlayer === "w" ? "Black" : "White";
            loser = currentPlayer === "w" ? "White" : "Black";
          } else if (chess.in_draw()) {
            winner = "Draw";
            loser = "Draw";
          } else if (chess.in_stalemate()) {
            winner = "Stalemate";
            loser = "Stalemate";
          }
          io.emit("gameOver", { winner, loser });
        }
      } else {
        socket.emit("invalidMove", move);
      }
    } catch (err) {
      socket.emit("invalidMove", move);
    }
  });
});

server.listen(3000);
