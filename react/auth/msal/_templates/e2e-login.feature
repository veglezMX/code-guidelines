# E2E Login Feature Template
#
# Copy this template and customize for your E2E authentication tests.
# Use Gherkin syntax for behavior-driven testing with Cucumber.js + Playwright.

@auth @smoke
Feature: User Authentication

  As a user
  I want to sign in to the application
  So that I can access protected features

  Background:
    Given the application is in test mode
    And I am on the home page

  @critical @happy-path
  Scenario: User successfully logs in and accesses dashboard
    Given I am not authenticated
    When I navigate to "/login"
    And I click the "Sign In" button
    And I select "Login as User" from dev login
    Then I should be redirected to "/dashboard"
    And I should see "Welcome, Test User"
    And I should see the user menu

  @critical @admin
  Scenario: Admin logs in and accesses admin panel
    Given I am not authenticated
    When I navigate to "/login"
    And I select "Login as Admin" from dev login
    Then I should be redirected to "/dashboard"
    When I navigate to "/admin"
    Then I should see the admin panel
    And I should not see "Access denied"

  @authorization @negative
  Scenario: User cannot access admin panel
    Given I am logged in as "User"
    When I navigate to "/admin"
    Then I should see "Access denied"
    And I should not see the admin panel

  @authorization @roles
  Scenario: Moderator can access moderation tools
    Given I am logged in as "Moderator"
    When I navigate to "/moderation"
    Then I should see the moderation panel
    And I should see moderation tools

  @api @integration
  Scenario: Authenticated user calls protected API
    Given I am logged in as "User"
    When I navigate to "/dashboard"
    Then the API should receive a Bearer token
    And the API should return user data
    And I should see my user data on the dashboard

  @api @authorization
  Scenario: User with insufficient permissions receives 403
    Given I am logged in as "Reader"
    When I attempt to create a new item
    Then the API should return 403 Forbidden
    And I should see "You don't have permission to perform this action"

  @logout @smoke
  Scenario: User logs out successfully
    Given I am logged in as "User"
    When I click the "Sign Out" button
    Then I should be redirected to "/login"
    And I should not be authenticated
    And the session should be cleared

  @token-refresh
  Scenario: Token refresh happens automatically
    Given I am logged in as "User"
    And my token is about to expire
    When I make an API call
    Then the token should be refreshed automatically
    And the API call should succeed

  @error-handling
  Scenario: User sees error message on authentication failure
    Given I am not authenticated
    When I navigate to a protected route "/dashboard"
    And the authentication fails
    Then I should see "Authentication failed"
    And I should be redirected to "/login"

  @multi-role
  Scenario Outline: Different roles see appropriate content
    Given I am logged in as "<role>"
    When I navigate to "/dashboard"
    Then I should see "<content>"
    And I should <admin_panel> see the admin panel

    Examples:
      | role      | content              | admin_panel |
      | User      | Welcome, Test User   | not         |
      | Admin     | Welcome, Test Admin  |             |
      | Moderator | Welcome, Test Moderator | not      |

  @session @persistence
  Scenario: User session persists across page refresh
    Given I am logged in as "User"
    When I refresh the page
    Then I should still be authenticated
    And I should see "Welcome, Test User"

  @deep-link
  Scenario: User is redirected to intended page after login
    Given I am not authenticated
    When I navigate to "/profile"
    Then I should be redirected to login
    When I select "Login as User" from dev login
    Then I should be redirected to "/profile"
    And I should see my profile page

# TODO: Add scenarios specific to your application
# Examples:
# - Multi-factor authentication
# - Social login providers
# - Password reset flow
# - Profile editing
# - Role switching
# - Account linking

