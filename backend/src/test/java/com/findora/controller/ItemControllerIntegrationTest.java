package com.findora.controller;

import java.time.LocalDate;
import java.time.LocalTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.findora.dto.PaginatedResponse;
import com.findora.model.Item;
import com.findora.model.ItemCategory;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.model.User;
import com.findora.repository.ItemRepository;
import com.findora.repository.UserRepository;
import com.findora.security.JwtTokenProvider;

/**
 * ItemControllerIntegrationTest - Test pagination and item endpoints.
 * Uses H2 database (@ActiveProfiles("test")) for integration tests.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ItemControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User testUser;
    private String testToken;

    @BeforeEach
    @SuppressWarnings("unused")
    public void setUp() {
        itemRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword("hashedpassword");
        testUser.setFullName("Test User");
        testUser.setRole(User.UserRole.STUDENT);
        testUser.setIsVerified(true);
        testUser = userRepository.save(testUser);

        // Generate JWT token
        testToken = jwtTokenProvider.generateToken(
            testUser.getUsername(),
            testUser.getId().toString(),
            testUser.getRole().name()
        );

        // Create test items
        for (int i = 1; i <= 25; i++) {
            Item item = new Item();
            item.setUserId(testUser.getId());
            item.setType(i % 2 == 0 ? ItemType.LOST : ItemType.FOUND);
            item.setCategory(ItemCategory.WALLET);
            item.setItemName("Item " + i);
            item.setDescription("Test item " + i);
            item.setLocation("Location " + i);
            item.setDate(LocalDate.now());
            item.setTime(LocalTime.now());
            item.setStatus(ItemStatus.ACTIVE);
            itemRepository.save(item);
        }
    }

    /**
     * Test GET /api/items returns paginated response with correct structure.
     */
    @Test
    void testGetItemsPagination() throws Exception {
        MvcResult result = mockMvc.perform(
            get("/api/items")
                .param("page", "0")
                .param("size", "10")
                .header("Authorization", "Bearer " + testToken)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pageNumber").value(0))
            .andExpect(jsonPath("$.pageSize").value(10))
            .andExpect(jsonPath("$.totalElements").value(25))
            .andExpect(jsonPath("$.totalPages").value(3))
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.content[0].id").isNumber())
            .andExpect(jsonPath("$.content[0].name").isString())
            .andExpect(jsonPath("$.content[0].category").isString())
            .andReturn();

        // Verify response shape
        String json = result.getResponse().getContentAsString();
        PaginatedResponse<?> response = objectMapper.readValue(json, PaginatedResponse.class);

        assert response.getPageNumber() == 0;
        assert response.getPageSize() == 10;
        assert response.getTotalElements() == 25;
        assert response.getTotalPages() == 3;
        assert response.getContent().size() == 10;
    }

    /**
     * Test invalid size parameter returns 400 error.
     */
    @Test
    void testGetItemsWithInvalidSize() throws Exception {
        mockMvc.perform(
            get("/api/items")
                .param("page", "0")
                .param("size", "200")  // > 100
                .header("Authorization", "Bearer " + testToken)
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").exists());
    }

    /**
     * Test negative page parameter returns 400 error.
     */
    @Test
    void testGetItemsWithNegativePage() throws Exception {
        mockMvc.perform(
            get("/api/items")
                .param("page", "-1")
                .param("size", "10")
                .header("Authorization", "Bearer " + testToken)
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * Test category filter.
     */
    @Test
    void testGetItemsWithCategoryFilter() throws Exception {
        mockMvc.perform(
            get("/api/items")
                .param("page", "0")
                .param("size", "10")
                .param("category", "WALLET")
                .header("Authorization", "Bearer " + testToken)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pageNumber").value(0))
            .andExpect(jsonPath("$.totalElements").value(25));
    }

    /**
     * Test sorting by createdAt DESC (default).
     */
    @Test
    void testGetItemsWithSorting() throws Exception {
        mockMvc.perform(
            get("/api/items")
                .param("page", "0")
                .param("size", "10")
                .param("sort", "createdAt,desc")
                .header("Authorization", "Bearer " + testToken)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0]").exists());
    }

    /**
     * Test pagination with second page.
     */
    @Test
    void testGetItemsSecondPage() throws Exception {
        mockMvc.perform(
            get("/api/items")
                .param("page", "1")
                .param("size", "10")
                .header("Authorization", "Bearer " + testToken)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pageNumber").value(1))
            .andExpect(jsonPath("$.content.length()").value(10));
    }

    /**
     * Test pagination with last page (partial results).
     */
    @Test
    void testGetItemsLastPage() throws Exception {
        mockMvc.perform(
            get("/api/items")
                .param("page", "2")
                .param("size", "10")
                .header("Authorization", "Bearer " + testToken)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pageNumber").value(2))
            .andExpect(jsonPath("$.content.length()").value(5)); // 25 items total, page 2 has 5
    }
}
