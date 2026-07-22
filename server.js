// ============================================================
// FILE: server.js - COMPLETE BACKEND FOR TRAVERSE ETHIOPIA TOUR
// ============================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Server } = require('socket.io');
const http = require('http');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

// ============================================================
// 1. CONFIGURATION
// ============================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    },
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://TRAVERS:185582Kura@clustero.w60leha.mongodb.net/traverse_ethiopia?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || 'traverse_ethiopia_super_secret_key_2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'traverse_ethiopia_refresh_secret_key_2024';

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'fxszo8e5',
    api_key: process.env.CLOUDINARY_API_KEY || '296256252878274',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'DkwEBIKRWBa_6QXmmMOHVeuH-4U'
});

// Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER || 'Kurabachew0910090363@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'bytczgmvtytjvij'
    },
    tls: { rejectUnauthorized: false }
});

// Multer
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ============================================================
// 2. MIDDLEWARE
// ============================================================
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// ============================================================
// 3. AUTH MIDDLEWARE
// ============================================================
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.entityType)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
};

// ============================================================
// 4. DATABASE MODELS
// ============================================================
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// OTP Schema
const OTPSchema = new mongoose.Schema({
    email: String,
    otp: String,
    type: { type: String, default: 'verify' },
    createdAt: { type: Date, default: Date.now, expires: 300 }
});
const OTP = mongoose.model('OTP', OTPSchema);

// User Schema
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    entityType: {
        type: String,
        enum: ['guest', 'admin'],
        default: 'guest'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'active'
    },
    emailVerified: { type: Boolean, default: false },
    profileImage: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Tour Schema
const TourSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    duration: { type: String, required: true },
    price: { type: Number, required: true },
    guide: { type: String, required: true },
    category: {
        type: String,
        enum: ['historical', 'cultural', 'adventure', 'nature', 'city', 'food', 'trekking', 'wildlife'],
        required: true
    },
    description: { type: String, required: true },
    image: String,
    gallery: [String],
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    itinerary: [{
        day: String,
        title: String,
        description: String,
        image: String
    }],
    inclusions: [String],
    exclusions: [String],
    createdAt: { type: Date, default: Date.now }
});

// Booking Schema
const BookingSchema = new mongoose.Schema({
    tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingNumber: { type: String, unique: true },
    userName: String,
    userEmail: String,
    userPhone: String,
    date: { type: Date, required: true },
    people: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true },
    paymentMethod: {
        type: String,
        enum: ['telebirr', 'card', 'cash', 'chapa'],
        default: 'telebirr'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'confirmed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentScreenshot: String,
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    guestProfile: {
        age: Number,
        sex: String,
        passport: String,
        infants: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
});

// Review Schema
const ReviewSchema = new mongoose.Schema({
    tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    images: [String],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    createdAt: { type: Date, default: Date.now }
});

// Notification Schema
const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error', 'booking', 'payment'],
        default: 'info'
    },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', UserSchema);
const Tour = mongoose.model('Tour', TourSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Review = mongoose.model('Review', ReviewSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

// ============================================================
// 5. UPLOAD ROUTES
// ============================================================
app.post('/api/upload/base64', authenticate, async (req, res) => {
    try {
        const { image, folder } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }
        const result = await cloudinary.uploader.upload(image, {
            folder: folder || 'traverse_ethiopia'
        });
        res.json({ success: true, url: result.secure_url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// 6. AUTH ROUTES
// ============================================================
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email, otp, type = 'verify' } = req.body;
        await OTP.deleteMany({ email, type });
        await OTP.create({ email, otp, type });
        console.log('========================================');
        console.log(`📧 OTP FOR ${email}: ${otp}`);
        console.log('========================================');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            password: hashedPassword,
            phone,
            entityType: 'guest',
            status: 'active',
            emailVerified: false
        });
        await user.save();
        res.status(201).json({
            success: true,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { userId: user._id, email: user.email, entityType: user.entityType },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({
            success: true,
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                entityType: user.entityType
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// 7. TOUR ROUTES
// ============================================================
app.get('/api/tours', async (req, res) => {
    try {
        const { category, featured, search } = req.query;
        let query = { active: true };
        if (category) query.category = category;
        if (featured) query.featured = featured === 'true';
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const tours = await Tour.find(query).sort({ featured: -1, createdAt: -1 });
        res.json(tours);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tours/all', authenticate, authorize('admin'), async (req, res) => {
    try {
        const tours = await Tour.find().sort({ createdAt: -1 });
        res.json(tours);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tours/:id', async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) return res.status(404).json({ error: 'Tour not found' });
        res.json(tour);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tours', authenticate, authorize('admin'), async (req, res) => {
    try {
        const tour = new Tour(req.body);
        await tour.save();
        res.status(201).json(tour);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tours/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) return res.status(404).json({ error: 'Tour not found' });
        Object.assign(tour, req.body);
        await tour.save();
        res.json(tour);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tours/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) return res.status(404).json({ error: 'Tour not found' });
        await tour.deleteOne();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// 8. BOOKING ROUTES
// ============================================================
app.post('/api/bookings', authenticate, async (req, res) => {
    try {
        const tour = await Tour.findById(req.body.tourId);
        if (!tour) return res.status(404).json({ error: 'Tour not found' });
        
        const bookingData = {
            ...req.body,
            userId: req.user._id,
            bookingNumber: 'ET' + Date.now().toString().slice(-6),
            userName: req.user.name,
            userEmail: req.user.email,
            userPhone: req.user.phone,
            paymentStatus: 'pending',
            status: 'pending'
        };
        const booking = new Booking(bookingData);
        await booking.save();
        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/bookings/user/:userId', authenticate, async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.params.userId })
            .populate('tourId', 'name location image price duration')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/bookings/all', authenticate, authorize('admin'), async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('tourId', 'name')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/bookings/:id/status', authenticate, authorize('admin'), async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        booking.status = req.body.status;
        await booking.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/bookings/:id/payment', authenticate, authorize('admin'), async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        booking.paymentStatus = req.body.paymentStatus;
        await booking.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// 9. REVIEW ROUTES
// ============================================================
app.post('/api/reviews', authenticate, async (req, res) => {
    try {
        const review = new Review({ 
            ...req.body, 
            userId: req.user._id, 
            userName: req.user.name 
        });
        await review.save();
        res.status(201).json(review);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reviews/tour/:tourId', async (req, res) => {
    try {
        const reviews = await Review.find({ 
            tourId: req.params.tourId, 
            status: 'approved' 
        }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// 10. USER ROUTES
// ============================================================
app.get('/api/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// 11. ANALYTICS ROUTES
// ============================================================
app.get('/api/analytics', authenticate, authorize('admin'), async (req, res) => {
    try {
        const totalBookings = await Booking.countDocuments();
        const totalTours = await Tour.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalRevenue = await Booking.aggregate([
            { $match: { paymentStatus: 'confirmed' } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        const pendingBookings = await Booking.countDocuments({ status: 'pending' });
        const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
        const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
        const completedBookings = await Booking.countDocuments({ status: 'completed' });
        
        res.json({
            totalBookings,
            totalTours,
            totalUsers,
            totalRevenue: totalRevenue[0]?.total || 0,
            pending: pendingBookings,
            confirmed: confirmedBookings,
            cancelled: cancelledBookings,
            completed: completedBookings
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// 12. HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ============================================================
// 13. ADMIN ROUTE - PROTECTED
// ============================================================
// Serve admin page at /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// You can also add a protected admin route
app.get('/admin/dashboard', authenticate, authorize('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ============================================================
// 14. SERVE FRONTEND
// ============================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================================
// 15. START SERVER
// ============================================================
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Traverse Ethiopia Tour Server running on port ${PORT}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`✅ ALL FEATURES ARE LIVE!`);
});
