package com.findora.dto;

import java.util.List;

/**
 * PaginatedResponse - Pagination response that matches Node API exactly.
 * Frontend code reads: content, pageNumber, pageSize, totalPages, totalElements
 * Do not rename these fields!
 */
public class PaginatedResponse<T> {
    private List<T> content;           // Array of items/claims/notifications
    private Integer pageNumber;        // 0-based page index
    private Integer pageSize;          // Items per page
    private Integer totalPages;        // Total pages in result set
    private Integer totalElements;     // Total items matching filter

    public PaginatedResponse() {
    }

    public PaginatedResponse(List<T> content, Integer pageNumber, Integer pageSize, Integer totalPages, Integer totalElements) {
        this.content = content;
        this.pageNumber = pageNumber;
        this.pageSize = pageSize;
        this.totalPages = totalPages;
        this.totalElements = totalElements;
    }

    public List<T> getContent() {
        return content;
    }

    public void setContent(List<T> content) {
        this.content = content;
    }

    public Integer getPageNumber() {
        return pageNumber;
    }

    public void setPageNumber(Integer pageNumber) {
        this.pageNumber = pageNumber;
    }

    public Integer getPageSize() {
        return pageSize;
    }

    public void setPageSize(Integer pageSize) {
        this.pageSize = pageSize;
    }

    public Integer getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(Integer totalPages) {
        this.totalPages = totalPages;
    }

    public Integer getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(Integer totalElements) {
        this.totalElements = totalElements;
    }
}
