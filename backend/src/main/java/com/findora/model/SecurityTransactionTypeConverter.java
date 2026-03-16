package com.findora.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class SecurityTransactionTypeConverter implements AttributeConverter<SecurityTransaction.TransactionType, String> {

    @Override
    public String convertToDatabaseColumn(SecurityTransaction.TransactionType attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public SecurityTransaction.TransactionType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return SecurityTransaction.TransactionType.valueOf(dbData.toUpperCase());
    }
}