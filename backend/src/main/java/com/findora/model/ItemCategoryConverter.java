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

        if (attribute == ItemCategory.NIC) {
            return "NIC";
        }
        if (attribute == ItemCategory.STUDENT_ID) {
            return "Student ID";
        }
        if (attribute == ItemCategory.BANK_CARD) {
            return "Bank Card";
        }
        if (attribute == ItemCategory.WALLET) {
            return "Wallet";
        }
        if (attribute == ItemCategory.OTHER) {
            return "Other";
        }

        throw new IllegalArgumentException("Unsupported item category: " + attribute);
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
