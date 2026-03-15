package com.findora.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class ItemStatusConverter implements AttributeConverter<ItemStatus, String> {

    @Override
    public String convertToDatabaseColumn(ItemStatus attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public ItemStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return ItemStatus.valueOf(dbData.toUpperCase());
    }
}
