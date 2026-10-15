@ignore
Feature: Helper - delete a user and verify it is gone

  Scenario:
    Given url baseUrl
    And path '/Account/v1/User', userId
    And header Authorization = 'Bearer ' + token
    When method delete
    Then status 204

    Given path '/Account/v1/User', userId
    And header Authorization = 'Bearer ' + token
    When method get
    Then status 401
    And match response.code == '1207'
