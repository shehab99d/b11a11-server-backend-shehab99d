// models/Course.js
const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  duration: String,
  instructorEmail: String,
  instructorName: String,
  seats: Number,
  enrolledCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
