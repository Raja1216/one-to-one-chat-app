const express = require("express");
const app = express();

const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");

const mysql = require("mysql");

//Mysql connection create
const connection = mysql.createConnection({
  host: "localhost",
  port: 3306,
  database: "chat-app",
  user: "root",
  password: "",
});

//connect with mysql
connection.connect((err) => {
  if (err) {
    console.log("connection Error", err);
  } else {
    console.log("MYSQL Connected successfully");
  }
});

app.use(cors());
app.use(bodyParser.json());

// USer Register Function
app.post("/register", (req, res) => {
  const { userName, userEmail, password } = req.body;
  console.log(req.body);
  const INSERT_USER_QUERY = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
  const SELECT_USER_QUERY = `SELECT * FROM users WHERE id = LAST_INSERT_ID()`;

  connection.query(
    INSERT_USER_QUERY,
    [userName, userEmail, password],
    (err, results) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ message: "Username or email already exists." });
        }
        return res.status(500).json({ message: "Internal server error." });
      }
      console.log("User registered:", results);

      // Fetch newly inserted user
      connection.query(SELECT_USER_QUERY, (err, userResults) => {
        if (err) {
          return res.status(500).json({ message: "Internal server error." });
        }

        const user = userResults[0];
        res.status(200).json({ message: "Register successful!", user: user });
      });
    }
  );
});

//User Login Function
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const SELECT_USER_QUERY = `SELECT * FROM users WHERE email = ? AND password = ?`;
  connection.query(SELECT_USER_QUERY, [email, password], (err, results) => {
    if (err) return res.status(500).json({ message: err });
    if (results.length === 0)
      return res.status(401).json({ message: "Invalid email or password." });
    res.status(200).json({ message: "Login successful!", user: results[0] });
  });
});

//Get All users List
app.get("/users", (req, res) => {
  const activeUser = req.query.activeUserId;
  let query = "SELECT * FROM users";
  if (activeUser) {
    query += ` WHERE id != ${activeUser}`;
  }
  connection.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

//get current user all message with perticular user

app.get("/messages", (req, res) => {
  console.log("Hello");
  const { senderId, receiverId } = req.query;
  const query = `SELECT messages.*, users.name AS sender FROM messages INNER JOIN users ON messages.sender_id = users.id WHERE (messages.sender_id = ? AND messages.reciver_id = ?) OR (messages.sender_id = ? AND messages.reciver_id = ?)`;
  connection.query(
    query,
    [senderId, receiverId, receiverId, senderId],
    (error, results) => {
      if (error) throw error;
      res.json(results);
    }
  );
});

//MEssage Add into Database table
const messageAdd = (req) => {
  console.log(req);
  const { message, senderId, reciverId, time } = req;

  const INSERT_MESSAGE_QUERY = `INSERT INTO messages (message, sender_id, reciver_id, time) VALUES (?, ?, ?, ?)`;

  connection.query(
    INSERT_MESSAGE_QUERY,
    [message, senderId, reciverId, time],
    (err, results) => {
      if (err) {
        return err;
      }
      console.log("Message Saved:", results);
      return results;
    }
  );
};

//Create socket server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

var userSockets = {};

//IO connectction start
io.on("connection", (socket) => {
  // socket.on("send-message", (msg) =>{
  //     console.log(msg);
  //     io.to(msg.to).emit('recived-message', msg);
  //     //Brodcast message
  //     // io.emit("recived-message",msg);
  // })

  //Store all connected users
  socket.on("set_username", (userId) => {
    console.log(`User connect - ${socket.id}`);
    userSockets[userId] = socket.id;
    console.log(userSockets);
  });

  //Listen private message event to get message
  socket.on("private_message", (msg) => {
    console.log("users", userSockets);
    const receiverSocketId = userSockets[msg.reciverId];
    if (receiverSocketId) {
      //Call messageAdd function for store data in to the database
      messageAdd(msg);

      //send message to send and reciver only
      io.to(socket.id).emit("recived-message", { msg });
      io.to(receiverSocketId).emit("recived-message", { msg });
    } else {
      io.to(socket.id).emit("recived-message", { msg: "User not found!" });
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    // Remove the user's socket ID on disconnect
    const disconnectedUser = Object.keys(userSockets).find(
      (username) => userSockets[username] === socket.id
    );
    if (disconnectedUser) {
      delete userSockets[disconnectedUser];
    }
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
