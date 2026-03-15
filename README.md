# Findora - Lost and Found Management System

A complete production-ready web application for managing lost and found items with automatic matching, claim system, and role-based access control.

## 🚀 Features

### Authentication System
- User registration with roles: Student, Staff, Security, Admin
- Login using username or email
- JWT authentication
- Password hashing with bcrypt
- OTP email verification
- Forgot password with OTP reset

### Lost and Found System
- Report lost items
- Report found items
- Categories: NIC, Student ID, Bank Card, Wallet, Other
- Upload images with items
- Search and filter items by category, date, keyword

### Intelligent Matching Algorithm
- Automatically matches lost and found items
- Matching factors: item name, description, location, date
- ≥80% match → "Item Found" notification
- ≥60% match → "Possible Match" notification
- Email notifications for matches

### Claim System
- Users can claim found items
- System generates 6-digit OTP
- OTP sent via email
- Security officer verifies OTP to release item
- 24-hour OTP expiry

### Security Dashboard
- Receive items
- Verify claims with OTP
- Release items to rightful owners
- View transaction history
- Statistics dashboard

### Admin Dashboard
- View all lost and found items
- View receive and release history
- Approve security and admin signups
- Ban or suspend users
- Handle post reports
- Comprehensive statistics
- **Desktop-only access** (mobile devices blocked for security)

### Mobile Responsive Design
- ✅ **Fully responsive** for mobile phones and tablets
- Touch-optimized buttons and interactive elements
- Mobile-friendly navigation
- Optimized layouts for small screens
- Students, Staff, and Security can use mobile devices
- **Admin access restricted to desktop only** for enhanced security and functionality

### Notifications
- In-app notification system
- Email notifications for:
  - Item matches
  - OTP codes
  - Account approvals
  - Claims and releases

## 🛠️ Tech Stack

- **Frontend:** React 19 with Vite
- **Backend:** Node.js with Express
- **Database:** MySQL 8.0+
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Email:** Nodemailer
- **File Upload:** Multer
- **Validation:** express-validator
- **Matching Algorithm:** string-similarity

## 📁 Project Structure

```
Findora/
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   └── schema.sql
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── claimController.js
│   │   ├── itemController.js
│   │   ├── notificationController.js
│   │   ├── reportController.js
│   │   └── securityController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── upload.js
│   │   └── validator.js
│   ├── models/
│   │   ├── Claim.js
│   │   ├── Item.js
│   │   ├── Match.js
│   │   ├── Notification.js
│   │   ├── Report.js
│   │   ├── SecurityTransaction.js
│   │   └── User.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── claimRoutes.js
│   │   ├── itemRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── reportRoutes.js
│   │   └── securityRoutes.js
│   ├── utils/
│   │   ├── email.js
│   │   ├── jwt.js
│   │   └── matcher.js
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ItemCard.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   └── AdminUsers.jsx
│   │   │   ├── security/
│   │   │   │   └── SecurityPendingClaims.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FoundItems.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── LostItems.jsx
│   │   │   ├── MyClaims.jsx
│   │   │   ├── MyItems.jsx
│   │   │   ├── Notifications.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── ReportFoundItem.jsx
│   │   │   ├── ReportLostItem.jsx
│   │   │   └── Signup.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- MySQL 8.0+
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Findora
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Configure Environment Variables
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
```

Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=findora_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

#### Setup Database
```bash
# Login to MySQL
mysql -u root -p

# Run the schema.sql file
source backend/config/schema.sql
```

Or manually:
```bash
mysql -u root -p < backend/config/schema.sql
```

#### Start Backend Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Configure Environment Variables
```bash
# Copy example env file
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

#### Start Frontend Development Server
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📧 Email Configuration (Gmail)

To enable email notifications:

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Go to Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy the generated 16-character password
4. Use this password in `EMAIL_PASSWORD` in `.env`

## 👤 Default Admin Account

In development/testing mode, a temporary admin account is auto-seeded on backend startup (if no admin exists):

- **Username:** `admin`
- **Email:** `admin@test.com`
- **Password:** `Admin@1234`

The password is hashed with `bcryptjs` before storing, and no duplicate is created if an admin already exists.

**Note:** This account is intended for development/testing and can be removed later.

## 🎯 User Roles & Permissions

### Student / Staff
- Report lost items
- Report found items
- Browse all items
- Claim found items
- View their own items and claims
- Receive match notifications

### Security Officer
- Receive found items
- Verify and release claims using OTP
- View transaction history
- View statistics
- Requires admin approval upon signup

### Admin
- All security officer permissions
- Manage all users (ban, suspend)
- Approve security/admin signups
- View all items and transactions
- Handle post reports
- Access comprehensive statistics
- Requires another admin's approval

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/resend-otp` - Resend verification OTP
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP
- `GET /api/auth/me` - Get current user

### Items
- `POST /api/items` - Create lost/found item
- `GET /api/items` - Get all items (with filters)
- `GET /api/items/:id` - Get single item
- `GET /api/items/my/items` - Get user's items
- `PUT /api/items/:id/status` - Update item status
- `DELETE /api/items/:id` - Delete item

### Claims
- `POST /api/claims` - Create a claim
- `GET /api/claims/my` - Get user's claims
- `GET /api/claims/:id` - Get claim details
- `GET /api/claims/pending` - Get pending claims (Security)

### Security
- `POST /api/security/verify-claim` - Verify claim with OTP
- `POST /api/security/receive-item` - Record received item
- `GET /api/security/transactions` - Get transactions
- `GET /api/security/stats` - Get statistics

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/pending-approvals` - Get pending approvals
- `PUT /api/admin/approve-user/:id` - Approve user
- `PUT /api/admin/ban-user/:id` - Ban/unban user
- `PUT /api/admin/suspend-user/:id` - Suspend/unsuspend user
- `GET /api/admin/reports` - Get all reports
- `PUT /api/admin/reports/:id` - Handle report
- `GET /api/admin/stats` - Get dashboard statistics

### Notifications
- `GET /api/notifications` - Get user's notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Reports
- `POST /api/reports` - Report a post
- `GET /api/reports/my` - Get user's reports

## 🧪 Testing the Application

### Test User Flow:
1. Register as a student
2. Verify email with OTP
3. Report a lost item
4. Report a found item
5. System automatically matches items
6. Receive match notification
7. Claim a found item
8. Receive OTP via email
9. Security officer verifies OTP
10. Item is released

### Test Admin Flow:
1. Login as admin
2. Approve security officer signup
3. View all items and users
4. Handle reports
5. Ban/suspend users
6. View statistics

## 🐛 Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database `findora_db` exists

### Email Not Sending
- Verify Gmail App Password is correct
- Check EMAIL_USER and EMAIL_PASSWORD in `.env`
- Ensure 2FA is enabled on Gmail account

### Port Already in Use
```bash
# Change PORT in backend/.env
PORT=5001

# Or kill process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill -9
```

### CORS Errors
- Verify FRONTEND_URL in backend `.env` matches your frontend URL
- Check browser console for specific CORS error

## 📝 Development Notes

### Adding New Features
1. Create model in `backend/models/`
2. Create controller in `backend/controllers/`
3. Add routes in `backend/routes/`
4. Update API service in `frontend/src/services/api.js`
5. Create React components/pages

### Database Schema Changes
1. Update `backend/config/schema.sql`
2. Create migration script if needed
3. Update corresponding models

### Matching Algorithm Tuning
Edit weights in `backend/utils/matcher.js`:
- Item name similarity: 40% weight
- Description similarity: 30% weight
- Location similarity: 20% weight
- Date proximity: 10% weight

## 🚀 Deployment

### Backend Deployment (e.g., Heroku, DigitalOcean)
1. Set environment variables
2. Use production database
3. Set `NODE_ENV=production`
4. Configure CORS for production frontend URL

### Frontend Deployment (e.g., Vercel, Netlify)
1. Build the project: `npm run build`
2. Deploy `dist` folder
3. Update `VITE_API_URL` to production backend URL

### Database Deployment
1. Use managed MySQL service (AWS RDS, DigitalOcean)
2. Run schema.sql on production database
3. Regular backups recommended

## 📄 License

This project is created for educational purposes.

## 👥 Support

For issues and questions, please create an issue in the repository.

---

**Built with ❤️ for managing lost and found items efficiently**
