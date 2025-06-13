const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// ===== Middleware =====
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());

// ===== MongoDB Setup =====
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8bthues.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
console.log("JWT_SECRET from env:", process.env.JWT_SECRET);

// ===== ✅ JWT Middleware =====
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send({ message: 'unauthorized access' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).send({ message: 'forbidden access' });

        // ✅ Fixed: use req.user instead of req.decoded
        req.user = decoded;
        next();
    });
};

async function run() {
    try {
        await client.connect();
        const db = client.db("courseManagementDB");
        const courseCollection = db.collection("courses");
        const enrollmentsCollection = db.collection('enrollments');

        // ===== Root Endpoint =====
        app.get('/', (req, res) => {
            res.send('🎓 Course management server is running!');
        });

        // ===== ✅ Generate JWT Token =====
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log("JWT user payload:", user);
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.send({ token });
        });

        // ===== ✅ My Enrollments Route (Protected) =====
        app.get('/my-enrollments', verifyToken, async (req, res) => {
            const email = req.query.email;


            if (req.user.email !== email) {
                return res.status(403).send({ message: "Forbidden access" });
            }

            const enrolledCourses = await enrollmentsCollection.find({ email }).toArray();
            res.send(enrolledCourses);
        });

        // ===== Courses =====
        app.post('/courses', async (req, res) => {
            try {
                const courseData = req.body;
                courseData.seats = parseInt(courseData.seats) || 10;
                courseData.createdAt = new Date();

                const result = await courseCollection.insertOne(courseData);
                res.send({ insertedId: result.insertedId });
            } catch (error) {
                console.error('Error inserting course:', error);
                res.status(500).send({ message: 'Failed to add course' });
            }
        });

        app.get('/courses', async (req, res) => {
            const result = await courseCollection.find().toArray();
            res.send(result);
        });

        app.get('/latest-courses', async (req, res) => {
            try {
                const latestCourses = await courseCollection
                    .find()
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .toArray();
                res.send(latestCourses);
            } catch (err) {
                console.error('Error fetching latest courses:', err);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.get('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const result = await courseCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.get('/my-uploaded-courses', verifyToken, async (req, res) => {
            const email = req.query.email;

            console.log("👉 Email received from frontend:", email);

            if (req.user.email !== email) {
                return res.status(403).send({ message: 'Forbidden access' });
            }

            // const userCourses = await courseCollection.find({ email }).toArray();
            const userCourses = await courseCollection.find({ instructorEmail: email }).toArray();
            res.send(userCourses);
        });


        app.get('/courses-manage/:id', verifyToken, async (req, res) => {
            try {
                const id = req.params.id;
                const userEmail = req.user.email;

                const course = await courseCollection.findOne({ _id: new ObjectId(id) });

                if (!course) {
                    return res.status(403).send({ message: 'course not found' });
                }

                if (course.email !== userEmail) {
                    return res.status(403).send({ message: 'Access denied: You are not the creator of this course.' })
                }

                res.send(course);
            } catch (error) {
                console.error("Error getting course:", error);
                res.status(500).send({ message: 'Server error', error });
            }
        })

        app.put('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const updatedCourse = req.body;

            const result = await courseCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        title: updatedCourse.title,
                        shortDescription: updatedCourse.shortDescription,
                        description: updatedCourse.description
                    }
                }
            );
            res.send(result);
        });

        app.delete('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const result = await courseCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.delete('/delete-enrollment/:id', async (req, res) => {
            const id = req.params.id;
            const result = await enrollmentsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        // =====  My Created Courses (Protected) =====
        app.get('/my-courses', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.user.email !== email) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const result = await courseCollection.find({ email }).toArray();
            res.send(result);
        });

        app.get('/most-enrolled', async (req, res) => {
            try {
                const mostEnrolledCourses = await courseCollection
                    .find()
                    .sort({ enrollCount: -1 })
                    .limit(6)
                    .toArray();

                res.send(mostEnrolledCourses);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch", error });
            }
        });


        // ===== Enroll to Course =====
        app.post('/enroll', async (req, res) => {
            try {
                const { email, courseId, title, image } = req.body;

                // Check if already enrolled
                const alreadyEnrolled = await enrollmentsCollection.findOne({ email, courseId });
                if (alreadyEnrolled) {
                    return res.status(400).send({ success: false, message: 'You are already enrolled in this course.' });
                }

                // Check user limit
                const activeEnrollmentsCount = await enrollmentsCollection.countDocuments({ email });
                if (activeEnrollmentsCount >= 3) {
                    return res.status(400).send({ success: false, message: 'You can only enroll in up to 3 courses at a time.' });
                }

                // Find course
                const course = await courseCollection.findOne({ _id: new ObjectId(courseId) });
                if (!course) {
                    return res.status(404).send({ success: false, message: 'Course not found.' });
                }

                // Check seat availability
                const currentEnrollCount = await enrollmentsCollection.countDocuments({ courseId });
                if (currentEnrollCount >= course.seats) {
                    return res.status(400).send({ success: false, message: 'No seats left in this course.' });
                }

                // Enroll
                const enrollmentData = {
                    email,
                    courseId,
                    title,
                    image,
                    date: new Date(),
                };

                const result = await enrollmentsCollection.insertOne(enrollmentData);


                if (result.insertedId) {
                    await courseCollection.updateOne(
                        { _id: new ObjectId(courseId) },
                        { $inc: { enrollCount: 1 } }
                    );

                    return res.send({ success: true, insertedId: result.insertedId });
                } else {
                    return res.status(500).send({ success: false, message: 'Failed to enroll.' });
                }
            } catch (error) {
                console.error('Enroll Error:', error);
                res.status(500).send({ success: false, message: 'Server error', error: error.message });
            }
        });


        app.get('/courses/:id/seats-left', async (req, res) => {
            try {
                const courseId = req.params.id;

                const course = await courseCollection.findOne({ _id: new ObjectId(courseId) });
                if (!course) {
                    return res.status(404).send({ message: 'Course not found' });
                }

                const enrolledCount = await enrollmentsCollection.countDocuments({ courseId });
                const seatsLeft = course.seats - enrolledCount;

                res.send({ seatsLeft });
            } catch (err) {
                console.error('Seats Left Error:', err);
                res.status(500).send({ message: 'Server error' });
            }
        });

    } catch (err) {
        console.error('MongoDB Run Error:', err);
    }
}

// ===== Start Server =====
run().catch(console.dir);
app.listen(port, () => {
    console.log(` Server is running on port ${port}`);
});
