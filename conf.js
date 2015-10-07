/**
 * Created by Mihai on 07.10.2015.
 */
var request = require('request');

request.get('http://45.55.33.155/api/domain-name', function (error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log(body) // Show the HTML for the Google homepage.
    }
});
