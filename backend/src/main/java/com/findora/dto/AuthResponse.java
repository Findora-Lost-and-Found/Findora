package com.findora.dto;

/**
 * AuthResponse - JWT login/register response.
 * Frontend expects exactly: { token, user: { ... } }
 * Note: field name is "token", not "accessToken"!
 */
public class AuthResponse {
    private String token;             // JWT Bearer token; frontend expects this exact key
    private UserDTO user;             // User info
    private String message;           // Optional status message

    public AuthResponse() {
    }

    public AuthResponse(String token, UserDTO user, String message) {
        this.token = token;
        this.user = user;
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UserDTO getUser() {
        return user;
    }

    public void setUser(UserDTO user) {
        this.user = user;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
