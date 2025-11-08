# ============================================================================
# Feature: User Authentication
# 
# This feature demonstrates Gherkin best practices:
# - Declarative scenarios (what, not how)
# - Proper tag usage
# - Background for common setup
# - Scenario Outlines for data-driven tests
# ============================================================================

@e2e @auth @critical
Feature: User Authentication
  As a user
  I want to securely log in to the application
  So that I can access my personal dashboard

  Background:
    Given the application is running
    And I am not logged in

  @smoke
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter email "user@example.com"
    And I enter password "password123"
    And I click the "Sign In" button
    Then I should be redirected to the dashboard
    And I should see "Welcome back, John Doe" message
    And the navigation should show "Logout" button

  @regression
  Scenario: Failed login with invalid credentials
    Given I am on the login page
    When I enter email "wrong@example.com"
    And I enter password "wrongpassword"
    And I click the "Sign In" button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page
    And the email field should retain its value

  @regression
  Scenario: Failed login with missing credentials
    Given I am on the login page
    When I click the "Sign In" button
    Then I should see validation errors:
      | Field    | Message               |
      | Email    | Email is required     |
      | Password | Password is required  |

  @regression
  Scenario Outline: Email validation
    Given I am on the login page
    When I enter email "<email>"
    And I move focus away from email field
    Then I should see validation message "<message>"

    Examples:
      | email              | message                      |
      |                    | Email is required            |
      | invalid            | Email must be valid          |
      | user@              | Email must include domain    |
      | user@example       | Email must include extension |
      | user@example.com   |                              |

  @a11y
  Scenario: Login form is accessible
    Given I am on the login page
    Then the page should have no accessibility violations
    And I should be able to navigate the form with keyboard
    And all form fields should have proper labels
    And error messages should be announced to screen readers

  @smoke @admin
  Scenario: Admin login redirects to admin dashboard
    Given I am on the login page
    When I enter email "admin@example.com"
    And I enter password "admin123"
    And I click the "Sign In" button
    Then I should be redirected to the admin dashboard
    And I should see admin navigation menu

  @regression
  Scenario: Remember me functionality
    Given I am on the login page
    When I enter valid credentials
    And I check the "Remember me" checkbox
    And I click the "Sign In" button
    Then I should be logged in
    When I close and reopen the browser
    Then I should still be logged in

  @regression
  Scenario: Logout functionality
    Given I am logged in
    And I am on the dashboard
    When I click the "Logout" button
    Then I should be logged out
    And I should be redirected to the login page
    And attempting to access the dashboard should redirect to login

  @security
  Scenario: Account lockout after failed attempts
    Given I am on the login page
    When I enter invalid credentials 5 times
    Then I should see message "Account temporarily locked"
    And the login button should be disabled
    And I should see "Try again in 15 minutes"

  @performance
  Scenario: Login response time is acceptable
    Given I am on the login page
    When I enter valid credentials
    And I click the "Sign In" button
    Then the authentication should complete within 2 seconds
    And the dashboard should load within 3 seconds

