package com.findora.util;

import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class NicUtils {

    private static final Pattern OLD_NIC_PATTERN = Pattern.compile("^\\d{9}[VvXx]$");
    private static final Pattern NEW_NIC_PATTERN = Pattern.compile("^\\d{12}$");
    private static final Pattern NIC_EXTRACT_PATTERN = Pattern.compile("(?<![A-Za-z0-9])(?:\\d{9}[VvXx]|\\d{12})(?![A-Za-z0-9])");

    private NicUtils() {
    }

    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("\\s+", "").trim().toUpperCase(Locale.ROOT);
    }

    public static boolean isValid(String value) {
        String normalized = normalize(value);
        return OLD_NIC_PATTERN.matcher(normalized).matches() || NEW_NIC_PATTERN.matcher(normalized).matches();
    }

    public static Optional<String> extractFromText(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }

        Matcher matcher = NIC_EXTRACT_PATTERN.matcher(text);
        if (!matcher.find()) {
            return Optional.empty();
        }

        return Optional.of(normalize(matcher.group()));
    }
}