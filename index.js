require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const cors = require('cors')
const mongoose = require("mongoose");
const { createServer } = require("http");
const socketIO = require('socket.io');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { fromIni } = require('@aws-sdk/credential-provider-ini');
const admin = require('firebase-admin');

const app = express();
app.use(cors({
  origin: ["*", "http://localhost:3000", "https://www.instaportdelivery.com", "https://instaportdelivery.com", "http://localhost:5500", "https://instaport-transactions.vercel.app", "https://instaport.vercel.app", "https://instaport-website.vercel.app"]
}))
const port = process.env.PORT || 1000;
const httpServer = createServer(app);

app.use(bodyparser.urlencoded({ extended: false }));
app.use(express.json());
app.use(bodyparser.json());

admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  }),
  projectId: 'instaport-main',
  databaseURL: "https://instaport-main-default-rtdb.firebaseio.com"
});

//Mongoose Connection
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true })
  .then(() => console.log("Connected to the db"))
  .catch((err) => console.log(err))

const io = socketIO(httpServer);

//Admin Routes
const AdminRouter = require("./Routes/Admin");
app.use("/admin", AdminRouter);

//User Routes
const UserRouter = require("./Routes/User");
app.use("/user", UserRouter);

//Rider Routes
const RiderRouter = require("./Routes/Rider");
app.use("/rider", RiderRouter);

//City Routes
const CityRouter = require("./Routes/City");
app.use("/city", CityRouter);

//Order Routes
const OrderRoutes = require("./Routes/Order");
app.use("/order", OrderRoutes);

//Price Manipulation
const PriceManipulationRoutes = require("./Routes/PriceManipulation");
app.use("/price", PriceManipulationRoutes);

//Auth Routes
const AuthRoutes = require("./Routes/Auth");
app.use("/auth", AuthRoutes);

//Customer Transaction Routes
const CustomerTransactionRoutes = require("./Routes/CustomerTransaction");
app.use("/customer-transactions", CustomerTransactionRoutes);

app.post("/notification", (req, res) => {
  admin.messaging().send({
    notification: {
      "title": `Profile ${req.body.approved ? "approved" : "rejected"}`,
      "body": `Your profile has been ${req.body.approved ? "approved" : "rejected"}`,
    },
    token: req.body.token
  })
    .then((res) => {
      console.log(res)
    })
    .catch((err) => {
      console.log(err)
    })
  res.json({ ...req.body });
})

//Coupons Routes
const CouponRoutes = require("./Routes/Coupon");
const { default: axios } = require("axios");
app.use("/coupons", CouponRoutes);



//Home Routes
app.get("/", (req, res) => res.send("Server Is On"))
app.post("/distance", async (req, res) => {
  let key = process.env.MAP_KEY
  let source = req.body.source
  let destination = req.body.destination
  let pickupEncoded = `${source.latitude},${source.longitude}`;
  let dropEncoded = `${destination.latitude},${destination.longitude}`;
  let url = `https://maps.googleapis.com/maps/api/distancematrix/json?destinations=${pickupEncoded}&origins=${dropEncoded}&key=${key}`;
  const response = await axios(url)
  const route = response.data.rows[0];

  if (route && route.elements.length > 0) {
    return res.send((route.elements[0].distance.value / 1000).toFixed(2));
  } else {
    return 0;
  }
})

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: fromIni({
    filepath: "./credentials.ini",
    profile: 'default',
  }),
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send(`Server is running on: ${PORT}`);
});

const uploadToS3 = async (buffer, key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
  };
  await s3Client.send(new PutObjectCommand(params));
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
};

const s3Uploadv3SingleFile = async (file, path) => {
  try {
    const filename = `${path}${file.originalname.replace(/\s+/g, '')}`
    console.log(filename);
    const param = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: filename,
      Body: file.buffer,
    };
    let data = await s3Client.send(new PutObjectCommand(param))
    console.log(data);
    const location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${param.Key}`;
    return { url: location, type: file.mimetype.split("/")[0] }
  } catch (error) {
    console.log(error);
  }
}

app.post("/upload", upload.array("files"), async (req, res) => {
  console.log(req.files[0], req.body.path)
  try {
    const media = await s3Uploadv3SingleFile(req.files[0], req.body.path);
    console.log(media);
    return res.json({ status: "success", media });
  } catch (err) {
    return res.json({ status: "error", media: null });
  }
});

app.post("/multi-upload", upload.array("files", 10), async (req, res) => {
  try {
    const files = req.files;
    const timestamp = Date.now();
    const uploadPromises = files.map(async (file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const fileName = path.basename(file.originalname, ext);

      if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
        const imageUrl = await uploadToS3(file.buffer, `post/${timestamp}/images/${fileName}${ext}`);
        return { type: "image", url: imageUrl };
      } else if (ext === ".mp4" || ext === ".mov") {
        const videoId = uuid();
        const tempFilePath = path.join(__dirname, `${videoId}${ext}`);
        const outputDir = path.join(__dirname, "hls", videoId);

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(tempFilePath, file.buffer);

        return new Promise((resolve, reject) => {
          ffmpeg(tempFilePath)
            .outputOptions([
              "-preset", "veryfast",
              "-threads", "4",
              "-hls_time", "10",
              "-hls_playlist_type", "vod",
              "-hls_segment_filename", `${outputDir}/%03d.ts`
            ])
            .output(`${outputDir}/index.m3u8`)
            .on("end", async () => {
              try {
                const files = fs.readdirSync(outputDir);
                const uploadPromises = files.map((file) => {
                  const filePath = path.join(outputDir, file);
                  const fileBuffer = fs.readFileSync(filePath);
                  const fileKey = `post/${timestamp}/videos/${videoId}/${file}`;
                  return uploadToS3(fileBuffer, fileKey);
                });

                await Promise.all(uploadPromises);

                fs.unlinkSync(tempFilePath);
                resolve({ type: "video", url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/post/${timestamp}/videos/${videoId}/index.m3u8` });
              } catch (uploadErr) {
                console.error("Error uploading HLS files to S3:", uploadErr);
                reject({ status: "error", message: "Failed to upload HLS files" });
              }
            })
            .on("error", (err) => {
              console.error("Error processing video with ffmpeg:", err);
              reject({ status: "error", message: "Failed to process video" });
            })
            .run();
        }).finally(() => {
          fs.rmSync(outputDir, { recursive: true, force: true });
        });
      } else {
        return { type: "error", message: "Unsupported file type", fileName: file.originalname };
      }
    });

    const results = await Promise.all(uploadPromises);
    res.json({ status: "success", results });
  } catch (err) {
    console.error("Error processing upload:", err);
    res.status(500).json({ status: "error", message: "File upload failed" });
  }
});


app.post("/authtest", (req, res) => {
  return res.json({
    data: `${req.body.transaction_response}`
  })
  // return res.redirect(`https://google.com/?data=${req.body.transaction_response}`)
})


app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});