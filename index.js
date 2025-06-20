// const express = require('express');
// const cors = require('cors');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();
// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// const app = express();
// const port = process.env.PORT || 5000;

// // ===== Middleware =====
// app.use(cors({
//     origin: '*',
//     credentials: true
// }));
// app.use(express.json());

// // ===== MongoDB Setup with connection caching =====
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8bthues.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//     }
// });

// let cachedClient = null;
// async function connectToMongo() {
//     if (cachedClient) return cachedClient;
//     await client.connect();
//     cachedClient = client;
//     return client;
// }

// // ===== JWT Middleware =====
// const verifyToken = (req, res, next) => {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) return res.status(401).send({ message: 'Unauthorized access: No token provided' });

//     const token = authHeader.split(' ')[1];
//     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//         if (err) return res.status(403).send({ message: 'Forbidden access: Invalid token' });

//         req.user = decoded;
//         next();
//     });
// };

// async function run() {
//     try {
//         await connectToMongo();
//         const db = client.db("courseManagementDB");
//         const courseCollection = db.collection("courses");
//         const enrollmentsCollection = db.collection('enrollments');

//         // ===== Root Endpoint =====
//         app.get('/', (req, res) => {
//             res.send('🎓 Course management server is running!');
//         });

//         // ===== Generate JWT Token =====
//         app.post('/jwt', (req, res) => {
//             const user = req.body;
//             if (!user || !user.email) {
//                 return res.status(400).send({ message: 'Invalid user data for token generation' });
//             }
//             const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });
//             res.send({ token });
//         });

//         // ===== My Enrollments Route (Protected) =====
//         app.get('/my-enrollments', verifyToken, async (req, res) => {
//             const email = req.query.email;
//             if (!email) return res.status(400).send({ message: "Email query missing" });

//             if (req.user.email !== email) {
//                 return res.status(403).send({ message: "Forbidden access" });
//             }

//             try {
//                 const enrolledCourses = await enrollmentsCollection.find({ email }).toArray();
//                 res.send(enrolledCourses);
//             } catch (error) {
//                 console.error('Error fetching enrollments:', error);
//                 res.status(500).send({ message: 'Failed to fetch enrollments' });
//             }
//         });

//         // ===== Courses =====
//         app.post('/courses', async (req, res) => {
//             try {
//                 const courseData = req.body;
//                 courseData.seats = parseInt(courseData.seats) || 10;
//                 courseData.createdAt = new Date();

//                 const result = await courseCollection.insertOne(courseData);
//                 res.send({ insertedId: result.insertedId });
//             } catch (error) {
//                 console.error('Error inserting course:', error);
//                 res.status(500).send({ message: 'Failed to add course' });
//             }
//         });

//         app.get('/courses', async (req, res) => {
//             try {
//                 const result = await courseCollection.find().toArray();
//                 res.send(result);
//             } catch (error) {
//                 console.error('Error fetching courses:', error);
//                 res.status(500).send({ message: 'Failed to fetch courses' });
//             }
//         });

//         app.get('/latest-courses', async (req, res) => {
//             try {
//                 const latestCourses = await courseCollection
//                     .find()
//                     .sort({ createdAt: -1 })
//                     .limit(6)
//                     .toArray();

//                 if (!latestCourses.length) {
//                     return res.status(404).send({ message: 'No latest courses found' });
//                 }
//                 res.send(latestCourses);
//             } catch (err) {
//                 console.error('Error fetching latest courses:', err);
//                 res.status(500).send({ message: "Server error fetching latest courses" });
//             }
//         });

//         app.get('/courses/:id', async (req, res) => {
//             try {
//                 const id = req.params.id;
//                 const result = await courseCollection.findOne({ _id: new ObjectId(id) });
//                 if (!result) return res.status(404).send({ message: 'Course not found' });
//                 res.send(result);
//             } catch (error) {
//                 console.error('Error fetching course by id:', error);
//                 res.status(500).send({ message: 'Server error fetching course' });
//             }
//         });

//         app.get('/my-uploaded-courses', verifyToken, async (req, res) => {
//             const email = req.query.email;
//             if (!email) return res.status(400).send({ message: "Email query missing" });

//             if (req.user.email !== email) {
//                 return res.status(403).send({ message: 'Forbidden access' });
//             }

//             try {
//                 const userCourses = await courseCollection.find({ instructorEmail: email }).toArray();
//                 res.send(userCourses);
//             } catch (error) {
//                 console.error('Error fetching user courses:', error);
//                 res.status(500).send({ message: 'Failed to fetch user courses' });
//             }
//         });

//         // app.get('/courses-manage/:id', verifyToken, async (req, res) => {
//         //     try {
//         //         const id = req.params.id;
//         //         const userEmail = req.user.email;

//         //         const course = await courseCollection.findOne({ _id: new ObjectId(id) });
//         //         if (!course) return res.status(404).send({ message: 'Course not found' });

//         //         if (course.instructorEmail !== userEmail) {
//         //             return res.status(403).send({ message: 'Access denied: You are not the creator of this course.' });
//         //         }

//         //         res.send(course);
//         //     } catch (error) {
//         //         console.error("Error getting course:", error);
//         //         res.status(500).send({ message: 'Server error', error });
//         //     }
//         // });

//         app.put('/courses/:id', async (req, res) => {
//             try {
//                 const id = req.params.id;
//                 const updatedCourse = req.body;

//                 const result = await courseCollection.updateOne(
//                     { _id: new ObjectId(id) },
//                     {
//                         $set: {
//                             title: updatedCourse.title,
//                             shortDescription: updatedCourse.shortDescription,
//                             description: updatedCourse.description
//                         }
//                     }
//                 );
//                 if (result.matchedCount === 0) {
//                     return res.status(404).send({ message: 'Course not found' });
//                 }
//                 res.send(result);
//             } catch (error) {
//                 console.error('Error updating course:', error);
//                 res.status(500).send({ message: 'Failed to update course' });
//             }
//         });

//         app.delete('/unenroll', async (req, res) => {
//             try {
//                 const { email, courseId } = req.body;
//                 if (!email || !courseId) {
//                     return res.status(400).send({ message: "Email and courseId required" });
//                 }

//                 const result = await enrollmentsCollection.deleteOne({ email, courseId });
//                 if (result.deletedCount > 0) {
//                     res.send({ success: true, message: "Unenrolled successfully" });
//                 } else {
//                     res.status(404).send({ success: false, message: 'Enrollment not found' });
//                 }
//             } catch (error) {
//                 console.error('Error unenrolling:', error);
//                 res.status(500).send({ message: 'Failed to unenroll' });
//             }
//         });

//         app.get('/enroll-check', async (req, res) => {
//             try {
//                 const { email, courseId } = req.query;
//                 if (!email || !courseId) {
//                     return res.status(400).send({ enrolled: false, message: 'Invalid query' });
//                 }

//                 const exists = await enrollmentsCollection.findOne({ email, courseId });
//                 res.send({ enrolled: !!exists });
//             } catch (error) {
//                 console.error('Error checking enrollment:', error);
//                 res.status(500).send({ message: 'Server error' });
//             }
//         });

//         app.delete('/courses/:id', async (req, res) => {
//             try {
//                 const id = req.params.id;
//                 const result = await courseCollection.deleteOne({ _id: new ObjectId(id) });
//                 if (result.deletedCount === 0) {
//                     return res.status(404).send({ message: 'Course not found' });
//                 }
//                 res.send(result);
//             } catch (error) {
//                 console.error('Error deleting course:', error);
//                 res.status(500).send({ message: 'Failed to delete course' });
//             }
//         });

//         app.delete('/delete-enrollment/:id', async (req, res) => {
//             try {
//                 const id = req.params.id;
//                 const result = await enrollmentsCollection.deleteOne({ _id: new ObjectId(id) });
//                 if (result.deletedCount === 0) {
//                     return res.status(404).send({ message: 'Enrollment not found' });
//                 }
//                 res.send(result);
//             } catch (error) {
//                 console.error('Error deleting enrollment:', error);
//                 res.status(500).send({ message: 'Failed to delete enrollment' });
//             }
//         });

//         // ===== My Created Courses (Protected) =====
//         // app.get('/my-courses', verifyToken, async (req, res) => {
//         //     const email = req.query.email;
//         //     if (!email) return res.status(400).send({ message: "Email query missing" });

//         //     if (req.user.email !== email) {
//         //         return res.status(403).send({ message: 'Forbidden access' });
//         //     }

//         //     try {
//         //         const result = await courseCollection.find({ instructorEmail: email }).toArray();
//         //         res.send(result);
//         //     } catch (error) {
//         //         console.error('Error fetching my courses:', error);
//         //         res.status(500).send({ message: 'Failed to fetch my courses' });
//         //     }
//         // });

//         app.get('/most-enrolled', async (req, res) => {
//             try {
//                 const mostEnrolledCourses = await courseCollection
//                     .find()
//                     .sort({ enrollCount: -1 })
//                     .limit(6)
//                     .toArray();

//                 if (!mostEnrolledCourses.length) {
//                     return res.status(404).send({ message: 'No most enrolled courses found' });
//                 }
//                 res.send(mostEnrolledCourses);
//             } catch (error) {
//                 console.error('Failed to fetch most enrolled courses:', error);
//                 res.status(500).send({ message: "Failed to fetch most enrolled courses" });
//             }
//         });

//         // ===== Enroll to Course =====
//         app.post('/enroll', async (req, res) => {
//             try {
//                 const { email, courseId, title, image } = req.body;

//                 if (!email || !courseId) {
//                     return res.status(400).send({ success: false, message: 'Email and courseId required' });
//                 }

//                 // Check if already enrolled
//                 const alreadyEnrolled = await enrollmentsCollection.findOne({ email, courseId });
//                 if (alreadyEnrolled) {
//                     return res.status(400).send({ success: false, message: 'You are already enrolled in this course.' });
//                 }

//                 // Check user limit
//                 const activeEnrollmentsCount = await enrollmentsCollection.countDocuments({ email });
//                 if (activeEnrollmentsCount >= 3) {
//                     return res.status(400).send({ success: false, message: 'You can only enroll in up to 3 courses at a time.' });
//                 }

//                 // Find course
//                 const course = await courseCollection.findOne({ _id: new ObjectId(courseId) });
//                 if (!course) {
//                     return res.status(404).send({ success: false, message: 'Course not found.' });
//                 }

//                 // Check seat availability
//                 const currentEnrollCount = await enrollmentsCollection.countDocuments({ courseId });
//                 if (currentEnrollCount >= course.seats) {
//                     return res.status(400).send({ success: false, message: 'No seats left in this course.' });
//                 }

//                 // Enroll
//                 const enrollmentData = {
//                     email,
//                     courseId,
//                     title,
//                     image,
//                     date: new Date(),
//                 };

//                 const result = await enrollmentsCollection.insertOne(enrollmentData);

//                 if (result.insertedId) {
//                     await courseCollection.updateOne(
//                         { _id: new ObjectId(courseId) },
//                         { $inc: { enrollCount: 1 } }
//                     );

//                     return res.send({ success: true, insertedId: result.insertedId });
//                 } else {
//                     return res.status(500).send({ success: false, message: 'Failed to enroll.' });
//                 }
//             } catch (error) {
//                 console.error('Enroll Error:', error);
//                 res.status(500).send({ success: false, message: 'Server error', error: error.message });
//             }
//         });

//         app.get('/courses/:id/seats-left', async (req, res) => {
//             try {
//                 const courseId = req.params.id;
//                 const course = await courseCollection.findOne({ _id: new ObjectId(courseId) });
//                 if (!course) {
//                     return res.status(404).send({ message: 'Course not found' });
//                 }

//                 const enrolledCount = await enrollmentsCollection.countDocuments({ courseId });
//                 const seatsLeft = course.seats - enrolledCount;

//                 res.send({ seatsLeft });
//             } catch (err) {
//                 console.error('Seats Left Error:', err);
//                 res.status(500).send({ message: 'Server error' });
//             }
//         });

//     } catch (err) {
//         console.error('MongoDB Run Error:', err);
//     }
// }

// // ===== Start Server =====
// run().catch(console.dir);
// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });








// ===== Setup & Required Packages =====
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// ===== Middleware =====
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ===== MongoDB Setup =====
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8bthues.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// ===== JWT Middleware =====
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send({ message: 'Unauthorized: No token' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).send({ message: 'Forbidden: Invalid token' });
        req.user = decoded;
        next();
    });
};

// ===== Main Async Function =====
async function run() {
    try {
        await client.connect();
        console.log("✅ MongoDB Connected");

        const db = client.db("courseManagementDB");
        const courseCollection = db.collection("courses");
        const enrollmentsCollection = db.collection("enrollments");

        // ===== Root Route =====
        app.get("/", (req, res) => {
            res.send("🎓 Course management server is running!");
        });

        // ===== JWT Token Generator =====
        app.post("/jwt", (req, res) => {
            const user = req.body;
            if (!user?.email) return res.status(400).send({ message: "Invalid user data" });

            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.send({ token });
        });

        // ===== Course Routes =====
        app.get("/courses", async (req, res) => {
            const result = await courseCollection.find().toArray();
            res.send(result);
        });

        app.post("/courses", async (req, res) => {
            const course = req.body;
            course.seats = parseInt(course.seats) || 10;
            course.createdAt = new Date();
            const result = await courseCollection.insertOne(course);
            res.send({ insertedId: result.insertedId });
        });

        app.get("/courses/:id", async (req, res) => {
            const id = req.params.id;
            const result = await courseCollection.findOne({ _id: new ObjectId(id) });
            if (!result) return res.status(404).send({ message: "Course not found" });
            res.send(result);
        });

        app.put("/courses/:id", async (req, res) => {
            const id = req.params.id;
            const update = req.body;
            const result = await courseCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: update }
            );
            res.send(result);
        });

        app.delete("/courses/:id", async (req, res) => {
            const id = req.params.id;
            const result = await courseCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.get("/latest-courses", async (req, res) => {
            const latest = await courseCollection.find().sort({ createdAt: -1 }).limit(6).toArray();
            res.send(latest);
        });

        app.get("/most-enrolled", async (req, res) => {
            const topCourses = await courseCollection.find().sort({ enrollCount: -1 }).limit(6).toArray();
            res.send(topCourses);
        });

        app.get("/courses/:id/seats-left", async (req, res) => {
            const courseId = req.params.id;
            const course = await courseCollection.findOne({ _id: new ObjectId(courseId) });
            const enrolled = await enrollmentsCollection.countDocuments({ courseId });
            const seatsLeft = course.seats - enrolled;
            res.send({ seatsLeft });
        });

        // ===== Enrollment Routes =====
        app.post("/enroll", async (req, res) => {
            const { email, courseId, title, image } = req.body;
            if (!email || !courseId) return res.status(400).send({ message: "Invalid input" });

            const already = await enrollmentsCollection.findOne({ email, courseId });
            if (already) return res.status(400).send({ message: "Already enrolled" });

            const count = await enrollmentsCollection.countDocuments({ email });
            if (count >= 3) return res.status(400).send({ message: "Max 3 enrollments allowed" });

            const course = await courseCollection.findOne({ _id: new ObjectId(courseId) });
            const enrolledCount = await enrollmentsCollection.countDocuments({ courseId });
            if (enrolledCount >= course.seats) {
                return res.status(400).send({ message: "No seats left" });
            }

            const result = await enrollmentsCollection.insertOne({
                email,
                courseId,
                title,
                image,
                date: new Date()
            });

            await courseCollection.updateOne(
                { _id: new ObjectId(courseId) },
                { $inc: { enrollCount: 1 } }
            );

            res.send({ insertedId: result.insertedId });
        });

        app.get("/enroll-check", async (req, res) => {
            const { email, courseId } = req.query;
            const found = await enrollmentsCollection.findOne({ email, courseId });
            res.send({ enrolled: !!found });
        });

        app.get("/my-enrollments", verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.user.email !== email) return res.status(403).send({ message: "Forbidden" });

            const result = await enrollmentsCollection.find({ email }).toArray();
            res.send(result);
        });

        app.delete("/unenroll", async (req, res) => {
            const { email, courseId } = req.body;
            const result = await enrollmentsCollection.deleteOne({ email, courseId });
            res.send(result);
        });

        app.delete("/delete-enrollment/:id", async (req, res) => {
            const id = req.params.id;
            const result = await enrollmentsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.get("/my-uploaded-courses", verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.user.email !== email) return res.status(403).send({ message: "Forbidden" });

            const result = await courseCollection.find({ instructorEmail: email }).toArray();
            res.send(result);
        });

        // ✅ Start server only after DB success
        app.listen(port, () => {
            console.log(`🚀 Server is running on port ${port}`);
        });

    } catch (err) {
        console.error("❌ Server failed to start:", err);
        process.exit(1);
    }
}

run();
