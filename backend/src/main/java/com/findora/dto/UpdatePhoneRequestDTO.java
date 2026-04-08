package com.findora.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class UpdatePhoneRequestDTO {

    @JsonProperty("phone")
    private String phone;

    public UpdatePhoneRequestDTO() {
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
