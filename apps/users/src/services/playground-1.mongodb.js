/* global use, db */
// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use('ubs_users');

// Search for documents in the current collection.
db.getCollection('entityownerships')
    .find(
        {
            entityGroup: 'LOTUS_QB',
            entityName: 'QUESTION_BOOK',
            // 'userCapabilities.userId': '65bd49ec6b9685767af28477',
        },
        {
            /*
             * Projection
             * _id: 0, // exclude _id
             * fieldA: 1 // include field
             */
        },
    )
    .sort({
        /*
         * fieldA: 1 // ascending
         * fieldB: -1 // descending
         */
    });
