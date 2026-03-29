package com.findora.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

@Component
@Slf4j
public class DatabaseInitializer {

    @Value("${spring.datasource.url:jdbc:mysql://localhost:3306/findora_db}")
    private String dbUrl;

    @Value("${spring.datasource.username:root}")
    private String dbUsername;

    @Value("${spring.datasource.password:1234}")
    private String dbPassword;

    @PostConstruct
    public void initializeDatabase() {
        try {
            // First, ensure database exists
            String url = "jdbc:mysql://localhost:3306/";
            Connection conn = DriverManager.getConnection(url, dbUsername, dbPassword);
            Statement stmt = conn.createStatement();
            
            stmt.executeUpdate("CREATE DATABASE IF NOT EXISTS findora_db");
            conn.close();
            
            log.info("Database findora_db ensured to exist");

            // Connect to the actual database and create tables
            conn = DriverManager.getConnection(dbUrl, dbUsername, dbPassword);
            stmt = conn.createStatement();

            // Check if users table exists and has all columns
            String checkTableSQL = "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='findora_db' AND TABLE_NAME='users'";
            if (!stmt.executeQuery(checkTableSQL).next()) {
                log.info("Creating users table with moderation columns...");
                stmt.executeUpdate("""
                    CREATE TABLE users (
                      id INT PRIMARY KEY AUTO_INCREMENT,
                      username VARCHAR(50) UNIQUE NOT NULL,
                      email VARCHAR(100) UNIQUE NOT NULL,
                      password VARCHAR(255) NOT NULL,
                      full_name VARCHAR(100) NOT NULL,
                      role ENUM('student', 'staff', 'security', 'admin') NOT NULL,
                      phone VARCHAR(20),
                      pending_phone VARCHAR(20),
                      is_verified BOOLEAN DEFAULT FALSE,
                      is_phone_verified BOOLEAN DEFAULT TRUE,
                      is_approved BOOLEAN DEFAULT TRUE,
                      is_banned BOOLEAN DEFAULT FALSE,
                      is_suspended BOOLEAN DEFAULT FALSE,
                      is_deleted BOOLEAN DEFAULT FALSE,
                      bad_post_attempts INT DEFAULT 0,
                      suspension_until DATETIME,
                      deleted_at DATETIME,
                      verification_otp VARCHAR(6),
                      reset_otp VARCHAR(6),
                      phone_verification_otp VARCHAR(6),
                      otp_expiry DATETIME,
                      phone_otp_expiry DATETIME,
                      phone_otp_reset VARCHAR(6),
                      pending_phone_otp VARCHAR(6),
                      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                      INDEX idx_email (email),
                      INDEX idx_username (username),
                      INDEX idx_role (role),
                      UNIQUE INDEX uq_users_phone (phone),
                      UNIQUE INDEX uq_users_pending_phone (pending_phone)
                    )
                    """);
            }

                      // Backfill compatibility columns for existing databases that were created
                      // before moderation and phone OTP updates.
                      ensureColumnExists(stmt, "users", "pending_phone", "VARCHAR(20) NULL");
                      ensureColumnExists(stmt, "users", "is_phone_verified", "BOOLEAN DEFAULT TRUE");
                      ensureColumnExists(stmt, "users", "bad_post_attempts", "INT NOT NULL DEFAULT 0");
                      ensureColumnExists(stmt, "users", "suspension_until", "DATETIME NULL");
                      ensureColumnExists(stmt, "users", "is_deleted", "BOOLEAN NOT NULL DEFAULT FALSE");
                      ensureColumnExists(stmt, "users", "deleted_at", "DATETIME NULL");
                      ensureColumnExists(stmt, "users", "phone_verification_otp", "VARCHAR(6) NULL");
                      ensureColumnExists(stmt, "users", "phone_otp_expiry", "DATETIME NULL");
                      ensureColumnExists(stmt, "users", "phone_otp_reset", "VARCHAR(6) NULL");
                      ensureColumnExists(stmt, "users", "pending_phone_otp", "VARCHAR(6) NULL");
                      ensureUniqueIndexIfMissing(stmt, "users", "uq_users_pending_phone", "pending_phone");

            // Ensure user_access_appeals table exists
            checkTableSQL = "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='findora_db' AND TABLE_NAME='user_access_appeals'";
            if (!stmt.executeQuery(checkTableSQL).next()) {
                log.info("Creating user_access_appeals table...");
                String usersIdType = resolveUsersIdColumnType(stmt);
                stmt.executeUpdate("""
                    CREATE TABLE user_access_appeals (
                      id BIGINT PRIMARY KEY AUTO_INCREMENT,
                      user_id %s NOT NULL,
                      action_type ENUM('suspension', 'ban') NOT NULL,
                      status ENUM('pending', 'approved', 'declined') NOT NULL DEFAULT 'pending',
                      appeal_text TEXT NOT NULL,
                      admin_notes TEXT NULL,
                      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      reviewed_at DATETIME NULL,
                      CONSTRAINT fk_access_appeals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                      INDEX idx_access_appeals_user_id (user_id),
                      INDEX idx_access_appeals_status (status),
                      INDEX idx_access_appeals_created_at (created_at)
                    )
                    """.formatted(usersIdType));
            }

            // Create other tables if they don't exist
            createTableIfNotExists(stmt, "items", """
                CREATE TABLE items (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  user_id INT NOT NULL,
                  type ENUM('lost', 'found') NOT NULL,
                  category ENUM('NIC', 'Student ID', 'Bank Card', 'Wallet', 'Other') NOT NULL,
                  item_name VARCHAR(100) NOT NULL,
                  description TEXT,
                  location VARCHAR(200) NOT NULL,
                  date DATE NOT NULL,
                  time TIME NOT NULL,
                  image_url VARCHAR(255),
                  status ENUM('active', 'handover_requested', 'held_by_security', 'handed_to_security', 'claimed', 'closed') DEFAULT 'active',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  INDEX idx_type (type),
                  INDEX idx_category (category),
                  INDEX idx_status (status),
                  INDEX idx_date (date),
                  INDEX idx_user_id (user_id)
                )
                """);

            createTableIfNotExists(stmt, "matches", """
                CREATE TABLE matches (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  lost_item_id INT NOT NULL,
                  found_item_id INT NOT NULL,
                  match_score DECIMAL(5,2) NOT NULL,
                  match_type ENUM('Item Found', 'Possible Match') NOT NULL,
                  is_notified BOOLEAN DEFAULT FALSE,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (lost_item_id) REFERENCES items(id) ON DELETE CASCADE,
                  FOREIGN KEY (found_item_id) REFERENCES items(id) ON DELETE CASCADE,
                  INDEX idx_lost_item (lost_item_id),
                  INDEX idx_found_item (found_item_id),
                  INDEX idx_match_score (match_score)
                )
                """);

            createTableIfNotExists(stmt, "claims", """
                CREATE TABLE claims (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  item_id INT NOT NULL,
                  claimer_id INT NOT NULL,
                  otp VARCHAR(6) NOT NULL,
                  otp_expiry DATETIME NOT NULL,
                  status ENUM('pending', 'approved', 'rejected', 'collected') DEFAULT 'pending',
                  security_officer_id INT,
                  notes TEXT,  
                  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  collected_at DATETIME,
                  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
                  FOREIGN KEY (claimer_id) REFERENCES users(id) ON DELETE CASCADE,
                  FOREIGN KEY (security_officer_id) REFERENCES users(id),
                  INDEX idx_item_id (item_id),
                  INDEX idx_claimer_id (claimer_id),
                  INDEX idx_status (status)
                )
                """);

            createTableIfNotExists(stmt, "notifications", """
                CREATE TABLE notifications (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  user_id INT NOT NULL,
                  title VARCHAR(255) NOT NULL,
                  message TEXT NOT NULL,
                  notification_type VARCHAR(50) NOT NULL,
                  is_read BOOLEAN DEFAULT FALSE,
                  appeal_id BIGINT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  INDEX idx_user_id (user_id),
                  INDEX idx_created_at (created_at)
                )
                """);

            stmt.close();
            conn.close();
            
            log.info("Database initialization completed successfully");
        } catch (Exception e) {
            log.error("Error initializing database", e);
            // Don't throw - let app continue in case tables already exist
        }
    }

    private void createTableIfNotExists(Statement stmt, String tableName, String createTableSQL) throws Exception {
        String checkSQL = "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='findora_db' AND TABLE_NAME='" + tableName + "'";
        java.sql.ResultSet rs = stmt.executeQuery(checkSQL);
        if (!rs.next()) {
            log.info("Creating {} table...", tableName);
            stmt.executeUpdate(createTableSQL);
        }
        rs.close();
    }

      private void ensureColumnExists(Statement stmt, String tableName, String columnName, String columnDefinition) throws Exception {
        String sql = "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS "
          + "WHERE TABLE_SCHEMA='findora_db' AND TABLE_NAME='" + tableName + "' AND COLUMN_NAME='" + columnName + "'";
        ResultSet rs = stmt.executeQuery(sql);
        boolean exists = rs.next();
        rs.close();

        if (!exists) {
          log.info("Adding missing column {}.{}", tableName, columnName);
          stmt.executeUpdate("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + columnDefinition);
        }
      }

      private void ensureUniqueIndexIfMissing(Statement stmt, String tableName, String indexName, String columnName) throws Exception {
        String sql = "SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS "
          + "WHERE TABLE_SCHEMA='findora_db' AND TABLE_NAME='" + tableName + "' AND INDEX_NAME='" + indexName + "'";
        ResultSet rs = stmt.executeQuery(sql);
        boolean exists = rs.next();
        rs.close();

        if (!exists) {
          log.info("Creating missing unique index {} on {}({})", indexName, tableName, columnName);
          stmt.executeUpdate("CREATE UNIQUE INDEX " + indexName + " ON " + tableName + " (" + columnName + ")");
        }
      }

      private String resolveUsersIdColumnType(Statement stmt) {
        try {
          ResultSet rs = stmt.executeQuery(
            "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
              + "WHERE TABLE_SCHEMA='findora_db' AND TABLE_NAME='users' AND COLUMN_NAME='id'"
          );
          if (rs.next()) {
            String columnType = rs.getString(1);
            rs.close();
            return columnType == null || columnType.isBlank() ? "INT" : columnType.toUpperCase();
          }
          rs.close();
        } catch (Exception e) {
          log.warn("Could not resolve users.id column type, falling back to INT", e);
        }
        return "INT";
      }
}
