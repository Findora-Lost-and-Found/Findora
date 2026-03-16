package com.findora.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class ClaimStatusConverter implements AttributeConverter<Claim.ClaimStatus, String> {

    @Override
    public String convertToDatabaseColumn(Claim.ClaimStatus attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public Claim.ClaimStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return Claim.ClaimStatus.valueOf(dbData.toUpperCase());
    }
}
