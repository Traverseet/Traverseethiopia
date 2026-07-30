const mongoose = require('mongoose');
const Tour = require('./src/models/Tour');
const User = require('./src/models/User');
const Booking = require('./src/models/Booking');
const Contact = require('./src/models/Contact');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Tour.deleteMany({});
    await User.deleteMany({});
    await Booking.deleteMany({});
    await Contact.deleteMany({});
    console.log('Cleared existing data');

    // Import tours
    const toursData = require('./seed-data/tours.json');
    const tours = await Tour.insertMany(toursData);
    console.log(`Imported ${tours.length} tours`);

    // Import users
    const usersData = require('./seed-data/users.json');
    const users = await User.insertMany(usersData);
    console.log(`Imported ${users.length} users`);

    // Update bookings with proper references
    const bookingsData = require('./seed-data/bookings.json');
    // You'll need to map the ObjectIds properly
    const bookings = await Booking.insertMany(bookingsData);
    console.log(`Imported ${bookings.length} bookings`);

    // Import contacts
    const contactsData = require('./seed-data/contacts.json');
    const contacts = await Contact.insertMany(contactsData);
    console.log(`Imported ${contacts.length} contacts`);

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedData();