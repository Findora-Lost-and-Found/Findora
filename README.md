# Findora

Findora is a lost and found management system with a Spring Boot backend, a React frontend, and a MySQL database. It supports lost and found item reporting, JWT-based authentication, email OTP workflows, item claiming, notifications, pagination, sorting, and role-based access control for students, staff, security officers, and administrators.

## Overview

Current architecture:

- Backend: Spring Boot 3.x, Java 17, Spring Security, Spring Data JPA, MySQL
- Frontend: React with Vite
- Database: MySQL 8+
- Authentication: JWT
- Email: SMTP via Spring Mail

Main capabilities:

- User registration and login
- Email verification and password reset with OTP
- Lost item and found item reporting
- Found item claiming workflow
- Notifications and unread counts
- Role-based access control
- Paginated and sortable item listings
- Admin and security operations

## Project Structure

```text
Findora/
├── backend/
│   ├── pom.xml
│   ├── README.md
│   ├── reset_admin.sql
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/findora/
│   │   │   │   ├── config/
│   │   │   │   ├── controller/
│   │   │   │   ├── dto/
│   │   │   │   ├── exception/
│   │   │   │   ├── model/
│   │   │   │   ├── repository/
│   │   │   │   ├── security/
│   │   │   │   ├── service/
│   │   │   │   └── FindoraApplication.java
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── test/
│   └── uploads/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       ├── services/
│       └── utils/
├── EMAIL_SETUP.md
└── README.md
```

## Feature Summary

### Authentication and Account Security

- Register with student, staff, security, or admin roles
- Login with username, email, or identifier-based frontend payloads
- JWT-based session handling
- Email verification with OTP
- Password reset with OTP
- Account approval, suspension, and ban flags

### Lost and Found Workflow

- Report lost items
- Report found items
- Categories include NIC, Student ID, Bank Card, Wallet, and Other
- Optional image upload for found items
- Search, filter, sort, and paginate item listings
- Dashboard and list pages consume paginated backend responses

### Claim and Release Workflow

- Users can claim found items
- OTP-based verification flow is designed for item release
- Security officers can verify claims and manage receipt/release operations

### Notifications

- In-app notifications
- Unread count API support
- Match, OTP, approval, claim, report, and system notification models are present

### Roles and Permissions

- Student and Staff: report items, browse items, claim items, manage their own posts and claims
- Security: operational flows for claim verification and transaction handling
- Admin: user approval, moderation, reports, and system oversight

## Technology Stack

| Layer | Technology |
| --- | --- |
| Backend | Spring Boot 3.2.x |
| Language | Java 17 |
| Build | Maven |
| Database | MySQL 8+ |
| ORM | Spring Data JPA / Hibernate |
| Security | Spring Security + JWT |
| Email | Spring Mail |
| Frontend | React + Vite |
| HTTP Client | Axios |

## Prerequisites

### Backend

- Java 17 or newer
- Maven 3.8 or newer
- MySQL 8 or newer

### Frontend

- A current frontend toolchain capable of running the React Vite app
- The frontend in this repository is managed through `frontend/package.json`

## Backend Setup

### 1. Create the MySQL database

Create the database used by the backend:

```sql
CREATE DATABASE findora_db;
```

### 2. Prepare the schema

The backend runs with:

```properties
spring.jpa.hibernate.ddl-auto=none
```

That means the application expects the schema to already exist in MySQL before startup.

If your environment uses a `schema.sql`, import it before starting the backend. If you are continuing from an existing Findora database, reuse that schema directly.

Example import command if you have a schema file:

```bash
mysql -u root -p findora_db < path/to/schema.sql
```

### 3. Configure backend properties

The main backend configuration lives in:

- `backend/src/main/resources/application.properties`

Important values to review:

- `server.port=8080`
- `spring.datasource.url=jdbc:mysql://localhost:3306/findora_db?...`
- `spring.datasource.username=root`
- `spring.datasource.password=...`
- `app.jwt.secret=...`
- `spring.mail.host=smtp.gmail.com`
- `spring.mail.username=...`
- `spring.mail.password=...`
- `app.upload.dir=uploads/`

### 4. Build the backend

```bash
cd backend
mvn clean install
```

### 5. Run the backend

Run in development:

```bash
cd backend
mvn spring-boot:run
```

Or run the packaged jar:

```bash
cd backend
mvn clean package
java -jar target/findora-backend-2.0.0.jar
```

Backend default URL:

- `http://localhost:8080`

## Frontend Setup

The frontend remains a React application using Vite.

### 1. Install frontend dependencies

```bash
cd frontend
npm install
```

### 2. Configure frontend API base URL if needed

The frontend expects the backend API at:

- `http://localhost:8080/api`

### 3. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend default URL:

- `http://localhost:5173`

## Email OTP Setup

OTP is sent by email, not by phone number.

To configure Gmail SMTP for development:

1. Enable 2-factor authentication on the Gmail account.
2. Generate an App Password.
3. Set the following Spring Mail properties in `backend/src/main/resources/application.properties`:

```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
```

Detailed email guidance is available in:

- `EMAIL_SETUP.md`

## Default Admin Account

The repository includes an admin reset script:

- `backend/reset_admin.sql`

It resets the admin record to:

- Username: `admin`
- Email: `admin@findora.com`
- Role: `admin`
- Verified: `true`
- Approved: `true`

To apply it:

```bash
mysql -u root -p findora_db < backend/reset_admin.sql
```

The script sets a BCrypt-hashed password in the database. Use the project’s operational password for that hash in your environment, or update the hash if you need a different admin password.

## API Routes

The current Spring Boot controllers define these API route groups.

### Authentication

Base route:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-otp`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`

### Items

Base route: `/api/items`

- `GET /api/items`
- `GET /api/items/{id}`
- `GET /api/items/my/items`
- `POST /api/items`
- `PUT /api/items/{id}/status`
- `DELETE /api/items/{id}`

Supported list query parameters:

- `page`
- `size`
- `sort`
- `category`
- `keyword`
- `type`
- `status`

Current paginated response fields used by the frontend:

- `content`
- `totalPages`
- `totalElements`
- `pageNumber`
- `pageSize`

Compatibility fields are also returned where needed for existing frontend pages.

### Claims

Base route: `/api/claims`

- `POST /api/claims`
- `GET /api/claims/my`
- `GET /api/claims/{id}`
- `GET /api/claims/pending`

### Security

Base route: `/api/security`

- `POST /api/security/verify-claim`
- `POST /api/security/receive-item`
- `GET /api/security/transactions`
- `GET /api/security/stats`

### Admin

Base route: `/api/admin`

- `GET /api/admin/users`
- `GET /api/admin/pending-approvals`
- `PUT /api/admin/approve-user/{id}`
- `PUT /api/admin/ban-user/{id}`
- `PUT /api/admin/suspend-user/{id}`
- `GET /api/admin/reports`
- `PUT /api/admin/reports/{id}`
- `GET /api/admin/stats`

### Notifications

Base route: `/api/notifications`

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PUT /api/notifications/{id}/read`
- `PUT /api/notifications/read-all`
- `DELETE /api/notifications/{id}`

### Reports

Base route: `/api/reports`

- `POST /api/reports`
- `GET /api/reports/my`

## Implementation Status

The repository contains both active endpoints and scaffolded endpoints.

Implemented and actively used parts include:

- Authentication core flows
- Item reporting and paginated item retrieval
- JWT security configuration
- DTO-based item responses compatible with the React frontend
- Frontend pagination for found and lost item pages

Some controller routes are currently placeholders or partial implementations and may return `501 Not Implemented` or TODO-style responses until their service logic is completed.

## Pagination and Sorting

The backend supports server-side pagination and sorting on item listings.

Supported item list behavior includes:

- `page` with zero-based indexing
- `size` page size
- `sort` values such as `createdAt,desc` and `name,asc`
- filtering by type, category, keyword, and status

This is used by the frontend for:

- Found Items
- Lost Items
- Dashboard item previews

## User Roles and Permissions

### Student and Staff

- Register and log in
- Verify email
- Report lost items
- Report found items
- Browse found items
- Claim eligible items
- View their own items and claims

### Security

- Access security operations
- Verify claim OTPs
- Manage receive and release workflows
- View transaction and stats endpoints
- Approval workflow is modeled in the backend

### Admin

- Review users and pending approvals
- Moderate users through ban and suspend actions
- Review reports and platform statistics
- Manage higher-privilege workflows

## Testing

### Backend tests

Run backend tests with Maven:

```bash
cd backend
mvn test
```

Integration tests currently exist for:

- authentication controller behavior
- item controller pagination behavior

### Frontend validation

Build the frontend:

```bash
cd frontend
npm run build
```

## Troubleshooting

### Backend cannot connect to MySQL

Check:

- MySQL is running
- `findora_db` exists
- username and password in `application.properties` are correct
- the required tables already exist because `ddl-auto=none`

### JWT errors

If tokens fail to validate:

- ensure `app.jwt.secret` is set
- ensure the secret is long enough for HS256
- restart the backend after changing JWT properties

### Email OTP is not sent

Check:

- Gmail App Password is used, not the normal account password
- SMTP settings are correct
- outbound mail is not blocked by firewall or provider restrictions

### Port 8080 is already in use

On Windows:

```bash
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

Or change:

```properties
server.port=8081
```

### Frontend cannot reach backend

Check:

- backend is running on port 8080
- frontend is calling `http://localhost:8080/api`
- CORS configuration in Spring Boot includes the frontend origin

### Backend starts but item APIs fail

Check:

- schema exists in MySQL
- enum values in the database match the Java converters
- upload directory is writable if image uploads are used

## Deployment

### Backend deployment

For production deployment:

1. Build the jar:

```bash
cd backend
mvn clean package
```

2. Deploy the generated jar from:

- `backend/target/findora-backend-2.0.0.jar`

3. Configure production values for:

- datasource URL, username, password
- JWT secret
- SMTP credentials
- upload directory
- server port

4. Ensure the production MySQL schema is already created before startup.

### Frontend deployment

Build the frontend for production:

```bash
cd frontend
npm run build
```

Deploy the generated frontend build according to your hosting platform.

### Database deployment

Recommended production practices:

- use a managed MySQL instance where possible
- import the schema before backend startup
- back up the database regularly
- restrict direct database access

## Development Notes

When adding new backend features:

1. Add or update the entity in `backend/src/main/java/com/findora/model/`
2. Add repository logic in `backend/src/main/java/com/findora/repository/`
3. Add service logic in `backend/src/main/java/com/findora/service/`
4. Expose routes in `backend/src/main/java/com/findora/controller/`
5. Update frontend API usage in `frontend/src/services/api.js`
6. Add or update React pages and components as needed

## License

This project is maintained for educational and application development purposes.
