package bookstore;

import com.intuit.karate.junit5.Karate;

class BookstoreTest {

    @Karate.Test
    Karate bookstoreFlow() {
        return Karate.run("bookstore-flow").relativeTo(getClass());
    }
}
