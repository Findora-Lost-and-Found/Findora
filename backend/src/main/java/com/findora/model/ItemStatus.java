package com.findora.model;

/**
 * ItemStatus - lifecycle state of an item post.
 */
public enum ItemStatus {
    ACTIVE,
    HANDOVER_REQUESTED,
    HELD_BY_SECURITY,
    HANDED_TO_SECURITY,
    CLAIMED,
    CLOSED
}
