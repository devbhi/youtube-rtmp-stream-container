import http from "http";
import { spawn } from "child_process";
import express from "express";
import { Server as SocketIO } from "socket.io";
import cors from "cors"; // Added import for cors

const app = express();
app.use(cors()); // Added CORS middleware to allow all origins

const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"], // Allow GET and POST methods
  },
});

const rtmpKey = new Map();
let rtmpKeys = "";
let ffmpegProcess = null;

const initFFmpeg = (key) => {
  const options = [
    "-i",
    "-",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-tune",
    "zerolatency",
    "-r",
    `${25}`,
    "-g",
    `${25 * 2}`,
    "-keyint_min",
    25,
    "-crf",
    "25",
    "-pix_fmt",
    "yuv420p",
    "-sc_threshold",
    "0",
    "-profile:v",
    "main",
    "-level",
    "3.1",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    128000 / 4,
    "-f",
    "flv",
    `rtmp://a.rtmp.youtube.com/live2/${key}`,
  ];

  ffmpegProcess = spawn("ffmpeg", options);

  ffmpegProcess.stdout.on("data", (data) => {
    console.log(`ffmpeg stdout: ${data}`);
  });

  ffmpegProcess.stderr.on("data", (data) => {
    console.error(`ffmpeg stderr: ${data}`);
  });

  ffmpegProcess.on("close", (code) => {
    console.log(`ffmpeg process exited with code ${code}`);
    ffmpegProcess = null;
  });
};

io.on("connection", (socket) => {
  console.log("Socket Connected", socket.id);

  socket.on("send-key", (key) => {
    rtmpKeys = key;
    console.log("RTMP Key Received:", key);
    if (!ffmpegProcess) {
      initFFmpeg(key);
    }
  });

  socket.on("binarystream", (stream) => {
    if (rtmpKeys && ffmpegProcess) {
      console.log("Binary Stream Incoming...");
      ffmpegProcess.stdin.write(stream, (err) => {
        if (err) console.log("Err", err);
      });
    }
  });
});

server.listen(3000, () => console.log(`HTTP Server is running on PORT 3000`));
