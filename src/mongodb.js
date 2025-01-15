const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/LoginSignUp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("MongoDB connected successfully!"))
    .catch((error) => {
        console.error("MongoDB connection error:", error.message);
        console.error(error);
    });

// Schema for the Login and SignUp functionality
const LogInSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    rollno: {
        type: String,
        required: true
    },
    class: {
        type: String,
        required: true
    }
});

// Creating a model for the login collection
const collection = mongoose.model("LoginCollection", LogInSchema);

// Schema for the Teacher
const TeacherSchema = new mongoose.Schema({
    name: {
        type: String,
        unique:true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    employeeId: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    }
});

// Creating a model for the teacher collection
const Teacher = mongoose.model("Teacher", TeacherSchema);

// Schema for the OD Request functionality
const ODRequestSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true
    },
    eventStartDate: {
        type: Date,
        required: true
    },
    eventEndDate: {
        type: Date,
        required: true
    },
    eventLocation: {
        type: String,
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    studentId: {
        type: String,
        required: true
    },
    studentClass: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "Pending"
    }
});

// Creating a model for the OD Request collection
const ODRequestCollection = mongoose.model("ODRequest", ODRequestSchema);

// Schema for the Post On Duty functionality
const PostOnDutySchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    studentId: { type: String, required: true },
    eventName: { type: String, required: true },
    collegeName: { type: String, required: true },
    date: { type: Date, required: true },
    certificate: { type: String, required: true }, // Store file path or URL
    totalSAP: { type: Number, required: true },
    remainingSAP: { type: Number, required: true },
});

// Creating a model for the Post On Duty collection
const PostOnDuty = mongoose.model("PostOnDuty", PostOnDutySchema);

// Exporting the collections for use in other files
module.exports = { 
    collection, 
    ODRequestCollection, 
    Teacher, 
    PostOnDuty
};
