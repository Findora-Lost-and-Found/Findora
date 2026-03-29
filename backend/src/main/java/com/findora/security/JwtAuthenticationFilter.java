package com.findora.security;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.findora.model.User;
import com.findora.repository.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * JwtAuthenticationFilter - Extract and validate JWT from request headers.
 * Intercepts all requests and sets SecurityContext if valid token found.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    public JwtAuthenticationFilter(
            JwtTokenProvider jwtTokenProvider,
            UserDetailsService userDetailsService,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Filter requests to extract and validate JWT token.
     * Expected header: "Authorization: Bearer <token>"
     */
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                  @NonNull HttpServletResponse response,
                                  @NonNull FilterChain filterChain) throws ServletException, IOException {
        String jwt = extractTokenFromRequest(request);

        if (StringUtils.hasText(jwt) && jwtTokenProvider.validateToken(jwt)) {
            String username = jwtTokenProvider.getUsernameFromToken(jwt);

            if (username != null) {
                try {
                    User user = userRepository.findByUsername(username).orElse(null);
                    if (user == null) {
                        log.warn("JWT principal '{}' not found in database, skipping authentication", username);
                        filterChain.doFilter(request, response);
                        return;
                    }

                    if (Boolean.TRUE.equals(user.getIsSuspended())
                            && user.getSuspensionUntil() != null
                            && LocalDateTime.now().isAfter(user.getSuspensionUntil())) {
                        user.setIsSuspended(false);
                        user.setSuspensionUntil(null);
                        user.setBadPostAttempts(0);
                        userRepository.save(user);
                    }

                    if (Boolean.TRUE.equals(user.getIsBanned())) {
                        writeForbidden(response, "Your account is permanently banned. You can submit an appeal.");
                        return;
                    }

                    if (Boolean.TRUE.equals(user.getIsSuspended())) {
                        String message = "Your account is suspended. You can submit an appeal.";
                        if (user.getSuspensionUntil() != null) {
                            message = "Your account is suspended until " + user.getSuspensionUntil() + ". You can submit an appeal.";
                        }
                        writeForbidden(response, message);
                        return;
                    }

                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                        );
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    log.debug("Authenticated user: {}", username);
                } catch (UsernameNotFoundException e) {
                    log.warn("JWT principal '{}' not found in database, skipping authentication", username);
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extract JWT token from "Authorization: Bearer <token>" header.
     */
    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private void writeForbidden(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(Map.of(
            "success", false,
            "message", message
        )));
    }
}
