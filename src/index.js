const express = require("express");
const path = require("path");
const hbs = require("hbs");
const mongoose = require("mongoose");
const session = require("express-session");
const bodyParser = require('body-parser');
const { collection, ODRequestCollection, Teacher, PostOnDuty } = require("./mongodb"); // Import models

const app = express();

app.use(bodyParser.json());  // For parsing JSON data
app.use(bodyParser.urlencoded({ extended: true }));
// Set up paths for views and static files
const templatesPath = path.join(__dirname, "../templates");
app.set("view engine", "hbs");
app.set("views", templatesPath);

// Serve static files (e.g., CSS)
app.use(express.static(path.join(__dirname, "public")));

// Body parsing middleware for POST requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: "your_secret_key", // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
  })
);

// Register custom helper
hbs.registerHelper("formatDate", function (date) {
  return new Date(date).toLocaleString();
});

// Route to handle event-based requests
app.get('/event-based-request', async (req, res) => {
  try {
    const { location, date } = req.query; // Get location and date from query parameters

    // Validate query parameters
    if (!location || !date) {
      return res.status(400).json({ message: "Please provide event location and date." });
    }

    // Parse the input date
    const eventDate = new Date(date);

    // Ensure valid date format
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    // Adjust query to match your database structure
    const requests = await ODRequestCollection.find({
      eventLocation: location,
      eventStartDate: { 
        $gte: new Date(eventDate.setUTCHours(0, 0, 0, 0)), // Start of the day
        $lte: new Date(eventDate.setUTCHours(23, 59, 59, 999)) // End of the day
      }
    }).select('studentName studentId'); // Fetch only required fields

    // Handle no matching requests
    if (requests.length === 0) {
      return res.status(404).json({ message: "No requests found for this event on the given date." });
    }

    // Respond with the list of requests
    res.json({
      message: "Requests found.",
      requests: requests.map(request => ({
        studentName: request.studentName,
        studentId: request.studentId
      }))
    });
  } catch (error) {
    console.error("Error fetching event-based requests:", error);
    res.status(500).json({ message: "An error occurred while fetching the event-based requests." });
  }
});


// Route to render the front page
app.get("/front_page", (req, res) => {
  res.render("front_page"); // Render front_page.hbs
});

// Route for student login page
app.get("/student-login", (req, res) => {
  res.render("student-login"); // Render student-login.hbs
});

// Route for student signup page
app.get("/signup", (req, res) => {
  res.render("signup"); // Render signup.hbs
});

// Route for teacher login page
app.get("/teacher_login", (req, res) => {
  res.render("teacher_login"); // Render teacher-login.hbs
});

// Route for teacher signup page
app.get("/signup1", (req, res) => {
  res.render("signup1"); // Render teacher-signup.hbs
});

// Route for posting an OD request
app.get("/post_onduty", (req, res) => {
  res.render("post_onduty");  // This should render the 'post_onduty.hbs' template
});

// Render teacher dashboard with OD requests
app.get("/teacher-dashboard", async (req, res) => {
  try {
    const requests = await ODRequestCollection.find();
    console.log("Fetched OD Requests for Teacher's Dashboard:", requests);
    res.render("teacher-dashboard", { requests });
  } catch (error) {
    console.error("Error fetching OD requests for dashboard:", error);
    res.render("teacher-dashboard", { requests: [], errorMessage: "Failed to load OD requests." });
  }
});

// Render the OD request page
app.get("/odrequest", (req, res) => {
  if (req.session.user) {
    res.render("odrequest", {
      name: req.session.user.name,
      rollno: req.session.user.rollno,
      class: req.session.user.class,
    });
  } else {
    res.redirect("/student-login"); // Redirect to login if no session exists
  }
});

app.get("/post_onduty", (req, res) => {
  if (req.session.user) {
    res.render("post_onduty", {
      name: req.session.user.name,
      rollno: req.session.user.rollno,
      class: req.session.user.class,
    });
  } else {
    res.redirect("/student-login"); // Redirect to login if no session exists
  }
});
// Render previous OD requests page
app.get("/previous_od", async (req, res) => {
  try {
    const requests = await ODRequestCollection.find(); // Fetch OD requests from the database
    res.render("previous_od", { requests });
  } catch (error) {
    console.error("Error fetching OD requests:", error);
    res.render("previous_od", { requests: [], errorMessage: "Failed to load OD requests." });
  }
});

// Handle teacher login
app.post("/teacher_login", async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ name: req.body.name });
    if (teacher && teacher.password === req.body.password) {
      res.render("teacher-dashboard", {
        name: teacher.name,
        employeeId: teacher.employeeId,
        department: teacher.department,
      });
    } else {
      res.send("Incorrect credentials");
    }
  } catch (error) {
    console.error("Login error:", error);
    res.send("Login failed. Please try again.");
  }
});

// Handle student login
app.post("/student-login", async (req, res) => {
  try {
    const student = await collection.findOne({ name: req.body.name });
    if (student && student.password === req.body.password) {
      req.session.user = {
        name: student.name,
        rollno: student.rollno,
        class: student.class,
      };
      res.render("home", {
        name: req.session.user.name,
        rollno: req.session.user.rollno,
        class: req.session.user.class,
      });
    } else {
      res.send("Incorrect credentials");
    }
  } catch (error) {
    console.error("Login error:", error);
    res.send("Error logging in.");
  }
});

app.post("/signup1", async (req, res) => {
  try {
    const { name, password, employeeId, department } = req.body;

    // Check if the username already exists
    const existingTeacher = await Teacher.findOne({ name: name });
    if (existingTeacher) {
      // Render the signup1 page with an error message
      return res.render("signup1", {
        error: "Username already exists. Please choose a different username.",
      });
    }

    // If no conflict, proceed to create the teacher account
    const data = {name,password,employeeId,department,
};

    // Save the new teacher in the database
    await Teacher.create(data);

    // Render the teacher dashboard with the new teacher's details
    res.render("teacher-dashboard", {
      name: data.name,
      employeeId: data.employeeId,
      department: data.department,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.render("signup1", {
        error: "Username already exists. Please choose a different username.",
      });
    }

    console.error("Error during signup:", error);
    res.render("signup1", { error: "Signup failed. Please try again." });
  }
});

app.post("/signup", async (req, res) => {
  try {
    const { name, password, rollno, class: studentClass } = req.body;

    // Check if the username already exists
    const existingUser = await collection.findOne({name:name });
    if (existingUser) {
      return res.render("signup", {
        error: "Username already exists. Please choose a different username.",
        formData: req.body, // Pass back the form data to repopulate the form
      });
    }

    // If no conflict, proceed with creating the user
    const data = { name, password, rollno, class: studentClass };
    await collection.create(data);

    // Render the home page with the new user's details
    res.render("home", {
      name: data.name,
      rollno: data.rollno,
      class: data.class,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.render("signup", {
        error: "Username already exists. Please choose a different username.",
        formData: req.body,
      });
    }
    console.error("Error during signup:", error);
    res.render("signup", { error: "Signup failed. Please try again." });
  }
});

// Handle OD request submission
app.post("/submit-od-request", async (req, res) => {
  try {
    const { eventName, eventStartDate, eventEndDate, eventLocation, studentName, studentId, studentClass, message } = req.body;

    const newRequest = new ODRequestCollection({studentName,studentId,eventName,eventStartDate,eventEndDate,eventLocation,studentClass,message,
    });

    await newRequest.save(); // Save the request to MongoDB
    res.status(200).json({ message: "Request successfully submitted!" });
  } catch (error) {
    console.error("Error submitting request:", error);
    res.status(500).json({ error: "Failed to submit request. Try again!" });
  }
});

// View student's own OD requests
app.get("/view_od_requests", async (req, res) => {
  try {
    const studentName = req.session.user?.name;
    if (!studentName) {
      return res.redirect("/student-login");
    }
    const requests = await ODRequestCollection.find({ studentName });
    res.render("view_od_requests", { requests });
  } catch (error) {
    console.error("Error fetching OD requests:", error);
    res.render("view_od_requests", { requests: [], errorMessage: "Failed to load OD requests." });
  }
});

// Route for viewing all OD requests
app.get("/view-od-requests", async (req, res) => {
  try {
    const requests = await ODRequestCollection.find();
    res.render("view_od_requests", { requests });
  } catch (error) {
    console.error("Error fetching OD requests:", error);
    res.render("view_od_requests", { requests: [], errorMessage: "Failed to load OD requests." });
  }
});

// Update OD request status
app.post("/update-od-status", async (req, res) => {
  try {
    const { studentId, eventName, status } = req.body;
    console.log("Received data:", { studentId, eventName, status });

    const existingRecord = await ODRequestCollection.findOne({ studentId, eventName });

    if ( existingRecord.status === status) {
      return res.status(400).json({ error: "Status is already " + status });
    }

    const result = await ODRequestCollection.updateOne(
      { studentId, eventName },
      { $set: { status: status } }
    );

    console.log("Update result:", result);

    if (result.nModified > 0) {
      res.json({ message: "Status updated successfully." });
    } else {
      res.status(400).json({ error: "No matching record found or status already updated." });
    }
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "Failed to update status." });
  }
});

const upload= require("./multer/upload"); 
// Handle Post On Duty form submission
app.post('/submit-post-onduty', upload.single('certificate'), async (req, res) => {
  try {
      const { studentName, studentId, eventName, collegeName, date, totalSAP, remainingSAP } = req.body;

      // Confirm the file is being uploaded
      const certificatePath = req.file ? req.file.path.replace(/\\/g,'/'):null;
      if (!certificatePath) {
          console.log('No certificate file uploaded.');
          return res.status(400).json({ error: 'Certificate file is required!' });
      }
      console.log('Certificate file path:', certificatePath);

      // Create a new document
      const newPostOnDuty = new PostOnDuty({studentName,studentId,eventName,collegeName,date,certificate: certificatePath,totalSAP,remainingSAP,
      });

      // Save to MongoDB
      const savedDocument = await newPostOnDuty.save();
      console.log('Document saved successfully:', savedDocument);

      res.status(200).json({ message: 'Post On Duty successfully submitted!' });
  } catch (error) {
      console.error('Error submitting Post On Duty:', error.message);
      res.status(500).json({ error: 'Failed to submit Post On Duty. Try again!' });
  }
});
app.use('/uploads', express.static('uploads'));
// Fetch and display Post On Duty data for teachers
app.get("/teacher-view-postonduty", async (req, res) => {
  try {
    // Fetch all records from the PostOnDuty collection
    const postOnDutyRecords = await PostOnDuty.find();

    // Render the Handlebars view and pass the records
    res.render("teacher_view_postonduty", { records: postOnDutyRecords });
  } catch (error) {
    console.error("Error fetching Post On Duty records:", error);
    res.render("teacher_view_postonduty", {
      records: [], // Pass an empty array if an error occurs
      errorMessage: "Failed to load Post On Duty records.",
    });
  }
});

app.get('/api/teachers/postonduty', async (req, res) => {
  try {
    const records = await PostOnDuty.find();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

// Start the server
app.listen(8082, () => {
  console.log("Server running on port 8082");
});
