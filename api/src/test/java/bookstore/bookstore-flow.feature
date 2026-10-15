Feature: Book Store API - user book collection flow

  Register and log in, search the catalogue, add a book, list the
  collection, delete the book, log out. Each run uses its own user,
  which is deleted afterwards.

  Background:
    * url baseUrl
    * def bookSchema = read('book-schema.json')
    * def userName = 'qa_karate_' + java.lang.System.currentTimeMillis() + '_' + Math.floor(Math.random() * 10000)
    * def credentials = { userName: '#(userName)', password: '#(password)' }
    * def searchTerm = 'git'
    # The API has no logout endpoint, so cleanup needs a token of its own
    * configure afterScenario =
      """
      function() {
        if (!karate.get('userId')) return;
        var t = karate.call('classpath:bookstore/token.feature', { credentials: karate.get('credentials') });
        if (!t.token) return;
        karate.call('classpath:bookstore/delete-user.feature', { userId: karate.get('userId'), token: t.token });
      }
      """

  Scenario: Register, login, search, add, list, delete a book and logout

    # ---- 1. Register ----
    Given path '/Account/v1/User'
    And request credentials
    When method post
    Then status 201
    And match response == { userID: '#uuid', username: '#(userName)', books: [] }
    * def userId = response.userID

    # ---- 1. Login ----
    Given path '/Account/v1/GenerateToken'
    And request credentials
    When method post
    Then status 200
    And match response contains { status: 'Success', result: 'User authorized successfully.', token: '#string' }
    * def token = response.token

    Given path '/Account/v1/Login'
    And request credentials
    When method post
    Then status 200
    And match response.userId == userId
    And match response.username == userName
    # Login re-issues the session token; GenerateToken/Login revoke the previous one (plan R8)
    * def token = response.token

    Given path '/Account/v1/Authorized'
    And request credentials
    When method post
    Then status 200
    # body is a bare `true`, which Karate reads as text
    And match karate.toString(response) == 'true'

    # ---- 2. Search the catalogue and add a book ----
    Given path '/BookStore/v1/Books'
    When method get
    Then status 200
    And match each response.books == bookSchema
    * def hits = karate.filter(response.books, function(b){ return b.title.toLowerCase().indexOf(searchTerm) >= 0 })
    * assert hits.length > 0
    * def book = hits[0]

    Given path '/BookStore/v1/Book'
    And param ISBN = book.isbn
    When method get
    Then status 200
    And match response == book

    Given path '/BookStore/v1/Books'
    And header Authorization = 'Bearer ' + token
    And request { userId: '#(userId)', collectionOfIsbns: [ { isbn: '#(book.isbn)' } ] }
    When method post
    Then status 201
    And match response == { books: [ { isbn: '#(book.isbn)' } ] }

    # ---- 3. See the collection ----
    Given path '/Account/v1/User', userId
    And header Authorization = 'Bearer ' + token
    When method get
    Then status 200
    And match response.books == '#[1]'
    And match response.books[0] == book

    # ---- 4. Delete the book from the collection ----
    Given path '/BookStore/v1/Book'
    And header Authorization = 'Bearer ' + token
    And request { isbn: '#(book.isbn)', userId: '#(userId)' }
    When method delete
    Then status 204

    Given path '/Account/v1/User', userId
    And header Authorization = 'Bearer ' + token
    When method get
    Then status 200
    And match response.books == []

    # Deleting again is rejected: the book is no longer in the collection
    Given path '/BookStore/v1/Book'
    And header Authorization = 'Bearer ' + token
    And request { isbn: '#(book.isbn)', userId: '#(userId)' }
    When method delete
    Then status 400
    And match response == { code: '1206', message: "ISBN supplied is not available in User's Collection!" }

    # ---- 5. Logout ----
    # No logout endpoint exists (plan R4): logging out = the client discards its token.
    * def token = null
    Given path '/Account/v1/User', userId
    When method get
    Then status 401
    And match response == { code: '1200', message: 'User not authorized!' }
