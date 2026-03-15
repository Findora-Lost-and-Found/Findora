package com.findora.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class ItemCategoryConverter implements AttributeConverter<ItemCategory, String> {

    @Override
    public String convertToDatabaseColumn(ItemCategory attribute) {
        if (attribute == null) {
            return null;
        }

        return switch (attribute) {
            case NIC -> "NIC";
            case STUDENT_ID -> "Student ID";
            case BANK_CARD -> "Bank Card";
            case WALLET -> "Wallet";
            case OTHER -> "Other";
        };
    }

    @Override
    public ItemCategory convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }

        String normalized = dbData.trim().replace(' ', '_').toUpperCase();
        return ItemCategory.valueOf(normalized);
    }
}
