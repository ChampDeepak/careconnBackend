# Medical Appointment Booking System - Backend

Node.js backend server for the medical appointment booking system. Handles appointment scheduling, Google Calendar integration, and payment processing.

## Live API
Base URL: `https://careconnbackend.onrender.com`

## Technologies Used
- Node.js
- Express.js
- Google Calendar API
- Razorpay Payment Gateway

## Prerequisites
- Node.js (v14 or higher)
- npm
- Google Cloud Platform account
- Razorpay account

## Project Structure
```
booking-system-backend/
├── node_modules/
├── server.js          # Main server file
├── package.json       # Project dependencies
├── package-lock.json
└── .gitignore
```

## Environment Variables
Create a `.env` file in the root directory with the following variables:
```
PORT=3000
GOOGLE_CREDS={"your":"google-credentials-json"}
CALENDAR_ID=your_calendar_id
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

## API Endpoints

### GET /health
Health check endpoint to verify server status.

### GET /slots
Fetches available appointment slots.

### POST /book
Books an appointment and creates a Google Calendar event.
```json
{
  "start": "ISO datetime",
  "end": "ISO datetime",
  "name": "Patient Name",
  "mobile": "1234567890",
  "email": "patient@example.com",
  "age": "25",
  "additionalNote": "Any additional information",
  "selectedOption": "Yes/No"
}
```

### POST /create-order
Creates a new Razorpay order.

### POST /verify-payment
Verifies payment and confirms appointment.

## Local Development
1. Clone the repository:
```bash
git clone https://github.com/YourUsername/booking-system-backend.git
cd booking-system-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see above)

4. Start the server:
```bash
node server.js
```

## Deployment
This backend is deployed on Render.com. To deploy updates:

1. Push changes to the main branch
2. Render will automatically redeploy

## Error Handling
- All endpoints return appropriate HTTP status codes
- Error responses include descriptive messages
- Payment verification includes signature validation

## Security
- CORS enabled for specified origins
- Environment variables for sensitive data
- Payment signature verification
- Request validation

## Monitoring
- Basic logging implemented
- Health check endpoint
- Error tracking

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Open a pull request

## Contact
For backend-related queries:
- Email: sharmajijatin27@gmail.com
- GitHub: @ChampDeepak
## Acknowledgments
- Google Calendar API
- Razorpay Team
- Express.js Community
