package com.findora.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;

/**
 * JwtTokenProvider - Generate and validate JWT tokens.
 * Tokens expire after app.jwt.expiration.ms (24 hours by default).
 */
@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration.ms}")
    private long jwtExpirationMs;

    /**
     * Generate JWT token for user.
     * Frontend expects token in Bearer format: "Authorization: Bearer <token>"
     */
    public String generateToken(String username, String userId, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("role", role);

        return createToken(claims, username);
    }

    /**
     * Extract username from token.
     */
    public String getUsernameFromToken(String token) {
        try {
            return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
        } catch (JwtException e) {
            log.error("Failed to extract username from token", e);
            return null;
        }
    }

    /**
     * Extract userId from token claims.
     */
    public String getUserIdFromToken(String token) {
        try {
            return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("userId", String.class);
        } catch (JwtException e) {
            log.error("Failed to extract userId from token", e);
            return null;
        }
    }

    /**
     * Extract role from token claims.
     */
    public String getRoleFromToken(String token) {
        try {
            return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("role", String.class);
        } catch (JwtException e) {
            log.error("Failed to extract role from token", e);
            return null;
        }
    }

    /**
     * Validate JWT token.
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.error("JWT token expired", e);
        } catch (UnsupportedJwtException e) {
            log.error("JWT token unsupported", e);
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token format", e);
        } catch (SignatureException e) {
            log.error("JWT token signature invalid", e);
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string empty", e);
        }
        return false;
    }

    /**
     * Create JWT token.
     */
    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
            .claims(claims)
            .subject(subject)
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(getSigningKey())
            .compact();
    }

    /**
     * Get signing key from secret.
     */
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }
}
