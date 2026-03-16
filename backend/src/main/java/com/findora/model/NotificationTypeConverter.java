package com.findora.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class NotificationTypeConverter implements AttributeConverter<Notification.NotificationType, String> {

    @Override
    public String convertToDatabaseColumn(Notification.NotificationType attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public Notification.NotificationType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return Notification.NotificationType.valueOf(dbData.toUpperCase());
    }
}