package com.findora.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converts UserRole enums to lowercase DB values and reads them case-insensitively.
 */
@Converter(autoApply = false)
public class UserRoleConverter implements AttributeConverter<User.UserRole, String> {

    @Override
    public String convertToDatabaseColumn(User.UserRole attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public User.UserRole convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return User.UserRole.valueOf(dbData.toUpperCase());
    }
}
