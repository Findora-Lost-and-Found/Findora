# Findora Backend

This backend is implemented with Spring Boot, Java 17, Spring Security, Spring Data JPA, and MySQL.

## Prerequisites

- Java 17+
- Maven 3.8+
- MySQL 8+

## Build

```bash
cd backend
mvn clean install
```

## Run

```bash
cd backend
mvn spring-boot:run
```

Or:

```bash
cd backend
mvn clean package
java -jar target/findora-backend-2.0.0.jar
```

Default backend URL:

- `http://localhost:8080`

## Configuration

Main configuration file:

- `src/main/resources/application.properties`

Review these properties before startup:

- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`
- `app.jwt.secret`
- `spring.mail.username`
- `spring.mail.password`
- `app.upload.dir`

## Database

The backend uses MySQL and expects an existing schema because:

```properties
spring.jpa.hibernate.ddl-auto=none
```

Create the database first:

```sql
CREATE DATABASE findora_db;
```

If your environment uses a `schema.sql`, import it before startup:

```bash
mysql -u root -p findora_db < path/to/schema.sql
```

## Admin Reset

Use the included script to reset the default admin record:

```bash
mysql -u root -p findora_db < reset_admin.sql
```

It resets the admin user to:

- username: `admin`
- email: `admin@findora.com`
- role: `admin`
- verified: `true`
- approved: `true`

## Key Route Groups

- `/api/auth`
- `/api/items`
- `/api/claims`
- `/api/security`
- `/api/admin`
- `/api/notifications`
- `/api/reports`

## Testing

Run backend tests with:

```bash
cd backend
mvn test
```

## Troubleshooting

### MySQL connection issues

- Verify MySQL is running
- Verify `findora_db` exists
- Verify datasource credentials in `application.properties`
- Verify the schema already exists before startup

### JWT issues

- Set a valid `app.jwt.secret`
- Restart the backend after changing JWT properties

### Email OTP issues

- Configure SMTP properties correctly
- Use an App Password for Gmail
- See the root `EMAIL_SETUP.md` for mail setup details

### Port conflict

If 8080 is in use, change:

```properties
server.port=8081
```
