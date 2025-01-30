import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Link, useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const socket = io();

const App = () => {
    return (
        <Router>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/signup">Signup</Link>
                <Link to="/login">Login</Link>
            </nav>
            <Routes>
                <Route path="/" element={<DocumentList />} />
                <Route path="/documents/:id" element={<DocumentEditor />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
            </Routes>
        </Router>
    );
};

const DocumentList = () => {
    const [documents, setDocuments] = useState([]);
    useEffect(() => {
        axios.get("/api/documents").then((res) => setDocuments(res.data));
    }, []);

    return (
        <div>
            <h2>Documents</h2>
            <ul>
                {documents.map((doc) => (
                    <li key={doc._id}>
                        <Link to={`/documents/${doc._id}`}>{doc.title}</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const DocumentEditor = () => {
    const { id } = useParams();
    const [quill, setQuill] = useState(null);

    useEffect(() => {
        axios.get(`/api/documents/${id}`).then((res) => {
            if (quill) quill.setContents(res.data.content);
        });

        socket.on("document-updated", ({ docId, content }) => {
            if (docId === id && quill) quill.setContents(content);
        });

        return () => socket.off("document-updated");
    }, [id, quill]);

    useEffect(() => {
        const editor = new Quill("#editor", { theme: "snow" });
        setQuill(editor);

        editor.on("text-change", () => {
            socket.emit("edit-document", { docId: id, content: editor.getContents() });
        });
    }, []);

    return <div id="editor" style={{ height: "400px" }} />;
};

const Signup = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleSignup = async () => {
        await axios.post("/api/signup", { username, password });
        alert("User created!");
    };

    return (
        <div>
            <h2>Signup</h2>
            <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
            <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
            <button onClick={handleSignup}>Signup</button>
        </div>
    );
};

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        const { data } = await axios.post("/api/login", { username, password });
        localStorage.setItem("token", data.token);
        alert("Login Successful!");
    };

    return (
        <div>
            <h2>Login</h2>
            <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
            <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
            <button onClick={handleLogin}>Login</button>
        </div>
    );
};

export default App;
