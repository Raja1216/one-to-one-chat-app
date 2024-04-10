import { useEffect, useRef, useState } from "react";
import "./App.css";
import io from "socket.io-client";
import axios from "axios";

const socket = io("http://localhost:5000");

function App() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");

  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState("");

  const [auth, setAuth] = useState("");
  const [currentUser, setCurrentUser] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [reciverId, setReciverId] = useState(allUsers[0]?.id);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  //Register User
  const handelRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/register", {
        userName,
        userEmail,
        password: userPassword,
      });

      localStorage.setItem("user", JSON.stringify(response.data.user));
      setCurrentUser(response.data.user);

      handelConnect(response.data.user.id);
    } catch (error) {
      console.error("Error registering user:", error);
      alert("Error registering user. Please try again.");
    }
  };

  //Login USer
  const handelLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/login", {
        email: userEmail,
        password: userPassword,
      });

      localStorage.setItem("user", JSON.stringify(response.data.user));
      setCurrentUser(response.data.user);

      handelConnect(response.data.user.id);
    } catch (error) {
      console.error("Error logging in:", error.response.data.message);
      alert(error.response.data.message);
    }
  };

  //get all Users
  const getAllUsers = (currentUserId) => {
    axios
      .get(`http://localhost:5000/users?activeUserId=${currentUserId}`)
      .then((response) => {
        console.log(response.data);
        setAllUsers(response.data);
        setReciverId(response.data[0].id);
        localStorage.setItem("reciverId", response.data[0]?.id);
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
      });
  };

  //get current user messages with selected user
  const getAllMessages = () => {
    const user_data = localStorage.getItem("user");
    const reciver_id = localStorage.getItem("reciverId");
    console.log("reciverId", reciver_id);
    console.log("currentUser", JSON.parse(user_data)?.id);
    if (user_data && reciver_id) {
      axios
        .get(
          `http://localhost:5000/messages?senderId=${JSON.parse(user_data).id}&receiverId=${reciver_id}`
        )
        .then((response) => {
          console.log(response.data);
          setMessages(response.data);
        })
        .catch((error) => {
          console.error("Error fetching messages:", error);
        });
    }
  };

  //Send Private message
  const sendMessage = (e) => {
    e.preventDefault();
    const reqData = {
      senderId: currentUser.id,
      reciverId: reciverId,
      message: message,
      time:
        new Date(Date.now()).getHours() +
        ":" +
        (new Date(Date.now()).getMinutes() >= 10
          ? new Date(Date.now()).getMinutes()
          : "0" + new Date(Date.now()).getMinutes()),
    };
    socket.emit("private_message", reqData);
    setMessage("");
  };

  const handelReciverChange = (id) => {
    setReciverId(id);
    localStorage.setItem("reciverId", id);
    getAllMessages();
  };

  //Conect user with socket.io
  const handelConnect = async (userId) => {
    setIsActive(true);
    socket.emit("set_username", userId);
    getAllUsers(userId);
  };

  useEffect(() => {
    const savedData = localStorage.getItem("user");
    
    if (savedData) {
      setCurrentUser(JSON.parse(savedData));
      handelConnect(JSON.parse(savedData).id);
    }
  }, []);

  useEffect(() => {
    const savedData = localStorage.getItem("user");

    if (savedData) {
      const userData = JSON.parse(savedData);
      handelConnect(userData.id);

      socket.on("recived-message", ({ msg }) => {
        console.log(msg);
        // setMessages([...messages, msg]);
        getAllMessages();
      });
    }
  }, [socket]);

  useEffect(() => {
    getAllMessages();
  }, [currentUser, reciverId, allUsers]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="App">
      {isActive ? (
        <div className="chat_section">
          <h1>{currentUser.name} Chat List</h1>
          <div className="massges_container">
            {messages.map((message, i) => (
              <div
                className={`message_card ${
                  currentUser?.id === message.sender_id && "card_left"
                }`}
                key={i}
              >
                <span style={{ fontWeight: "600" }}>{message.sender}</span>
                <span>{message.message}</span>
                <small
                  style={{ textAlign: "end", float: "right", width: "100%" }}
                >
                  {message.time}
                </small>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div>
            <form onSubmit={sendMessage}>
              <input
                type="text"
                name="message"
                placeholder="Type Your Message ...."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              ></input>
              <select
                onChange={(e) => handelReciverChange(e.target.value)}
                required
              >
                {allUsers.map((user, i) => (
                  <option value={user.id} key={i}>
                    {user.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="send_button">
                Send
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="connection_form">
          {/* <form onSubmit={handelConnect}>
          <input type='text' name='userName' placeholder='Enter User Name' value={userName} onChange={(e) => setUserName(e.target.value)} required></input>
          <input type='text' name='userEmail' placeholder='Enter User Email' value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required></input>
          <button type='submit'>Connect</button>
          </form> */}
          {auth === "register" ? (
            <div className="auth_form">
              <form onSubmit={handelRegister}>
                <input
                  type="text"
                  name="userName"
                  placeholder="Enter User Name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                ></input>
                <input
                  type="text"
                  name="userEmail"
                  placeholder="Enter User Email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                ></input>
                <input
                  type="text"
                  name="userPassword"
                  placeholder="Enter User Password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  required
                ></input>
                <button type="submit">Register</button>
              </form>
              <span onClick={() => setAuth("login")}>Login</span> ||
              <span onClick={() => setAuth("register")}> Register</span>
            </div>
          ) : (
            <div className="auth_form">
              <form onSubmit={handelLogin}>
                <input
                  type="text"
                  name="userEmail"
                  placeholder="Enter User Email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                ></input>
                <input
                  type="text"
                  name="userPassword"
                  placeholder="Enter User Password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  required
                ></input>
                <button type="submit">Login</button>
              </form>
              <span onClick={() => setAuth("login")}>Login</span> ||
              <span onClick={() => setAuth("register")}> Register</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
