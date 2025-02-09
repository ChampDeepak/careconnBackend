const express = require("express");
const { google } = require("googleapis");
require("dotenv").config();

const app = express();
app.use(express.json());

//CORS Handling 
const cors = require('cors');
app.use(cors({
    origin: ['https://champdeepak.github.io/careconnect/', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
}));

// Google Calendar credentials
const credentials = JSON.parse(process.env.GOOGLE_CREDS);
const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar']
});

// Utility function to check if a slot overlaps with busy times
function isSlotAvailable(slot, busySlots) {
  const slotStart = new Date(slot.start);
  const slotEnd = new Date(slot.end);

  return !busySlots.some((busy) => {
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);
    return slotStart < busyEnd && slotEnd > busyStart;
  });
}

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});
// Get available slots
app.get("/slots", async (req, res) => {
  try {
    const authClient = await auth.getClient();

    // Get busy slots for the next 7 days
    const timeMin = new Date().toISOString();
    const timeMax = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const response = await calendar.freebusy.query({
      auth: authClient,
      requestBody: {
        timeMin: timeMin,
        timeMax: timeMax,
        items: [{ id: process.env.CALENDAR_ID }],
      },
    });

    const busySlots = response.data.calendars[process.env.CALENDAR_ID].busy;
    res.json(busySlots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({
      error: "Failed to fetch available slots",
      details: error.message,
    });
  }
});

// Book appointment
app.post("/book", async (req, res) => {
  try {
    const {
      start,
      end,
      name,
      mobile,
      age,
      email,
      additionalNote,
      selectedOption,
    } = req.body;
    const authClient = await auth.getClient();

    // Verify if slot is still available
    const busyResponse = await calendar.freebusy.query({
      auth: authClient,
      requestBody: {
        timeMin: start,
        timeMax: end,
        items: [{ id: process.env.CALENDAR_ID }],
      },
    });

    const busySlots = busyResponse.data.calendars[process.env.CALENDAR_ID].busy;
    if (!isSlotAvailable({ start, end }, busySlots)) {
      return res.status(409).json({
        error: "Slot no longer available",
      });
    }

    // Create calendar event without attendees
    const event = await calendar.events.insert({
      auth: authClient,
      calendarId: process.env.CALENDAR_ID,
      requestBody: {
        summary: `Appointment: ${name}`,
        description: `Patient Details:\nName: ${name}\nPhone: ${mobile}\nAge: ${age}\nFirst Appointment: ${selectedOption}\nAdditional Note: ${additionalNote}\nEmail: ${email} `,
        start: {
          dateTime: start,
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: end,
          timeZone: "Asia/Kolkata",
        },
        // Removed attendees array
        reminders: {
          useDefault: true,
        },
      },
    });

    res.json({
      success: true,
      appointmentId: event.data.id,
      details: {
        name,
        start: event.data.start.dateTime,
        end: event.data.end.dateTime,
      },
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({
      error: "Failed to book appointment",
      details: error.message,
    });
  }
});

// Add to server.js

const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order endpoint
app.post("/create-order", async (req, res) => {
  try {
    const { name, email, amount = 25000 } = req.body; // Amount in paise (₹250 = 25000 paise)

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        name,
        email,
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Verify payment and create calendar event
app.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingDetails,
    } = req.body;

    // Verify payment signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Verify payment status
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.status !== "captured") {
      return res.status(400).json({ error: "Payment not captured" });
    }

    // Create calendar event
    const authClient = await auth.getClient();

    // Verify slot availability again
    const busyResponse = await calendar.freebusy.query({
      auth: authClient,
      requestBody: {
        timeMin: bookingDetails.start,
        timeMax: bookingDetails.end,
        items: [{ id: process.env.CALENDAR_ID }],
      },
    });

    const busySlots = busyResponse.data.calendars[process.env.CALENDAR_ID].busy;
    if (
      !isSlotAvailable(
        { start: bookingDetails.start, end: bookingDetails.end },
        busySlots
      )
    ) {
      return res.status(409).json({ error: "Slot no longer available" });
    }

    // Create event
    const event = await calendar.events.insert({
      auth: authClient,
      calendarId: process.env.CALENDAR_ID,
      requestBody: {
        summary: `Appointment: ${bookingDetails.name}`,
        description: `Patient Details:
        Name: ${bookingDetails.name}
        Phone: ${bookingDetails.mobile}
        Age: ${bookingDetails.age}
        First Appointment: ${bookingDetails.selectedOption}
        Additional Note: ${bookingDetails.additionalNote}
        Email: ${bookingDetails.email}
        Payment ID: ${razorpay_payment_id}`,
        start: {
          dateTime: bookingDetails.start,
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: bookingDetails.end,
          timeZone: "Asia/Kolkata",
        },
        reminders: {
          useDefault: true,
        },
      },
    });

    res.json({
      success: true,
      appointmentId: event.data.id,
      paymentId: razorpay_payment_id,
      details: {
        name: bookingDetails.name,
        start: event.data.start.dateTime,
        end: event.data.end.dateTime,
      },
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      error: "Failed to verify payment and create appointment",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});
