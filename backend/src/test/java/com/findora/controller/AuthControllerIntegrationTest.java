package com.findora.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.findora.model.User;
import com.findora.repository.UserRepository;

/**
 * AuthControllerIntegrationTest - Test authentication endpoints.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    @SuppressWarnings("unused")
    public void setUp() {
        userRepository.deleteAll();

        // Create a test user
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword(passwordEncoder.encode("TestPass@123"));
        user.setFullName("Test User");
        user.setRole(User.UserRole.STUDENT);
        user.setIsVerified(true);
        user.setIsApproved(true);
        userRepository.save(user);
    }

    /**
     * Test successful login.
     */
    @Test
    void testLoginSuccess() throws Exception {
        String loginJson = objectMapper.writeValueAsString(
            new java.util.HashMap<String, String>() {{
                put("username", "testuser");
                put("password", "TestPass@123");
            }}
        );

        mockMvc.perform(
            post("/api/auth/login")
                .contentType("application/json")
                .content(loginJson)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").exists())
            .andExpect(jsonPath("$.token").isString())
            .andExpect(jsonPath("$.user.id").isNumber())
            .andExpect(jsonPath("$.user.username").value("testuser"))
            .andExpect(jsonPath("$.user.name").value("Test User"))
            .andExpect(jsonPath("$.user.full_name").value("Test User"))
            .andExpect(jsonPath("$.user.email").value("test@example.com"))
            .andExpect(jsonPath("$.user.role").value("student"));
    }

    /**
     * Test login with frontend payload shape.
     */
    @Test
    void testLoginWithIdentifier() throws Exception {
        String loginJson = objectMapper.writeValueAsString(
            new java.util.HashMap<String, String>() {{
                put("identifier", "test@example.com");
                put("password", "TestPass@123");
            }}
        );

        mockMvc.perform(
            post("/api/auth/login")
                .contentType("application/json")
                .content(loginJson)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").exists())
            .andExpect(jsonPath("$.user.username").value("testuser"))
            .andExpect(jsonPath("$.user.full_name").value("Test User"))
            .andExpect(jsonPath("$.user.role").value("student"));
    }

    /**
     * Test login with invalid password.
     */
    @Test
    void testLoginInvalidPassword() throws Exception {
        String loginJson = objectMapper.writeValueAsString(
            new java.util.HashMap<String, String>() {{
                put("username", "testuser");
                put("password", "WrongPassword");
            }}
        );

        mockMvc.perform(
            post("/api/auth/login")
                .contentType("application/json")
                .content(loginJson)
        )
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").exists());
    }

    /**
     * Test login with non-existent user.
     */
    @Test
    void testLoginUserNotFound() throws Exception {
        String loginJson = objectMapper.writeValueAsString(
            new java.util.HashMap<String, String>() {{
                put("username", "nonexistent");
                put("password", "SomePassword");
            }}
        );

        mockMvc.perform(
            post("/api/auth/login")
                .contentType("application/json")
                .content(loginJson)
        )
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * Test login with email instead of username.
     */
    @Test
    void testLoginWithEmail() throws Exception {
        String loginJson = objectMapper.writeValueAsString(
            new java.util.HashMap<String, String>() {{
                put("email", "test@example.com");
                put("password", "TestPass@123");
            }}
        );

        mockMvc.perform(
            post("/api/auth/login")
                .contentType("application/json")
                .content(loginJson)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").exists());
    }

    /**
     * Test registration success.
     */
    @Test
    void testRegisterSuccess() throws Exception {
        String registerJson = objectMapper.writeValueAsString(
            new java.util.HashMap<String, String>() {{
                put("username", "newuser");
                put("email", "new@example.com");
                put("password", "NewPass@123");
                put("fullName", "New User");
                put("role", "STUDENT");
            }}
        );

        mockMvc.perform(
            post("/api/auth/register")
                .contentType("application/json")
                .content(registerJson)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token").exists())
            .andExpect(jsonPath("$.user.username").value("newuser"))
            .andExpect(jsonPath("$.user.name").value("New User"))
            .andExpect(jsonPath("$.user.full_name").value("New User"))
            .andExpect(jsonPath("$.user.role").value("student"));
    }

    /**
     * Test registration with frontend payload shape.
     */
    @Test
    void testRegisterWithFrontendPayload() throws Exception {
        String registerJson = objectMapper.writeValueAsString(
            new java.util.HashMap<String, String>() {{
                put("username", "newuser2");
                put("email", "new2@example.com");
                put("password", "NewPass@123");
                put("full_name", "New User 2");
                put("role", "student");
            }}
        );

        mockMvc.perform(
            post("/api/auth/register")
                .contentType("application/json")
                .content(registerJson)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token").exists())
            .andExpect(jsonPath("$.user.username").value("newuser2"))
            .andExpect(jsonPath("$.user.full_name").value("New User 2"))
            .andExpect(jsonPath("$.user.role").value("student"));
    }

    /**
     * Test registration with duplicate username.
     */
    @Test
    void testRegisterDuplicateUsername() throws Exception {
        String registerJson = objectMapper.writeValueAsString(
            new java.util.HashMap<String, String>() {{
                put("username", "testuser");  // Already exists
                put("email", "another@example.com");
                put("password", "TestPass@123");
                put("fullName", "Another User");
            }}
        );

        mockMvc.perform(
            post("/api/auth/register")
                .contentType("application/json")
                .content(registerJson)
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").exists());
    }
}
