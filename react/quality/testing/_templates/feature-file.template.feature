# Gherkin Feature File Template

# Tag taxonomy:
# @e2e, @integration, @unit - Test layer
# @smoke, @regression - Test suite
# @critical, @high, @medium, @low - Priority
# @feature-name - Domain/feature
# @a11y, @security, @performance - Special concerns

@e2e @feature-name @priority
Feature: [Feature Name]
  As a [user type]
  I want to [action]
  So that [benefit]

  # Background: Common setup for all scenarios
  Background:
    Given the application is running
    And I am [authenticated state]

  # ============================================================================
  # SMOKE TESTS - Critical happy paths
  # ============================================================================
  
  @smoke
  Scenario: [Happy path scenario name]
    Given I am on the [page name] page
    When I [perform action]
    And I [perform another action]
    Then I should see [expected outcome]
    And the [element] should [expected state]

  # ============================================================================
  # REGRESSION TESTS - Edge cases and errors
  # ============================================================================
  
  @regression
  Scenario: [Error scenario name]
    Given I am on the [page name] page
    When I [perform invalid action]
    Then I should see an error message "[error text]"
    And the [element] should [expected state]

  # ============================================================================
  # DATA-DRIVEN TESTS - Scenario Outlines
  # ============================================================================
  
  @regression
  Scenario Outline: [Validation scenario name]
    Given I am on the [page name] page
    When I enter "<input>" in the [field name] field
    And I [trigger validation]
    Then I should see validation message "<message>"

    Examples:
      | input        | message                 |
      |              | Field is required       |
      | invalid      | Invalid format          |
      | valid@val.id |                         |

  # ============================================================================
  # ACCESSIBILITY TESTS
  # ============================================================================
  
  @a11y
  Scenario: [Feature] is accessible
    Given I am on the [page name] page
    Then the page should have no accessibility violations
    And I should be able to navigate with keyboard
    And all interactive elements should have proper labels

  # ============================================================================
  # PERFORMANCE TESTS
  # ============================================================================
  
  @performance
  Scenario: [Feature] performs within acceptable time
    Given I am on the [page name] page
    When I [perform action]
    Then the [action] should complete within [N] seconds
    And the page should remain responsive

  # ============================================================================
  # SECURITY TESTS
  # ============================================================================
  
  @security
  Scenario: [Feature] requires authentication
    Given I am not logged in
    When I attempt to access [protected resource]
    Then I should be redirected to the login page
    And I should see message "[auth required message]"

  # ============================================================================
  # DATA TABLES - Complex test data
  # ============================================================================
  
  @regression
  Scenario: [Scenario with complex data]
    Given I am on the [page name] page
    When I create a [resource] with the following details:
      | Field      | Value        |
      | Name       | Test Name    |
      | Email      | test@test.com|
      | Role       | User         |
    Then the [resource] should be created
    And I should see the following details:
      | Field      | Value        |
      | Name       | Test Name    |
      | Email      | test@test.com|

  # ============================================================================
  # MULTI-STEP WORKFLOWS
  # ============================================================================
  
  @regression
  Scenario: [Complete workflow scenario]
    Given I am on the [start page] page
    When I click the [button] button
    And I fill in the [form name] form
    And I submit the form
    Then I should be on the [next page] page
    And the [status] should be [expected status]
    When I [perform final action]
    Then I should see confirmation message
    And an email should be sent to [recipient]

# ============================================================================
# BEST PRACTICES
# ============================================================================
# 1. Use declarative language (what, not how)
# 2. Each scenario should be independent
# 3. Use Background for common setup
# 4. Tag scenarios appropriately
# 5. Keep scenarios focused and readable
# 6. Use Scenario Outlines for data-driven tests
# 7. Write from user perspective
# 8. Avoid technical implementation details

