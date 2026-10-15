@ignore
Feature: Helper - generate a token for the given credentials

  Scenario:
    Given url baseUrl
    And path '/Account/v1/GenerateToken'
    And request credentials
    When method post
    Then status 200
    * def token = response.token
