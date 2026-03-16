package com.findora.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class SecurityTransactionStatusConverter implements AttributeConverter<SecurityTransaction.TransactionStatus, String> {

    @Override
    public String convertToDatabaseColumn(SecurityTransaction.TransactionStatus attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public SecurityTransaction.TransactionStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return SecurityTransaction.TransactionStatus.valueOf(dbData.toUpperCase());
    }
}