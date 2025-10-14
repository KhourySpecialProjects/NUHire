const express = require("express"); //Api framework
const mysql = require("mysql2"); //MySQL database driver
const passport = require("passport"); //Authentication middleware
const KeycloakStrategy = require("@exlinc/keycloak-passport");
const session = require("express-session"); //Session management middleware, which is used for creating and managing user sessions
const dotenv = require("dotenv");// dotenv package to load environment variables from a .env file into process.env
const cors = require("cors"); //CORS middleware for enabling Cross-Origin Resource Sharing
const bodyParser = require("body-parser"); //Middleware for parsing incoming request bodies in a middleware before your handlers, available under the req.body property.
const multer = require("multer"); //Middleware for handling multipart/form-data, which is primarily used for uploading files
const fs = require("fs"); //File system module for interacting with the file system
const path = require("path");  // Path module for working with file and directory paths
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const https = require('https');

// Load environment variables from .env file, creates an express server, and sets up Socket.io
dotenv.config();
const FRONT_URL = process.env.REACT_APP_FRONT_URL;
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const { groupCollapsed } = require("console");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const server = http.createServer(app); // Use HTTP server for Socket.io
const io = new Server(server, {
  cors: {
    origin: `${FRONT_URL}`, // Allow frontend connection
    credentials: true // Allow credentials which is required for cookies
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//configure CORS to allow requests from the frontend URL
app.use(cors({
  origin: `${FRONT_URL}`,
  credentials: true
}));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Set up EJS as the templating engine, which is used for rendering dynamic HTML pages
app.set('view engine', 'ejs');

// Set the views directory for EJS templates, which is where the EJS files are located
app.set('views', path.join(__dirname, 'views'));

app.set("trust proxy", 1);

//Sets up the file storage for Multer, which is used for handling file uploads. It specifies the destination directory and filename format for uploaded files.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {

    let uploadPath = 'uploads/other'; // Default path

    // Set the upload path based on the field name
    if (file.fieldname === 'jobDescription') {
      uploadPath = 'uploads/jobdescription';
    } else if (file.fieldname === 'resume') {
      uploadPath = 'uploads/resumes';
    }

    // Create the directory if it doesn't exist
    cb(null, uploadPath);
  },

  // Set the filename format for uploaded files
  filename: (req, file, cb) => {
    const fileName = `${file.originalname}`;
    cb(null, fileName);
  },
});

// Initialize Multer with the storage configuration
const upload = multer({ storage: storage });

// Serve static files from the uploads directory, which is where the uploaded files are stored
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//Post route for uploading files, which handles the file upload and returns the file path in the response
app.post("/upload", upload.single("file"), (req, res) => {
  console.log("File received:", req.file);
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ filePath: `${req.file.path}` });
});

// Post route for uploading resumes, which handles the file upload and returns the file path in the response
app.post('/upload/resume', upload.single('resume'), (req, res) => {
  console.log("File received:", req.file);
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ filePath: `${req.file.path}` });
});

// Post route for uploading job descriptions, which handles the file upload and returns the file path in the response
app.post('/upload/job', upload.single('jobDescription'), (req, res) => {
  console.log("File received:", req.file);
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ filePath: `${req.file.path}` });
});

// Delete route for deleting files, which removes the file from the server and deletes its record from the database
// Delete route for deleting files, which removes the file from the server and deletes its record from the database
app.delete('/delete/resume/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, 'uploads/resumes', fileName);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);

    // First, get the resume ID to delete the associated candidate
    db.query("SELECT id FROM Resume_pdfs WHERE file_path = ?", [`uploads/resumes/${fileName}`], (err, resumeResults) => {
      if (err) {
        console.error("Database lookup error:", err);
        return res.status(500).json({ error: "Database lookup failed" });
      }

      if (resumeResults.length === 0) {
        return res.status(404).json({ error: "Resume not found in database" });
      }

      const resumeId = resumeResults[0].id;

      // Delete from Candidates table first (due to foreign key constraint)
      db.query("DELETE FROM Candidates WHERE resume_id = ?", [resumeId], (err, candidateResult) => {
        if (err) {
          console.error("Candidate deletion error:", err);
          return res.status(500).json({ error: "Candidate deletion failed" });
        }

        console.log(`Deleted ${candidateResult.affectedRows} candidate(s) for resume ID ${resumeId}`);

        // Then delete from Resume_pdfs table
        db.query("DELETE FROM Resume_pdfs WHERE file_path = ?", [`uploads/resumes/${fileName}`], (err, resumeResult) => {
          if (err) {
            console.error("Resume deletion error:", err);
            return res.status(500).json({ error: "Resume deletion failed" });
          }

          console.log(`Deleted resume: ${fileName}, Resume ID: ${resumeId}`);
          res.json({ 
            message: `File "${fileName}" and associated candidate deleted successfully.`,
            deletedResume: resumeResult.affectedRows > 0,
            deletedCandidate: candidateResult.affectedRows > 0
          });
        });
      });
    });

  } else {
    res.status(404).send(`File "${fileName}" not found.`);
  }
});

// Delete route for deleting job description files, which removes the file from the server and deletes its record from the database
app.delete('/delete/job/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, 'uploads/jobdescription', fileName);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);

    db.query("DELETE FROM job_descriptions WHERE file_path = ?", [`uploads/jobdescription/${fileName}`], (err, result) => {
      if (err) {
        console.error("Database deletion error:", err);
        return res.status(500).json({ error: "Database deletion failed" });
      }
      res.json({ message: `File "${fileName}" deleted successfully.` });
    });

  } else {
    res.status(404).send(`File "${fileName}" not found.`);
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Middleware for parsing JSON and URL-encoded data in incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware for parsing cookies in incoming requests
const url = new URL(process.env.DATABASE_URL);
const MySQLStore = require("express-mysql-session")(session);
const sessionStore = new MySQLStore({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1), 
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware for session management, which creates a session for each user and stores it in the MySQL database
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: true, // Set `true` if using HTTPS
    httpOnly: true,
    sameSite: "None",
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Middleware for initializing Passport.js, which is used for user authentication
app.use(passport.initialize());
app.use(passport.session());

// Middleware for logging session data and authenticated user information for debugging purposes
app.use((req, res, next) => {
  next();
});

function connectToDatabase() {
  return new Promise((resolve, reject) => {
    console.log('Attempting to connect to MySQL using DATABASE_URL...');
    // Parse the DATABASE_URL connection string
    const url = new URL(process.env.DATABASE_URL);
    const connectionConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading '/'
      ssl: {
        rejectUnauthorized: false
      }
    };
    
    console.log(`Connecting to: host=${connectionConfig.host}, port=${connectionConfig.port}, user=${connectionConfig.user}, database=${connectionConfig.database}`);
    
    const connection = mysql.createConnection(connectionConfig);
    
    connection.connect((err) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message);
        reject(err);
      } else {
        console.log('✅ Connected to MySQL database successfully!');
        resolve(connection);
      }
    });
    
    connection.on('error', (err) => {
      console.error('❌ Database error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Database connection lost. Reconnecting...');
        global.db = connectToDatabase().catch(console.error);
      } else {
        throw err;
      }
    });
  });
}

// Global database variable
let db;

// Initialize the application
async function initializeApp() {
  // Try to connect to the database with retries
  let connected = false;
  let retryCount = 0;
  const maxRetries = 30;
  
  while (!connected && retryCount < maxRetries) {
    try {
      db = await connectToDatabase();
      global.db = db; // Make it globally available
      connected = true;
      initializeDatabase();
      console.log("Database connection established successfully");
    } catch (error) {
      retryCount++;
      console.error(`Database connection attempt ${retryCount} failed:`, error);
      
      if (retryCount < maxRetries) {
        const delay = Math.min(10000, retryCount * 1000);
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('All database connection attempts failed. Exiting application.');
        process.exit(1);
      }
    }
  }
  
  // Configure passport after database is connected
  configurePassport();
  
  const PORT = process.env.PORT || 10000;
  // Start the server only after database is connected
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

const originalRequest = https.request;
https.request = function(options, callback) {
  console.log("=== HTTPS REQUEST ===");
  console.log("URL:", `${options.protocol}//${options.hostname}:${options.port}${options.path}`);
  console.log("Method:", options.method);
  console.log("Headers:", options.headers);
  
  const req = originalRequest.call(this, options, callback);
  
  // Log the response
  req.on('response', (res) => {
    console.log("=== HTTPS RESPONSE ===");
    console.log("Status:", res.statusCode);
    console.log("Headers:", res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log("Response Body:", data);
    });
  });
  
  req.on('error', (err) => {
    console.log("=== HTTPS REQUEST ERROR ===");
    console.log("Error:", err.message);
  });
  
  return req;
};

function configurePassport() {
  
  const browserIssuer = "https://nuhire-keycloak-rhow.onrender.com/realms/NUHire-Realm";
  
  // Container-facing URLs (for server-to-server communication)
  const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
  const containerIssuer = `${KEYCLOAK_URL}/realms/NUHire-Realm`;
  passport.use('keycloak', new KeycloakStrategy({
    host: `${KEYCLOAK_URL}`, // Server-to-server
    issuer: containerIssuer, // Server-to-server
    userInfoURL: `${containerIssuer}/protocol/openid-connect/userinfo`, // Server-to-server
    authorizationURL: `${browserIssuer}/protocol/openid-connect/auth`, // Browser-facing
    tokenURL: `${containerIssuer}/protocol/openid-connect/token`, // Server-to-server
    realm: process.env.KEYCLOAK_REALM,
    clientID: process.env.KEYCLOAK_CLIENT_ID,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    callbackURL: "https://nuhire-api-cz6c.onrender.com/auth/keycloak/callback",
    scope: ['openid', 'profile', 'email'],
  }, async (accessToken, refreshToken, params, profile, done) => {
    console.log("=== Passport Callback SUCCESS ===");
    console.log("Profile:", JSON.stringify(profile, null, 2));

    let email = profile.email.toLowerCase().trim();
    let firstName = profile.firstName;
    let lastName = profile.lastName;

    console.log("Email:", email);
    console.log("First Name:", firstName);
    console.log("Last Name:", lastName);

    db.query("SELECT * FROM Users WHERE email = ?", [email], (err, results) => {
      if (err) {
        console.error("❌ DB error:", err);
        return done(err);
      }

      if (results.length > 0) {
        return done(null, results[0]);
      } else {
        return done(null, { email, f_name: firstName, l_name: lastName }); // let app handle first-time user
      }
    });
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id || user.email);
  });

  passport.deserializeUser((identifier, done) => {
    const query = isNaN(identifier)
      ? "SELECT * FROM Users WHERE email = ?"
      : "SELECT * FROM Users WHERE id = ?";

    db.query(query, [identifier], (err, results) => {
      if (err) return done(err);
      if (results.length === 0) return done(null, false);
      return done(null, results[0]);
    });
  });
}

//health check endpoint
app.get('/', (req, res) => {
    res.send('NUHire API is running');
});

app.get("/test-cookies", (req, res) => {
  console.log("Session ID:", req.sessionID);
  console.log("Cookies:", req.headers.cookie);
  req.session.test = "cookie-test";
  res.json({ 
    sessionID: req.sessionID, 
    cookiesReceived: req.headers.cookie,
    sessionTest: req.session.test 
  });
});

app.get("/time", async (req, res) => {
  try {
    // Check Keycloak server time via a lightweight request
    const keycloakResponse = await fetch(`${process.env.KEYCLOAK_URL}/realms/NUHire-Realm`);
    const keycloakTime = keycloakResponse.headers.get('date');
    
    res.json({
      serverTime: new Date().toISOString(),
      timestamp: Date.now(),
      keycloakServerTime: keycloakTime,
      timeDifference: keycloakTime ? (new Date(keycloakTime) - new Date()) / 1000 : 'unknown'
    });
  } catch (error) {
    res.json({
      serverTime: new Date().toISOString(),
      timestamp: Date.now(),
      keycloakError: error.message
    });
  }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', port: process.env.PORT });
});

const initializeDatabase = () => {
  const queries = [
    "INSERT IGNORE INTO `Moderator` (`admin_email`, `crn`, `nom_groups`) VALUES ('labit.z@northeastern.edu', 1, 1)",
    "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Carbonite', 'uploads/jobdescription/carbonite-jobdes.pdf')",
    "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Cygilant', 'uploads/jobdescription/Cygilant Security Research Job Description.pdf')",
    "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Motionlogic', 'uploads/jobdescription/QA Coop Motionlogic (Berlin, Germany).pdf')",
    "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Sample', 'uploads/jobdescription/sample-job-description.pdf')",
    "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Source One', 'uploads/jobdescription/SourceOneJobDescription.pdf')",
    "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Two Six Labs', 'uploads/jobdescription/Two Six Labs Data Visualization Co-op Job Description.pdf')",
    "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample1', 'uploads/resumes/sample1.pdf')",
    "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample2', 'uploads/resumes/sample2.pdf')",
    "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample3', 'uploads/resumes/sample3.pdf')",
    "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample4', 'uploads/resumes/sample4.pdf')",
    "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample5', 'uploads/resumes/sample5.pdf')",
    "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample6', 'uploads/resumes/sample6.pdf')",
    "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample7', 'uploads/resumes/sample7.pdf')",
    "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample8', 'uploads/resumes/sample8.pdf')",
    "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample9', 'uploads/resumes/sample9.pdf')",
    "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample10', 'uploads/resumes/sample10.pdf')",
    "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (1, 'https://www.youtube.com/embed/aA7k6WM4_7A?si=ahwZZpSKUow0-dG2', 'Aisha', 'Patel')",
    "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (2, 'https://www.youtube.com/embed/4d6v7p0N9Sg?si=nax_IkG0gk3zNae-', 'Casey', 'Fisch')",
    "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (3, 'https://www.youtube.com/embed/typ4aN11feI?si=7jFsNwhB9ZkKyuo9', 'Ethan', 'Martinez')",
    "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (4, 'https://www.youtube.com/embed/ySKRfElNPCY?si=2B1cl7djMtE1GLJL', 'Jason', 'Jones')",
    "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (5, 'https://www.youtube.com/embed/_KGOo1WGKZU?si=aTLlkNgS7di69Sga', 'Lucas', 'Nyugen')",
    "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (6, 'https://www.youtube.com/embed/AhJrqbDTn1Y?si=_XjOXZJBzSvpN_aM', 'Maya', 'Collins')",
    "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (7, 'https://www.youtube.com/embed/1dIhJmX4uLo?si=aAna0LIIsxRu8E0K', 'Paula', 'McCartney')",
    "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (8, 'https://www.youtube.com/embed/cnIv3Zf5nJo?si=aa3ObgHLN5BBP-tp', 'Alex', 'Johnson')",
    "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (9, 'https://www.youtube.com/embed/0aVcquEhOtQ?si=gzDkWve3Izy9uTFx', 'Jordan', 'Lee')",
    "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (10, 'https://www.youtube.com/embed/HS3ShcKt288?si=uWmWIVKtNJRvqSu_', 'Zhiyuan', 'Yang')",
    "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (1, 'Interview1', 'https://www.youtube.com/embed/aA7k6WM4_7A?si=ahwZZpSKUow0-dG2')",
    "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (2, 'Interview2', 'https://www.youtube.com/embed/4d6v7p0N9Sg?si=nax_IkG0gk3zNae-')",
    "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (3, 'Interview3', 'https://www.youtube.com/embed/typ4aN11feI?si=7jFsNwhB9ZkKyuo9')",
    "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (4, 'Interview5', 'https://www.youtube.com/embed/ySKRfElNPCY?si=2B1cl7djMtE1GLJL')",
    "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (5, 'Interview5', 'https://www.youtube.com/embed/_KGOo1WGKZU?si=aTLlkNgS7di69Sga')",
    "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (6, 'Interview6', 'https://www.youtube.com/embed/AhJrqbDTn1Y?si=_XjOXZJBzSvpN_aM')",
    "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (7, 'Interview7', 'https://www.youtube.com/embed/1dIhJmX4uLo?si=aAna0LIIsxRu8E0K')",
    "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (8, 'Interview8', 'https://www.youtube.com/embed/cnIv3Zf5nJo?si=aa3ObgHLN5BBP-tp')",
    "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (9, 'Interview9', 'https://www.youtube.com/embed/0aVcquEhOtQ?si=gzDkWve3Izy9uTFx')",
    "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (10, 'Interview10', 'https://www.youtube.com/embed/HS3ShcKt288?si=uWmWIVKtNJRvqSu_')"
  ];
      
  const executeQueries = async () => {
    for (const query of queries) {
      try {
        await new Promise((resolve, reject) => {
          db.query(query, (err, result) => {
            if (err) {
              console.error(`FULL ERROR for query [${query}]:`, err);
              resolve();
            } else {
              resolve(result);
            }
          });
         });
      } catch (error) {
        console.error(`Exception in query: ${query.substring(0, 60)}...`, error);
      }
    }
    console.log("Database initialization completed!");
  };
      
  executeQueries();
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Socket.io configuration for real-time communication between the server and clients

// Store online students in an object, which keeps track of connected students and their socket IDs
let onlineStudents = {};

// Listen for incoming connections from clients
// When a client connects, the server logs the connection and sets up event listeners for various events
io.on("connection", (socket) => {

  socket.on("adminOnline", ({ adminEmail }) => {
    socket.join(adminEmail);
  });

  // Listen for the "studentOnline" event, which is emitted by the client when a student comes online
  socket.on("studentOnline", ({ studentId }) => {
    onlineStudents[studentId] = socket.id;

    // Listen for the "message" event, which is emitted by the client when a message is sent
    // The server logs the message and broadcasts it to all connected clients
    socket.on("message", (data) => {
      console.log("Received message:", data);

      // Broadcast the message to all connected clients
      io.emit("message", data);
    });

    // Query the database to get the group ID and current page for the student
    // The server emits the "updateOnlineStudents" event to all connected clients with the student's information
    db.query("SELECT group_id, current_page FROM Users WHERE email = ?", [studentId], (err, result) => {
      if (!err && result.length > 0) {
        const { group_id, current_page } = result[0];
        io.emit("updateOnlineStudents", { studentId, group_id, current_page });
      }
    });


  });

  // Listen for the "joinGroup" event, which is emitted by the client when a student joins a group
  // The server adds the student to the specified group room
  socket.on("joinGroup", (group_id) => {
    socket.join(group_id);
  });

  socket.on('joinClass', ({classId}) => {
    console.log(`Socket ${socket.id} joining class room: class_${classId}`);
    socket.join(`class_${classId}`);
  });

  // Listen for the "check" event, which is emitted by the client when a checkbox is checked or unchecked
  // The server emits the checkbox update to all clients in the specified group room    
  // Listen for the "check" event
  socket.on("check", ({ group_id, resume_number, checked }) => {
    console.log(`Checkbox update received: Room ${group_id}, Resume ${resume_number}, Checked: ${checked}`);
    
    // Extract class information from the group_id if it contains the new format
    let actualGroupId = group_id;
    let classId = null;
    
    // Check if the group_id is in the format "group_X_class_Y"
    const roomMatch = /group_(\d+)_class_(\d+)/.exec(group_id);
    if (roomMatch) {
        actualGroupId = roomMatch[1]; //sThe actual group ID
        classId = roomMatch[2];       // The class ID
    }
    
    // Update the database - removed commas between WHERE conditions and removed AND
    const query = classId 
      ? "UPDATE Resume SET `checked` = ? WHERE group_id = ? AND class = ? AND resume_number = ?"
      : "UPDATE Resume SET `checked` = ? WHERE group_id = ? AND resume_number = ?";
      
    const params = classId 
      ? [checked, actualGroupId, classId, resume_number]
      : [checked, actualGroupId, resume_number];
    
    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return; // Stop execution on error
        }
        
        console.log(`Database updated successfully for resume ${resume_number}`);
        
        // Emit the update to ALL clients in the same room (including sender)
        io.to(group_id).emit("checkboxUpdated", { resume_number, checked });
        console.log(`Emitted checkboxUpdated to room ${group_id}: Resume ${resume_number}, Checked: ${checked}`);
    });
  });

  // Listen for the "checkint" event, which is emitted by the client when a checkbox in the make offer stage is checked or unchecked
  socket.on("checkint", ({ group_id, interview_number, checked }) => {
    socket.to(group_id).emit("checkboxUpdated", { interview_number, checked });
  });

  // Listen for the "studentPageChanged" event, which is emitted by the client when a student changes their page
  socket.on("studentPageChanged", ({ studentId, currentPage }) => {
    if (onlineStudents[studentId]) {
      console.log(`Student ${studentId} changed page to ${currentPage}`);
      io.emit("studentPageChange", { studentId, currentPage });
    }
  });

  // Listen for the "sendPopupToGroups" event, which is emitted by the client when an admin wants to send a popup message to specific groups
  // The server queries the database to get the email addresses of students in the specified groups
  socket.on("sendPopupToGroups", ({ groups, headline, message, class: classId, candidateId }) => {
    if (!groups || groups.length === 0) return;
  
    let query = "SELECT email FROM Users WHERE group_id IN (?) AND affiliation = 'student'";
    let params = [groups];
    
    if (classId) {
      query += " AND class = ?";
      params.push(classId);
    }
  
    db.query(query, params, (err, results) => {
      if (!err && results.length > 0) {
        results.forEach(({ email }) => {
          const studentSocketId = onlineStudents[email];
          if (studentSocketId) {
            io.to(studentSocketId).emit("receivePopup", { headline, message, candidateId });
          }
        });
  
        console.log(`Popup sent to Groups: ${groups.join(", ")} in Class ${classId || 'All'}`);
      } else {
        console.log("No online students in the selected groups.");
      }
    });
  });

  socket.on("updateRatingsWithPresetBackend", ({ classId, groupId, candidateId, vote, isNoShow }) => {
    const roomId = `group_${groupId}_class_${classId}`;
  

    io.to(roomId).emit("updateRatingsWithPresetFrontend", {
      classId,
      groupId,
      candidateId,
      vote,
      isNoShow
    });
  });

  // Listen for the "makeOfferRequest" event, which is emitted by the client when a student group wants to make an offer to a candidate
  socket.on("makeOfferRequest", ({classId, groupId, candidateId }) => {
    console.log(`Student in class ${classId}, group ${groupId} wants to offer candidate ${candidateId}`);
    
    // Find and notify all admin users about the new offer request
    db.query("SELECT admin_email FROM Moderator WHERE crn = ?", [classId], (err, moderators) => {
      console.log("Moderator query result:", moderators);
      if (!err && moderators.length > 0) {
        moderators.forEach(({ admin_email }) => {
          io.to(admin_email).emit("makeOfferRequest", {
            classId, 
            groupId, 
            candidateId
          });
          console.log(`Notified ${admin_email} about offer request from group ${groupId}`);
        });
      } else {
        console.log("No assigned admin found for class", classId, "or database error:", err);
      }
    });

    const roomId = `group_${groupId}_class_${classId}`;
    io.to(roomId).emit("groupMemberOffer");
  });

  // Advisor’s decision → notify the student group
  socket.on('makeOfferResponse', ({classId, groupId, candidateId, accepted }) => {
    console.log(`Advisor responded to class ${classId}, group ${groupId} for candidate ${candidateId}: accepted=${accepted}`);
    io.emit('makeOfferResponse', {classId, groupId, candidateId, accepted });
  });

  // Listen for the "moveGroup" event, that will move all students in the same group to the target page
  socket.on("moveGroup", ({classId, groupId, targetPage}) => {
    console.log(`Moving group ${groupId} in class ${classId} to ${targetPage}`);
    const roomId = `group_${groupId}_class_${classId}`;
    console.log(`Emitting moveGroup to room: ${roomId}`);
    io.to(roomId).emit("moveGroup", {classId, groupId, targetPage});
  });

  // Listen for interview submissions
  socket.on("submitInterview", ({currentVideoIndex, nextVideoIndex, isLastInterview, groupId, classId}) => {
    console.log(`Interview ${currentVideoIndex + 1} submitted by group ${groupId}, class ${classId}, moving to video ${nextVideoIndex + 1}, isLast: ${isLastInterview}`);
    const roomId = `group_${groupId}_class_${classId}`;
    // Broadcast to all members in the room including sender
    io.to(roomId).emit("interviewSubmitted", {currentVideoIndex, nextVideoIndex, isLastInterview, groupId, classId});
  });

  // Listen for offer candidate selection
  socket.on("offerSelected", ({candidateId, groupId, classId, roomId, checked}) => {
    console.log(`Candidate ${candidateId} ${checked ? 'selected' : 'deselected'} for offer by group ${groupId}, class ${classId}`);
    // Broadcast to all members in the room except sender (sender already updated their state)
    socket.to(roomId).emit("offerSelected", {candidateId, groupId, classId, checked});
  });

  // Listen for offer submissions
  socket.on("offerSubmitted", ({candidateId, groupId, classId, roomId}) => {
    console.log(`Offer submitted for candidate ${candidateId} by group ${groupId}, class ${classId}`);
    // Broadcast to all members in the room except sender (sender already updated their state)
    socket.to(roomId).emit("offerSubmitted", {candidateId, groupId, classId});
  });

  // Listen for user completion of res-review stage
  socket.on("userCompletedResReview", ({ groupId }) => {    
    if (!groupId) {
      console.log("No group ID provided for userCompletedResReview");
      return;
    }
    
    // Get the student email from the socket connection
    const studentEmail = Object.keys(onlineStudents).find(email => onlineStudents[email] === socket.id);
    if (!studentEmail) {
      console.log("Could not identify student for userCompletedResReview");
      return;
    }
    
    console.log(`Student ${studentEmail} completed res-review in group ${groupId}`);
    
    db.query("SELECT f_name, l_name, email, current_page FROM Users WHERE group_id = ? AND affiliation = 'student'", 
      [groupId], (err, groupMembers) => {
        if (err) {
          console.error("Error fetching group members:", err);
          return;
        }
        
        console.log(`Group ${groupId} has ${groupMembers.length} members`);
        
        // Initialize tracking structures
        if (!global.completedResReview) {
          global.completedResReview = {};
        }
        if (!global.completedResReview[groupId]) {
          global.completedResReview[groupId] = new Set();
        }
        
        // Add the student to the completed set (prevents double counting)
        const wasAlreadyCompleted = global.completedResReview[groupId].has(studentEmail);
        global.completedResReview[groupId].add(studentEmail);
        
        if (wasAlreadyCompleted) {
          console.log(`Student ${studentEmail} already marked as completed, ignoring duplicate`);
          return;
        }
        
        const completedCount = global.completedResReview[groupId].size;
        const totalCount = groupMembers.length;
        const allCompleted = completedCount >= totalCount;
        
        console.log(`Group ${groupId} completion: ${completedCount}/${totalCount} completed by: ${Array.from(global.completedResReview[groupId]).join(', ')}`);
                
        if (allCompleted) {          
          console.log(`🎉 All members in group ${groupId} have completed res-review! Notifying group members.`);
          
          groupMembers.forEach(member => {
            const memberSocketId = onlineStudents[member.email];
            if (memberSocketId) {
              console.log(`Sending groupCompletedResReview to ${member.email}`);
              io.to(memberSocketId).emit("groupCompletedResReview", {
                groupId,
                completedCount,
                totalCount,
                message: "All group members have completed their individual resume reviews!"
              });
            } else {
              console.log(`Member ${member.email} is not online`);
            }
          });
        } else {
          console.log(`Group ${groupId} still waiting for ${totalCount - completedCount} more members to complete`);
        }
      });
  });

  socket.on("confirmOffer", ({ groupId, classId, candidateId, studentId, roomId }) => {
    io.to(roomId).emit("confirmOffer", {
      candidateId,
      studentId,
      groupId,
      classId,
    });
  });

  socket.on("sentPresetVotes", async ({ student_id, group_id, class: classId, question1, question2, question3, question4, candidate_id }) => {
    console.log("inside sentPresetVotes, with data:", { student_id, group_id, classId, question1, question2, question3, question4, candidate_id });
    try {
      const query = `
        INSERT INTO InterviewPopup 
          (candidate_id, group_id, class, question1, question2, question3, question4)
        VALUES 
          (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          question1 = question1 + VALUES(question1),
          question2 = question2 + VALUES(question2),
          question3 = question3 + VALUES(question3),
          question4 = question4 + VALUES(question4)`;

      // Use callback instead of promise since your db connection isn't using mysql2/promise
      db.query(query, [
        candidate_id,
        group_id,
        classId,
        question1,
        question2,
        question3,
        question4
      ], (err, result) => {
        if (err) {
          console.error('Error updating interview popup votes:', err);
        } else {
          console.log(`Updated interview popup votes for candidate ${candidate_id} in group ${group_id} class ${classId}`);
        }
      });

    } catch (error) {
      console.error('Error in sentPresetVotes:', error);
    }
  });
  socket.on("teamConfirmSelection", ({ groupId, classId, studentId, roomId }) => {
    io.to(roomId).emit("teamConfirmSelection", {
      groupId,
      classId,
      studentId,
      roomId
    });
  });

  socket.on('allowGroupAssignment', ({classId, message}) => {
    console.log('Teacher allowing group assignment for class:', classId);
    
    // Broadcast to all students in the specific class
    io.to(`class_${classId}`).emit('allowGroupAssignmentStudent', {
      classId: classId,
      message: message
    });

  });

  // Teacher closes group assignment
  socket.on('groupAssignmentClosed', ({classId, message}) => {
    console.log('Teacher closing group assignment for class:', classId);
    
    // Broadcast to all students in the specific class
    io.to(`class_${classId}`).emit('groupAssignmentClosedStudent', {
      classId: classId,
      message: message
    });
  });

  // Listens for the "disconnect" event, which is emitted when a client disconnects from the server
  // The server removes the student from the onlineStudents object and emits the "updateOnlineStudents" event to all connected clients
  socket.on("disconnect", () => {
    Object.keys(onlineStudents).forEach((studentId) => {
      if (onlineStudents[studentId] === socket.id) {
        console.log(`Student ${studentId} disconnected`);
        delete onlineStudents[studentId];
      }
    });
  });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Keycloak OAuth 2.0 authentication routes

// The "/auth/keycloak" route initiates the authentication process by redirecting the user to the Keycloak login page
app.get("/auth/keycloak", (req, res, next) => {
  passport.authenticate("keycloak")(req, res, next);
});

// The "/auth/keycloak/callback" route is the callback URL that Keycloak redirects to after the user has authenticated
// The server handles the authentication response and checks if the user exists in the database
app.get("/auth/keycloak/callback",
  (req, res, next) => {
    console.log("=== OAuth Callback Debug ===");
    console.log("State parameter:", req.query.state);
    console.log("Code parameter:", req.query.code);
    console.log("Error:", req.query.error);
    console.log("Error description:", req.query.error_description);
    console.log("All query params:", req.query);
    next();
  },
  passport.authenticate("keycloak", { 
    failureRedirect: "/",
    failureFlash: false
  }),
  (req, res) => {
    console.log("=== Authentication successful ===");
    console.log("req.user after auth:", req.user);
    console.log("req.session after auth:", req.session);
    console.log("Session ID:", req.sessionID);
    const user = req.user;
    if (!user || !user.email) {
      console.error("No user or email found after authentication");
      return res.redirect(`${FRONT_URL}/?error=no_user`);
    }

    const email = user.email;
    console.log("email before query");
    
    db.query("SELECT * FROM Users WHERE email = ?", [email], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.redirect("/");
      }

      if (results.length > 0) {
        const dbUser = results[0];
        const fullName = encodeURIComponent(`${dbUser.First_name || ""} ${dbUser.Last_name || ""}`.trim());

        if (dbUser.affiliation === "admin") {
          return res.redirect(`${FRONT_URL}/advisor-dashboard?name=${fullName}`);
        } else {
          if (dbUser.group_id) {
            // User has a group, proceed with normal flow
            if (dbUser.seen === 1) {
              return res.redirect(`${FRONT_URL}/dashboard?name=${fullName}`);
            }
            else{
              return res.redirect(`${FRONT_URL}/about`);
            }
          } else {
            const firstName = encodeURIComponent(user.f_name || '');
            const lastName = encodeURIComponent(user.l_name || '');
            return res.redirect(`${FRONT_URL}/waitingGroup`);
          }
        }
      } else {
        console.log("User not found in database, redirecting to signup form");
        const firstName = encodeURIComponent(user.f_name || '');
        const lastName = encodeURIComponent(user.l_name || '');
        return res.redirect(`${FRONT_URL}/signupform?email=${encodeURIComponent(email)}&firstName=${firstName}&lastName=${lastName}`); 
      }
    });
  }
);


//check if the user is authenticated and return the user information
app.get("/auth/user", (req, res) => {
  console.log("=== /auth/user endpoint hit ===");
  console.log("Session ID:", req.sessionID);
  console.log("Session passport:", req.session.passport);
  console.log("Cookies received:", req.headers.cookie);

  if (req.sessionID && !req.session.passport) {
    console.log("❌ Session exists but no passport data - authentication expired");
    return res.redirect("/auth/keycloak");
  }

  if (!req.isAuthenticated()) {
    console.log("❌ User not authenticated - redirecting to sign in");
    return res.redirect("/auth/keycloak"); 
  }
  
  res.json(req.user);
});

// logout route for logging out the user and destroying the session
// The server clears the session and redirects the user to the home page
app.post("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out successfully" });
      res.redirect(`${FRONT_URL}`);
    });
  });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Routes for serving the frontend application

// get route for the dashboard page, which checks if the user is authenticated and redirects them to the frontend student dashboard with their name as a query parameter
app.get("/dashboard", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Redirect to frontend dashboard with user data
  res.redirect(`${FRONT_URL}/dashboard?name=${encodeURIComponent(req.user.f_name + " " + req.user.l_name)}`);
});

//get route for the job description page, which checks if the user is authenticated and redirects them to the frontend job description page with their name as a query parameter
app.get("/jobdes", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.redirect(`${FRONT_URL}/jobdes?name=${encodeURIComponent(req.user.f_name + " " + req.user.l_name)}`);
});

// get route for the resume review page, which checks if the user is authenticated and redirects them to the frontend resume review page with their name as a query parameter
app.get("/res-review"), (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.redirect(`${FRONT_URL}/res-review?name=${encodeURIComponent(req.user.f_name + " " + req.user.l_name)}`);
}

//get route for the group resume review page, which checks if the user is authenticated and redirects them to the frontend group resume review page with their name as a query parameter
app.get("/res-review-group"), (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.redirect(`${FRONT_URL}/res-review-group?name=${encodeURIComponent(req.user.f_name + " " + req.user.l_name)}`);
}

// get route for the interview stage page, which checks if the user is authenticated and redirects them to the frontend interview stage page with their name as a query parameter
app.get("/interview-stage"), (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.redirect(`${FRONT_URL}/interview-stage?name=${encodeURIComponent(req.user.f_name + " " + req.user.l_name)}`);
}

// Logout route
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Routes for handling stored data user data

// get route for user data, which checks if the user is authenticated and retrieves all users from the database
app.get("/users", (req, res) => {
  db.query("SELECT * FROM Users", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//get route which gets a specific user by their ID from the database
app.get("/users/:id", (req, res) => {
  db.query("SELECT * FROM Users WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(results[0]);
  });
});

// post route for creating a new user, which checks if the user already exists in the database and inserts a new user record if not
app.post("/users", (req, res) => {
  const { First_name, Last_name, Email, Affiliation, Class } = req.body; 

  console.log("=== POST /users endpoint hit ===");
  console.log("Request body:", { First_name, Last_name, Email, Affiliation, Class });

  if (!First_name || !Last_name || !Email || !Affiliation) {
    console.log("❌ Validation failed: Missing required fields");
    return res.status(400).json({ message: "First name, last name, email, and affiliation are required" });
  }

  // ADDED: Require class for students
  if (Affiliation === 'student' && !Class) {
    console.log("❌ Validation failed: Class required for students");
    return res.status(400).json({ message: "Class is required for students" });
  }

  console.log("✅ Validation passed, checking if user exists in database");

  // Check if user already exists
  db.query("SELECT * FROM Users WHERE email = ?", [Email], (err, results) => {
    if (err) {
      console.error("❌ Database error during user lookup:", err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`Database query result: Found ${results.length} users with email ${Email}`);
    
    if (results.length > 0) {
      console.log("User already exists:", results[0]);
      
      if (Affiliation === 'student') {
        console.log("✅ Existing student login successful");
        return res.status(200).json({ message: "User registered successfully" });
      }
      if (Affiliation === 'admin') {
        console.log("❌ Admin already registered");
        return res.status(400).json({ message: "Teacher already registered" });
      }
    }

    console.log("User does not exist, creating new user");

    // Create user with class assignment
    let sql, params;
    if (Affiliation === 'admin') {
      console.log("Creating new admin user");
      sql = "INSERT INTO Users (f_name, l_name, email, affiliation) VALUES (?, ?, ?, ?)";
      params = [First_name, Last_name, Email, Affiliation];
      
      console.log("Admin SQL query:", sql);
      console.log("Admin SQL params:", params);
      
    } else if (Affiliation === 'student') {
      // FIXED: Include class assignment for students
      console.log("Creating new student user with class assignment");
      sql = "INSERT INTO Users (f_name, l_name, email, affiliation, class) VALUES (?, ?, ?, ?, ?)";
      params = [First_name, Last_name, Email, Affiliation, Class];
      
      console.log("Student SQL query:", sql);
      console.log("Student SQL params:", params);
    } else {
      console.log("❌ Invalid affiliation:", Affiliation);
      return res.status(400).json({ message: "Invalid affiliation" });
    }
    
    console.log("Executing user creation query...");
    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("❌ Failed to create user - Database error:", err);
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
        return res.status(500).json({ error: err.message });
      }
      
      console.log("✅ User created successfully");
      console.log("Insert result:", result);
      console.log("New user ID:", result.insertId);
      
      const responseData = {
        id: result.insertId, 
        First_name, 
        Last_name, 
        Email, 
        Affiliation,
        Class: Affiliation === 'student' ? Class : undefined
      };
      
      console.log("Sending successful response:", responseData);
      res.status(201).json(responseData);
    });
  });
});

// Update the students endpoint to filter by class
app.get("/students", async (req, res) => {
  const { class: classId } = req.query;
  
  let query = "SELECT f_name, l_name, email, group_id FROM Users WHERE affiliation = 'student'";
  let params = [];
  
  if (classId) {
    query += " AND class = ?";
    params.push(classId);
  }
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
    console.log(results);
  });
});

// post route for updating the current page of a user, which checks if the page and user email are provided in the request body
app.post("/update-currentpage", (req, res) => {
  const { page, user_email } = req.body;

  if (!page || !user_email) {
    return res.status(400).json({ error: "Page and email are required." });
  }

  db.query("UPDATE Users SET `current_page` = ? WHERE email = ?", [page, user_email], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to update current page." });
    }
    res.json({ message: "Page updated successfully!" });
  }
  );
});

// Updates a group of Users' stored job description and resets their progress.
// Also deletes all notes for affected students.
// Updates a group of Users' stored job description and resets their progress.
app.post("/update-job", async (req, res) => {
  const { job_group_id, class_id, job } = req.body;

  if (!job_group_id || !class_id || !job || job.length === 0) {
    return res.status(400).json({ error: "Group ID, class ID, and job are required." });
  }

  console.log("Updating job for group:", req.body);

  try {
    // Start a transaction for atomic operations
    await db.promise().query('START TRANSACTION');

    // 1. Update/Insert into Job_Assignment table
    const jobTitle = Array.isArray(job) ? job[0] : job;
    await db.promise().query(
      `INSERT INTO Job_Assignment (\`group\`, \`class\`, job)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE job = VALUES(job)`,
      [job_group_id, class_id, jobTitle]
    );

    // 2. Reset current_page for all students in the group/class (remove job_des update)
    await db.promise().query(
      "UPDATE Users SET `current_page` = 'jobdes' WHERE group_id = ? AND class = ? AND affiliation = 'student'",
      [job_group_id, class_id]
    );

    // 3. Update Progress table - set all group members to 'job_description' step
    await db.promise().query(
      "UPDATE Progress SET step = 'job_description' WHERE crn = ? AND group_id = ?",
      [class_id, job_group_id]
    );

    // ... rest of your clearing logic remains the same ...

    // 4. Clear InterviewPage table for this class and group
    await db.promise().query(
      "DELETE FROM InterviewPage WHERE class = ? AND group_id = ?",
      [class_id, job_group_id]
    );

    // 5. Clear MakeOfferPage table for this class and group
    await db.promise().query(
      "DELETE FROM MakeOfferPage WHERE class = ? AND group_id = ?",
      [class_id, job_group_id]
    );

    // 6. Clear Resume table for this class and group
    await db.promise().query(
      "DELETE FROM Resume WHERE class = ? AND group_id = ?",
      [class_id, job_group_id]
    );

    // 7. Clear Resumepage2 table for this class and group
    await db.promise().query(
      "DELETE FROM Resumepage2 WHERE class = ? AND group_id = ?",
      [class_id, job_group_id]
    );

    // 8. Clear Offer_Status table for this class and group
    await db.promise().query(
      "DELETE FROM Offer_Status WHERE class = ? AND group_id = ?",
      [class_id, job_group_id]
    );

    // 9. Clear Interview_Status table for this class and group
    await db.promise().query(
      "DELETE FROM Interview_Status WHERE class = ? AND group_id = ?",
      [class_id, job_group_id]
    );

    // 10. Clear InterviewPopup table for this class and group
    await db.promise().query(
      "DELETE FROM InterviewPopup WHERE class = ? AND group_id = ?",
      [class_id, job_group_id]
    );

    // 11. Get student emails for note deletion and socket notifications
    const [students] = await db.promise().query(
      "SELECT email FROM Users WHERE group_id = ? AND class = ? AND affiliation = 'student'",
      [job_group_id, class_id]
    );

    const emails = students.map(({ email }) => email);

    // 12. Clear Resumepage table for students in this group and class
    if (emails.length > 0) {
      const placeholders = emails.map(() => '?').join(',');
      await db.promise().query(
        `DELETE rp FROM Resumepage rp
         JOIN Users u ON rp.student_id = u.id
         WHERE u.email IN (${placeholders}) AND u.class = ? AND u.group_id = ?`,
        [...emails, class_id, job_group_id]
      );

      // 13. Delete all notes for these students
      await db.promise().query(
        `DELETE FROM Notes WHERE user_email IN (${placeholders})`,
        emails
      );
    }

    // 14. Reset completion tracking
    if (global.completedResReview && global.completedResReview[job_group_id]) {
      global.completedResReview[job_group_id] = new Set();
      console.log(`Reset completedResReview for group ${job_group_id}`);
    }

    // Commit the transaction
    await db.promise().query('COMMIT');

    // 15. Send socket notifications to affected students
    if (emails.length > 0) {
      emails.forEach(email => {
        const studentSocketId = onlineStudents[email];
        if (studentSocketId) {
          io.to(studentSocketId).emit("jobUpdated", {
            job: [jobTitle],
            group_id: job_group_id,
            class_id,
            message: `Your group has been assigned a new job. All progress has been reset.`
          });
        }
      });
    }

    // 16. Emit general update to class
    io.emit("groupJobUpdated", {
      job_group_id,
      class_id,
      job: [jobTitle],
      message: `Group ${job_group_id} job updated - all progress reset`
    });

    console.log(`Job "${jobTitle}" assigned to Group ${job_group_id} in Class ${class_id}. All related data cleared.`);
    
    res.json({ 
      message: "Group job updated and all related data cleared successfully!",
      job_group_id,
      class_id,
      job: jobTitle,
      cleared_tables: [
        "InterviewPage", "MakeOfferPage", "Resume", "Resumepage", 
        "Resumepage2", "Offer_Status", "Interview_Status", "InterviewPopup", "Notes"
      ],
      students_affected: emails.length,
      job_assignment_updated: true
    });

  } catch (error) {
    // Rollback on error
    try {
      await db.promise().query('ROLLBACK');
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }
    
    console.error("Error updating job and clearing data:", error);
    res.status(500).json({ 
      error: "Database error occurred while updating job and clearing data",
      details: error.message 
    });
  }
});

// Update user's class
app.post("/update-user-class", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { email, class: classId } = req.body;
  
  // Verify the user is updating their own data
  if (req.user.email !== email && req.user.affiliation !== "admin") {
    return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
  }

  if (!email || !classId) {
    return res.status(400).json({ error: "Email and class are required." });
  }

  db.query("UPDATE Users SET `class` = ? WHERE email = ?", [classId, email], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to update class." });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    
    res.json({ message: "Class updated successfully!" });
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Notes API Routes

// get route for retrieving notes for a specific user from the database
app.get("/notes", (req, res) => {
  const userEmail = req.query.user_email;
  if (!userEmail) {
    return res.status(400).json({ error: "user_email query parameter is required" });
  }
  db.query("SELECT * FROM Notes WHERE user_email = ? ORDER BY created_at DESC", [userEmail], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// post route for creating a new note, which checks if the user email and note content are provided in the request body
app.post("/notes", (req, res) => {
  const { user_email, content } = req.body;

  if (!user_email || !content) {
    return res.status(400).json({ error: "Email and note content are required" });
  }

  db.query(
    "INSERT INTO Notes (user_email, content, created_at) VALUES (?, ?, NOW())",
    [user_email, content],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json({ content, id: result.insertId });
    }
  );
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Group API Routes

// get route for retrieving all groups from the database
app.get("/groups", async (req, res) => {
  const { class: classId } = req.query;
  
  try {
    // First, get the number of groups from the Moderator table
    const [moderatorResult] = await db.promise().query(
      "SELECT nom_groups FROM Moderator WHERE crn = ?", 
      [classId]
    );
    
    if (moderatorResult.length === 0) {
      return res.status(404).json({ error: "Class not found" });
    }
    
    const nomGroups = moderatorResult[0].nom_groups;
    console.log(`Class ${classId} should have ${nomGroups} groups`);
    
    // Create the groups object based on nom_groups
    const groupsData = {};
    for (let i = 1; i <= nomGroups; i++) {
      groupsData[i] = []; // Initialize empty array for each group
    }
    
    console.log("Generated groups data:", groupsData);
    res.json(groupsData);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// post route for updating the group of students, which checks if the group ID and students are provided in the request body
app.post("/update-group", (req, res) => {
  const { group_id, students } = req.body;

  if (!group_id || students.length === 0) {
    return res.status(400).json({ error: "Group ID and students are required." });
  }

  const queries = students.map(email => {
    return new Promise((resolve, reject) => {
      db.query("UPDATE Users SET `group_id` = ? WHERE email = ?", [group_id, email], (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  });

  Promise.all(queries)
    .then(() => res.json({ message: "Group updated successfully!" }))
    .catch(error => res.status(500).json({ error: error.message }));
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Resume API Routes

// get route for retrieving all resumes from the database
app.get("/resume", (req, res) => {
  db.query("SELECT * FROM Resume", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//post route for submitting a resume vote, which checks if the required fields are provided in the request body
app.post("/resume/vote", (req, res) => {
  const { student_id, group_id, class: classId, timespent, resume_number, vote } = req.body;

  // More precise validation that allows timespent to be 0
  if (!student_id || !group_id || !classId || !resume_number || timespent === undefined || timespent === null || !vote) {
    console.log("Validation failed. Received data:", { student_id, group_id, classId, timespent, resume_number, vote });
    return res.status(400).json({ 
      error: "student_id, group_id, class, resume_number, timespent, and vote are required" 
    });
  }

  const query = `INSERT INTO Resume (student_id, group_id, class, timespent, resume_number, vote) 
  VALUES (?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE timespent = VALUES(timespent), vote = VALUES(vote);`;

  db.query(query, [student_id, group_id, classId, timespent, resume_number, vote], (err, result) => {
    if (err) {
      console.error("Error saving vote:", err);
      return res.status(500).json({ error: "Database error" });
    }
    
    console.log(`Vote recorded for resume ${resume_number} by student ${student_id} in group ${group_id}, class ${classId}`);
    res.status(200).json({ message: "Resume review updated successfully" });
  });
});

// get route for retriving all of the resume submissions made by a specific student, given their id.
app.get("/resume/student/:student_id", (req, res) => {
  const { student_id } = req.params;
  db.query("SELECT * FROM Resume WHERE student_id = ?", [student_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// delete route for deleting a resume submission, which checks if the student ID is provided in the request parameters
app.delete("/resume/:student_id", (req, res) => {
  const { student_id } = req.params;
  db.query("DELETE FROM Resume WHERE student_id = ?", [student_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Resume deleted successfully" });
  });
});

// Update the existing endpoint to support class filtering
app.get("/resume/group/:group_id", (req, res) => {
  const { group_id } = req.params;
  const { class: studentClass } = req.query;
  
  let query = "SELECT * FROM Resume WHERE group_id = ?";
  let params = [group_id];
  
  // If class is provided, add it to the query
  if (studentClass) {
    // You'll need to join with the Users table to filter by class
    query = `
      SELECT r.* 
      FROM Resume r
      JOIN Users u ON r.student_id = u.id
      WHERE r.group_id = ? AND u.class = ?
    `;
    params = [group_id, studentClass];
  }
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// post route for checking a resume, which checks if the user ID, group ID, resume number, and checked status are provided in the request body
app.post("/resume/check", async (req, res) => {
  const { user_id, group_id, resume_number, checked } = req.body;

  try {
    await db.query(
      "UPDATE resume_votes SET checked = $1 WHERE user_id = $2 AND group_id = $3 AND resume_number = $4",
      [checked, user_id, group_id, resume_number]
    );

    // Emit the checkbox update to the group
    io.to(group_id).emit("checkboxUpdated", { resume_number, checked });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating checkbox:", error);
    res.status(500).json({ success: false });
  }
});

//get route for getting all resumes that have been checked by a group, given their id.
app.get("/resume/checked/:group_id", async (req, res) => {
  const { group_id } = req.params;
  db.query("SELECT vote, resume_number FROM Resume WHERE group_id = ? AND checked == 'True'", [group_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Interview API Routes

//post route for submitting an interview vote, which checks if the required fields are provided in the request body
app.post("/interview/vote", async (req, res) => {
  const { student_id, group_id, studentClass, question1, question2, question3, question4, candidate_id } = req.body;

  if (!student_id || !group_id || !studentClass || !question1 || !question2 || !question3 || !question4 || !candidate_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const query = `
    INSERT INTO InterviewPage
      (student_id, group_id, class, question1, question2, question3, question4, candidate_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        question1 = VALUES(question1),
        question2 = VALUES(question2),
        question3 = VALUES(question3),
        question4 = VALUES(question4)
    `;

  db.query(query, [student_id, group_id, studentClass, question1, question2, question3, question4, candidate_id], (err, result) => {
    if (err) {
      console.error(err)
      return res.status(500).json({ error: "Database error" });
    }
    res.status(200).json({ message: "Interview result update successfully" });
  });
});

//get route for getting all stored interview votes
app.get("/interview", (req, res) => {
  db.query("SELECT * FROM InterviewPage", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get("/interview-status/finished-count", (req, res) => {
  const { group_id, class_id } = req.query;

  if (!group_id || !class_id) {
    return res.status(400).json({ error: "group_id and class_id are required" });
  }

  // Join Interview_Status and Users to filter by group and class
  const query = `
    SELECT COUNT(*) AS finishedCount
    FROM Interview_Status 
    WHERE group_id = ? AND class = ? AND finished = 1
    ;`
  db.query(query, [group_id, class_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    console.log(results);
    res.json({ finishedCount: results[0].finishedCount });
  });
});

app.post("/interview-status/finished", (req, res) => {
  const { student_id, finished, group_id, class: class_id } = req.body;

  if (
    typeof student_id === "undefined" ||
    typeof finished === "undefined" ||
    typeof group_id === "undefined" ||
    typeof class_id === "undefined"
  ) {
    return res.status(400).json({ error: "student_id, finished, group_id, and class are required" });
  }

  db.query(
    `INSERT INTO Interview_Status (student_id, finished, group_id, class)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE finished = VALUES(finished), group_id = VALUES(group_id), class = VALUES(class)`,
    [student_id, !!finished, group_id, class_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      // Query for finished count
      db.query(
        "SELECT COUNT(*) AS finishedCount FROM Interview_Status WHERE group_id = ? AND class = ? AND finished = 1",
        [group_id, class_id],
        (err2, finishedResults) => {
          if (err2) return res.status(500).json({ error: err2.message });

          // Query for group size
          db.query(
            "SELECT COUNT(*) AS count FROM Users WHERE group_id = ? AND affiliation = 'student' AND class = ?",
            [group_id, class_id],
            (err3, groupResults) => {
              if (err3) return res.status(500).json({ error: err3.message });

              const count = finishedResults[0].finishedCount;
              const total = groupResults[0].count;

              // Emit to the group room (make sure your frontend joins this room)
              io.to(`group_${group_id}_class_${class_id}`).emit("interviewStatusUpdated", { count, total });

              res.json({ success: true });
            }
          );
        }
      );
    }
  );
});

// get route for number of people in group
app.get("/group-size/:group_id", (req, res) => {
  const { group_id } = req.params;
  db.query(
    "SELECT COUNT(*) AS count FROM Users WHERE group_id = ? AND affiliation = 'student'",
    [group_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ group_id, count: results[0].count });
    }
  );
});

// get route for retrieving all interviews submitted by a specific group, given their id.
app.get("/interview/group/:group_id", (req, res) => {
  const { group_id } = req.params;
  const { class: studentClass } = req.query;
  
  let query = "SELECT * FROM InterviewPage WHERE group_id = ?";
  let params = [group_id];
  
  // If class is provided, add it to the query
  if (studentClass) {
    // You'll need to join with the Users table to filter by class
    query = `
      SELECT r.* , u.f_name, u.l_name
      FROM InterviewPage r
      JOIN Users u ON r.student_id = u.id
      WHERE r.group_id = ? AND u.class = ?
    `;
    params = [group_id, studentClass];
  }
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.delete("/interview/:student_id", (req, res) => {
  const { student_id } = req.params;
  db.query("DELETE FROM Interview WHERE student_id = ?", [student_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Interview vote deleted successfully" });
  });
}
);

app.get('/interview-popup/:resId/:groupId/:classId', (req, res) => {
  const { resId, groupId, classId } = req.params;
  
  console.log(`Fetching popup votes for candidate ${resId}, group ${groupId}, class ${classId}`);
  
  const query = 'SELECT * FROM InterviewPopup WHERE candidate_id = ? AND group_id = ? AND class = ?';
  
  db.query(query, [resId, groupId, classId], (err, results) => {
    if (err) {
      console.error('Error fetching interview popup votes:', err);
      return res.status(500).json({ error: 'Failed to fetch interview popup votes' });
    }
    
    console.log(`Found ${results.length} popup vote records for candidate ${resId}`);
    
    // Return the first result or default values
    const result = results[0] || { 
      question1: 0, 
      question2: 0, 
      question3: 0, 
      question4: 0 
    };
    
    console.log('Returning popup votes:', result);
    res.json(result);
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Interview Videos API Routes

// get route for retrieving all interview videos from the database
app.get("/interview-vids", (req, res) => {
  db.query("SELECT * FROM Interview_vids", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Job Description API routes

// Gets all the stored job decriptions 
app.get("/jobs", (req, res) => {
  db.query("SELECT * FROM job_descriptions", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//Posts a new job description into the database taking in the jobs title and file path
app.post("/jobs", async (req, res) => {
  const { title, filePath } = req.body;

  if (!title || !filePath) {
    return res.status(400).json({ error: "Missing title or filePath" });
  }

  try {
    const sql = "INSERT INTO job_descriptions (title, file_path) VALUES (?, ?)";
    await db.query(sql, [title, filePath]);
    res.json({ message: "Job description added successfully!" });
  } catch (error) {
    console.error("Error inserting into DB:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Gets a specific job description by its title
app.get("/jobdes/title", (req, res) => {
  const { title } = req.query; // ✅ Extract from query, not params

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  db.query("SELECT * FROM job_descriptions WHERE title = ?", [title], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(404).json({ error: "Job description not found" });
    }

    res.json(results[0]); // ✅ Return only the first result (assuming unique titles)
  });
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Resume(stored pdfs) API routes

//Gets all stored resumes
app.get("/resume_pdf", (req, res) => {
  const query = `
    SELECT 
      r.id, 
      r.title, 
      r.file_path,
      c.f_name as first_name,
      c.l_name as last_name,
      c.interview
    FROM Resume_pdfs r
    LEFT JOIN Candidates c ON r.id = c.resume_id
    ORDER BY r.id DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//Posts a new resume into the database as long as it's given the resume title and the file path
app.post("/resume_pdf", (req, res) => {
  const { resTitle, filePath, f_name, l_name, vid } = req.body;

  if (!resTitle || !filePath || !f_name || !l_name || !vid) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // First, insert into Resume_pdfs table
  const resumeSql = "INSERT INTO Resume_pdfs (title, file_path) VALUES (?, ?)";
  db.query(resumeSql, [resTitle, filePath], (err, resumeResult) => {
    if (err) {
      console.error("Error inserting resume:", err);
      
      // Handle duplicate entry error specifically
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ 
          error: "A resume with this title already exists. Please choose a different title." 
        });
      }
      
      return res.status(500).json({ error: "Database error" });
    }

    const resumeId = resumeResult.insertId;

    // Then, insert into Candidates table
    const candidateSql = "INSERT INTO Candidates (resume_id, interview, f_name, l_name) VALUES (?, ?, ?, ?)";
    db.query(candidateSql, [resumeId, vid, f_name, l_name], (err2, candidateResult) => {
      if (err2) {
        console.error("Error inserting candidate:", err2);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ 
        message: "Resume and candidate added successfully!",
        resumeId: resumeId
      });
    });
  });
});


//Deletes a stored resume as long as it's given the resumes file path
app.delete("/resume_pdf/:file_path", (req, res) => {
  const { file_path } = req.params;
  db.query("DELETE FROM Resume_pdfs WHERE file_path = ?", [file_path], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Resume deleted successfully" });
  });
}
);

app.get('/resume_pdf/resumes/:fileName', (req, res) => {
  const { fileName } = req.params;
  const fullPath = path.join(__dirname, 'uploads', 'resumes', fileName);
  console.log('Serving resume file:', fullPath);

  if (fs.existsSync(fullPath)) {
    return res.sendFile(fullPath);
  } else {
    return res.status(404).json({ error: `Resume not found: ${fileName}` });
  }
});

//Deletes a stored resume as long as it's given the resumes file path
app.get("/resume_pdf/id/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM Resume_pdfs WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
}
);


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Moderator Sign in
app.post('/moderator-login', (req, res) => {
  const { username, password } = req.body;
    console.log(process.env.MODERATOR_USERNAME);
    console.log(process.env.MODERATOR_PASSWORD);
  if (
    username === process.env.MODERATOR_USERNAME &&
    password === process.env.MODERATOR_PASSWORD
  ) {
    // Set session/cookie/token as needed
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Moderator table

app.post("/moderator-crns", (req, res) => {
  const { admin_email, crn } = req.body;
  if (!admin_email || !crn) {
    return res.status(400).json({ error: "admin_email and nom_groups are required" });
  }
  db.query(
    "INSERT INTO Moderator (admin_email, crn) VALUES (?, ?)",
    [admin_email, crn],
    (err, result) => {
      if (err) {
        console.log("Database error:", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "CRN already exists" });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ admin_email, crn });
    }
  );
  console.log(`Added CRN ${crn} for admin ${admin_email}`);
});

app.get("/moderator-crns", (req, res) => {
  db.query("SELECT * FROM Moderator", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    console.log("/moderator-crns", results);
    res.json(results);
  });
});

app.delete("/moderator-crns/:crn", (req, res) => {
  const { crn } = req.params;
  console.log("Deleting CRN:", crn);
  db.query("DELETE FROM Moderator WHERE crn = ?", [crn], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "CRN not found" });
    }
    res.json({ success: true });
  });
});

app.get("/moderator-crns/:crn", (req, res) => {
  const { crn } = req.params;
  console.log("Fetching CRN:", crn);
  db.query("SELECT * FROM Moderator WHERE crn = ?", [crn], (err, results) => {
    if (err) {
      console.error("Database error in /moderator-crns/:crn:", err);
      return res.status(500).json({ error: err.message });
    }
    console.log("Results for /moderator-crns/:crn:", results);
    res.json(results[0]);
  });
});

app.get("/moderator-classes/:email", (req, res) => {
  const { email } = req.params;
  db.query(
    "SELECT crn FROM Moderator WHERE admin_email = ?", [email], (err, results) => {
      if (err) {
        console.error("Database error in /moderator-classes/:email:", err);
        return res.status(500).json({ error: err.message });
      }
      console.log("Results for /moderator-classes/:email:", results);
      res.json(results.map(row => row.crn));
    }
  );
});

app.get("/moderator-classes-full/:email", (req, res) => {
  const { email } = req.params;
  db.query(
    "SELECT * FROM Moderator WHERE admin_email = ?", [email], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Canidates API routes

// Add this route to get candidates being interviewed by specific groups
app.get('/candidates-by-groups/:classId/:groupIds', (req, res) => {
  const { classId, groupIds } = req.params;
  const groupIdArray = groupIds.split(',');
  
  console.log(`Fetching candidates being interviewed by groups ${groupIds} in class ${classId}`);
  
  const placeholders = groupIdArray.map(() => '?').join(',');
  
  const query = `
    SELECT DISTINCT 
      c.resume_id as id, 
      c.f_name, 
      c.l_name, 
      c.resume_id,
      r.title
    FROM Candidates c
    INNER JOIN Resume_pdfs r ON c.resume_id = r.id
    INNER JOIN Resume res ON res.resume_number = c.resume_id
    INNER JOIN Users u ON res.student_id = u.id
    WHERE u.class = ? 
      AND u.group_id IN (${placeholders})
      AND res.checked = 1
    ORDER BY c.f_name, c.l_name
  `;
  
  const params = [classId, ...groupIdArray];
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching candidates by groups:', err);
      return res.status(500).json({ error: 'Failed to fetch candidates' });
    }
    
    console.log(`Found ${results.length} candidates being interviewed by groups ${groupIds} in class ${classId}`);
    res.json(results);
  });
});

// Add this route to fetch candidates by class
app.get('/candidates-by-class/:classId', (req, res) => {
  const { classId } = req.params;
  
  console.log(`Fetching candidates for class ${classId}`);
  
  const query = `
    SELECT DISTINCT 
      c.resume_id as id, 
      c.f_name, 
      c.l_name, 
      c.resume_id,
      r.title
    FROM Candidates c
    INNER JOIN Resume_pdfs r ON c.resume_id = r.id
    INNER JOIN Resume res ON res.resume_number = c.resume_id
    INNER JOIN Users u ON res.student_id = u.id
    WHERE u.class = ?
    ORDER BY c.f_name, c.l_name
  `;
  
  db.query(query, [classId], (err, results) => {
    if (err) {
      console.error('Error fetching candidates by class:', err);
      return res.status(500).json({ error: 'Failed to fetch candidates' });
    }
    
    console.log(`Found ${results.length} candidates for class ${classId}`);
    res.json(results);
  });
});

// get route for retrieving all candidates from the database
app.get("/canidates", (req, res) => {
  db.query("SELECT * FROM Candidates", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//get route to get a list canidates by their ids
app.get("/canidates/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM Candidates WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

//get route to get a list canidates by their ids
app.get("/canidates/resume/:resume_number", (req, res) => {
  const { resume_number } = req.params;
  db.query("SELECT * FROM Candidates WHERE resume_id = ?", [resume_number], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Teacher

app.post("/teacher/add-student", (req, res) => {
  const { class_id, group_id, email, f_name, l_name } = req.body;
  db.query(
    "INSERT INTO Users (email, f_name, l_name, class, group_id, affiliation) VALUES (?, ?, ?, ?, ?, 'student') ON DUPLICATE KEY UPDATE group_id = ?, class = ?, f_name = ?, l_name = ?",
    [email, f_name, l_name, class_id, group_id, group_id, class_id, f_name, l_name],
    (err, result) => {
      if (err) { 
        console.log("Database error:", err);
        return res.status(500).json({ error: err.message });
    }
      res.json({ success: true });
    }
  );
});

app.delete("/teacher/del-student", (req, res) => {
  const { email } = req.body;
  db.query(
    "DELETE FROM Users WHERE email = ?",
    [email],
    (err, result) => {
      if (err) { 
        console.log("Database error:", err);
        return res.status(500).json({ error: err.message });
    }
      res.json({ success: true });
    }
  );
});

// Update the number of groups for a class (CRN)
app.post("/teacher/update-groups", (req, res) => {
  const { crn, nom_groups } = req.body;

  if (!crn || !nom_groups) {
    return res.status(400).json({ error: "crn and nom_groups are required" });
  }
  
  console.log('Updating groups for CRN:', crn, 'to', nom_groups, 'groups');

  // First, check if groups already exist for this CRN
  db.query('SELECT COUNT(*) as group_count FROM `Groups` WHERE class_id = ?', [crn], (err, result) => {
    if (err) {
      console.error('Error checking existing groups:', err);
      return res.status(500).json({ error: 'Failed to check existing groups' });
    }

    const existingGroupCount = result[0].group_count;
    console.log(`Found ${existingGroupCount} existing groups for CRN ${crn}`);

    if (existingGroupCount > 0) {
      console.log(`Groups already exist for CRN ${crn}. Cannot update group count.`);
      return res.status(400).json({ 
        error: "Groups already exist for this class. Cannot update group count after groups have been created.",
        existing_groups: existingGroupCount,
        crn: crn
      });
    }

    // No existing groups found, proceed with updating the Moderator table
    console.log(`No existing groups found for CRN ${crn}. Proceeding with update.`);
    
    db.query(
      "UPDATE Moderator SET nom_groups = ? WHERE crn = ?",
      [nom_groups, crn],
      (err, result) => {
        if (err) {
          console.error("Database error in /teacher/update-groups:", err);
          return res.status(500).json({ error: err.message });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "CRN not found" });
        }
        
        console.log(`Successfully updated group count for CRN ${crn} to ${nom_groups} groups`);
        res.json({ 
          success: true, 
          crn, 
          nom_groups,
          message: `Group count updated to ${nom_groups} for CRN ${crn}`
        });
      }
    );
  });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Progress

// Get progress by group
app.get("/progress/group/:crn/:group_id", (req, res) => {
  const { crn, group_id } = req.params;
  
  db.query(
    "SELECT * FROM Progress WHERE crn = ? AND group_id = ?",
    [crn, group_id],
    (err, results) => {
      if (err) {
        console.error("Error fetching group progress:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    }
  );
});

// Get progress by email
app.get("/progress/user/:email", (req, res) => {
  const { email } = req.params;
  
  db.query(
    "SELECT * FROM Progress WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        console.error("Error fetching user progress:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results[0] || null);
    }
  );
});

// Post/Update progress
app.post("/progress", (req, res) => {
  const { crn, group_id, step, email } = req.body;

  if (!crn || !group_id || !step || !email) {
    return res.status(400).json({ 
      error: "crn, group_id, step, and email are required" 
    });
  }

  // Insert or update progress
  db.query(
    `INSERT INTO Progress (crn, group_id, step, email) 
     VALUES (?, ?, ?, ?) 
     ON DUPLICATE KEY UPDATE step = VALUES(step)`,
    [crn, group_id, step, email],
    (err, result) => {
      if (err) {
        console.error("Error updating progress:", err);
        return res.status(500).json({ error: err.message });
      }

      // Emit socket event to update group members
      io.to(`group_${group_id}_class_${crn}`).emit("progressUpdated", {
        crn,
        group_id,
        step,
        email
      });

      res.json({ 
        success: true, 
        message: "Progress updated successfully" 
      });
    }
  );
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//job asssignments

app.get("/job-assignment/:groupId/:classId", (req, res) => {
  const { groupId, classId } = req.params;
  
  db.query(
    "SELECT job FROM Job_Assignment WHERE `group` = ? AND `class` = ?",
    [groupId, classId],
    (err, results) => {
      if (err) {
        console.error("Error fetching job assignment:", err);
        return res.status(500).json({ error: err.message });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: "No job assignment found for this group" });
      }
      
      res.json({ job: results[0].job });
    }
  );
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//offers

// POST - Students submit an offer
app.post("/offers", (req, res) => {
  const { group_id, class_id, candidate_id, status } = req.body;
  
  console.log("Creating new offer:", { group_id, class_id, candidate_id, status });
  
  db.query(
    "INSERT INTO Offers (group_id, class_id, candidate_id, status) VALUES (?, ?, ?, ?)",
    [group_id, class_id, candidate_id, status],
    (err, result) => {
      if (err) {
        console.error("Error creating offer:", err);
        return res.status(500).json({ error: err.message });
      }
          
      console.log("Offer created successfully:", result.insertId);
      res.json({ 
        id: result.insertId, 
        message: "Offer submitted successfully",
        offer_id: result.insertId
      });
    }
  );
});

app.get("/offers/group/:group_id/class/:class_id", (req, res) => {
  const { group_id, class_id } = req.params;
  
  console.log("Fetching pending offers for class:", class_id);
  
  const query = `SELECT * FROM Offers WHERE class_id = ? AND group_id = ?`;
  
  db.query(query, [class_id, group_id], (err, results) => {
    if (err) {
      console.error("Error fetching pending offers:", err);
      return res.status(500).json({ error: err.message });
    }
    
    res.json(results);
  });

});

app.get("/offers/class/:class_id", (req, res) => {
  const { class_id } = req.params;
  
  console.log("Fetching pending offers for class:", class_id);
  
  const query = `SELECT * FROM Offers WHERE class_id = ?`;
  
  db.query(query, [class_id], (err, results) => {
    if (err) {
      console.error("Error fetching pending offers:", err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`Found ${results.length} pending offers for class ${class_id}`);
    res.json(results);
  });
});

app.put("/offers/:offer_id", (req, res) => {
  const { offer_id } = req.params;
  const { status } = req.body;

    
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
  }
  
  db.query(
    `UPDATE Offers SET status = ? WHERE id = ?`,
    [status, offer_id],
    (err, result) => {
      if (err) {
        console.error("Error updating offer:", err);
        return res.status(500).json({ error: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Offer not found" });
      }
      
      console.log("Offer updated successfully");
      res.json({ message: "Offer updated successfully" });
    }
  );
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Seen instuctions already 
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Seen instructions already 
app.post("/user-see-dash", (req, res) => {
  console.log("=== POST /user-see-dash endpoint hit ===");
  console.log("Request body:", req.body);
  console.log("Request headers:", req.headers);
  console.log("Session ID:", req.sessionID);
  console.log("Authenticated user:", req.user);
  
  const { user_email } = req.body;

  if (!user_email) {
    console.log("❌ Validation failed: Missing user_email");
    return res.status(400).json({ error: "Email is required." });
  }

  console.log("✅ Validation passed, updating seen flag for email:", user_email);

  db.query("UPDATE Users SET `seen` = 1 WHERE email = ?", [user_email], (err, result) => {
    if (err) {
      console.error("❌ Database error in user-see-dash POST:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      return res.status(500).json({ error: "Failed to update seen." });
    }
    
    console.log("✅ Database update successful");
    console.log("Update result:", result);
    console.log("Affected rows:", result.affectedRows);
    console.log("Changed rows:", result.changedRows);
    
    if (result.affectedRows === 0) {
      console.log("⚠️ Warning: No rows affected - user email may not exist:", user_email);
    } else {
      console.log(`✅ Successfully updated seen flag for user: ${user_email}`);
    }
    
    const responseData = { message: "seen updated successfully!" };
    console.log("Sending response:", responseData);
    res.json(responseData);
  });
});

app.post("/user-get-see-dash", (req, res) => {
  console.log("=== POST /user-get-see-dash endpoint hit ===");
  console.log("Request body:", req.body);
  console.log("Request headers:", req.headers);
  console.log("Session ID:", req.sessionID);
  console.log("Authenticated user:", req.user);
  
  const { user_email } = req.body;

  if (!user_email) {
    console.log("❌ Validation failed: Missing user_email");
    return res.status(400).json({ error: "Email is required." });
  }

  console.log("✅ Validation passed, fetching seen flag for email:", user_email);

  db.query("SELECT `seen` FROM Users WHERE email = ?", [user_email], (err, result) => {
    if (err) {
      console.error("❌ Database error in user-get-see-dash:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      return res.status(500).json({ error: "Failed to obtain seen." });
    }
    
    console.log("✅ Database query successful");
    console.log("Query result:", result);
    console.log("Result length:", result.length);
    
    if (result.length === 0) {
      console.log("⚠️ Warning: No user found with email:", user_email);
      return res.status(404).json({ error: "User not found." });
    }
    
    const seenValue = result[0].seen;
    console.log(`✅ Successfully retrieved seen flag for user ${user_email}: ${seenValue}`);
    
    const responseData = { 
      message: "seen obtained successfully!",
      seen: seenValue,
      user_email: user_email
    };
    console.log("Sending response:", responseData);
    res.json(responseData);
  });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Groups API routes

// POST /teacher/create-groups
app.post('/teacher/create-groups', (req, res) => {
  const { class_id, num_groups, max_students_per_group } = req.body;
  
  console.log('Creating groups for class:', class_id);
  console.log('Number of groups:', num_groups);
  console.log('Max students per group:', max_students_per_group);
  
  if (!class_id || !num_groups || !max_students_per_group) {
    return res.status(400).json({ 
      error: 'Missing required fields: class_id, num_groups, max_students_per_group' 
    });
  }

  // First, delete existing groups for this class - FIXED: Added backticks around Groups
  db.query('DELETE FROM `Groups` WHERE class_id = ?', [class_id], (err, result) => {
    if (err) {
      console.error('Error deleting existing groups:', err);
      return res.status(500).json({ error: 'Failed to clear existing groups' });
    }

    // Create new groups - FIXED: Added backticks around Groups
    const groupInserts = [];
    for (let i = 1; i <= num_groups; i++) {
      groupInserts.push([class_id, i, max_students_per_group]);
    }

    const insertQuery = 'INSERT INTO `Groups` (class_id, group_number, max_students) VALUES ?';
    
    db.query(insertQuery, [groupInserts], (err, result) => {
      if (err) {
        console.error('Error creating groups:', err);
        return res.status(500).json({ error: 'Failed to create groups' });
      }

      // Update the Moderator table with the new number of groups - FIXED: Use Moderator table
      db.query('UPDATE `Moderator` SET nom_groups = ? WHERE crn = ?', [num_groups, class_id], (updateErr, updateResult) => {
        if (updateErr) {
          console.error('Error updating class group count:', updateErr);
          // Groups were created successfully, so we'll return success even if class update fails
        }

        console.log(`Successfully created ${num_groups} groups for class ${class_id}`);
        res.json({ 
          message: 'Groups created successfully',
          groups_created: num_groups,
          max_students_per_group: max_students_per_group
        });
      });
    });
  });
});

// GET /class-info/:classId - FIXED: Updated to use Moderator table and Groups table
app.get('/class-info/:classId', (req, res) => {
  const { classId } = req.params;
  
  console.log('Fetching class info for:', classId);
  
  const query = `
    SELECT 
      m.crn,
      m.nom_groups,
      COALESCE(g.max_students, 4) as slots_per_group
    FROM Moderator m
    LEFT JOIN \`Groups\` g ON m.crn = g.class_id
    WHERE m.crn = ?
    LIMIT 1
  `;
  
  db.query(query, [classId], (err, result) => {
    if (err) {
      console.error('Error fetching class info:', err);
      return res.status(500).json({ error: 'Failed to fetch class information' });
    }
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    console.log('Class info result:', result[0]);
    res.json(result[0]);
  });
});

// POST /student/join-group - FIXED: Added backticks around Groups
app.post('/student/join-group', (req, res) => {
  const { email, class_id, group_id } = req.body;
  
  console.log('Student joining group:', { email, class_id, group_id });
  
  if (!email || !class_id || !group_id) {
    return res.status(400).json({ 
      error: 'Missing required fields: email, class_id, group_id' 
    });
  }

  // First check if the group has space - FIXED: Added backticks and used correct column names
  const checkCapacityQuery = `
    SELECT 
      g.max_students,
      COUNT(u.email) as current_students
    FROM \`Groups\` g
    LEFT JOIN Users u ON u.group_id = g.group_number AND u.class = g.class_id
    WHERE g.class_id = ? AND g.group_number = ?
    GROUP BY g.max_students
  `;
  
  db.query(checkCapacityQuery, [class_id, group_id], (err, capacityResult) => {
    if (err) {
      console.error('Error checking group capacity:', err);
      return res.status(500).json({ error: 'Failed to check group capacity' });
    }
    
    if (capacityResult.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const { max_students, current_students } = capacityResult[0];
    
    if (current_students >= max_students) {
      return res.status(400).json({ 
        error: 'Group is full',
        current_students: current_students,
        max_students: max_students
      });
    }
    
    // Update the user's group assignment - FIXED: Use correct column names
    const updateQuery = 'UPDATE Users SET group_id = ? WHERE email = ? AND class = ?';
    
    db.query(updateQuery, [group_id, email, class_id], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('Error assigning student to group:', updateErr);
        return res.status(500).json({ error: 'Failed to join group' });
      }
      
      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: 'Student not found in this class' });
      }
      
      console.log(`Student ${email} successfully joined group ${group_id} in class ${class_id}`);
      res.json({ 
        message: 'Successfully joined group',
        group_id: group_id,
        class_id: class_id
      });
    });
  });
});

// GET /group-slots/:classId - FIXED: Added backticks and used correct column names
app.get('/group-slots/:classId', (req, res) => {
  const { classId } = req.params;
  
  console.log('Fetching group slots for class:', classId);
  
  const query = `
    SELECT 
      g.group_number,
      g.max_students,
      COUNT(u.email) as occupied_slots,
      JSON_ARRAYAGG(
        CASE 
          WHEN u.email IS NOT NULL 
          THEN JSON_OBJECT(
            'f_name', u.f_name, 
            'l_name', u.l_name, 
            'email', u.email
          )
          ELSE NULL 
        END
      ) as students
    FROM \`Groups\` g
    LEFT JOIN Users u ON u.group_id = g.group_number AND u.class = g.class_id
    WHERE g.class_id = ?
    GROUP BY g.group_number, g.max_students
    ORDER BY g.group_number
  `;
  
  db.query(query, [classId], (err, result) => {
    if (err) {
      console.error('Error fetching group slots:', err);
      return res.status(500).json({ error: 'Failed to fetch group slots' });
    }
    
    // Process the result to clean up the students array
    const processedResult = result.map(group => ({
      group_id: group.group_number,
      max_slots: group.max_students,
      occupied_slots: group.occupied_slots,
      students: group.students ? group.students.filter(student => student !== null) : []
    }));
    
    console.log('Group slots result:', processedResult);
    res.json(processedResult);
  });
});

// GET /groups (update existing) - FIXED: Added backticks and used correct column names
app.get('/groups', (req, res) => {
  const { class: classId } = req.query;
  
  if (!classId) {
    return res.status(400).json({ error: 'Class ID is required' });
  }
  
  const query = `
    SELECT 
      g.group_number,
      g.max_students,
      COUNT(u.email) as student_count
    FROM \`Groups\` g
    LEFT JOIN Users u ON u.group_id = g.group_number AND u.class = g.class_id
    WHERE g.class_id = ?
    GROUP BY g.group_number, g.max_students
    ORDER BY g.group_number
  `;
  
  db.query(query, [classId], (err, result) => {
    if (err) {
      console.error('Error fetching groups:', err);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }
    
    // Convert to the format your frontend expects
    const groupsObject = {};
    result.forEach(group => {
      groupsObject[group.group_number] = {
        max_students: group.max_students,
        student_count: group.student_count
      };
    });
    
    res.json(groupsObject);
  });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Various

// ✅ Serve Uploaded Files
app.use("/uploads", express.static(path.join(__dirname, "uploads/")));

//Initializes the server and database connection
initializeApp().catch(error => {
  console.error("Failed to initialize app:", error);
  process.exit(1);
});