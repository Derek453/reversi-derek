/*****************************/
/* set up the static file server*/
let static = require("node-static");

/*set up the http server */
let http = require("http");

/*if we are running on heroku */
let port = process.env.PORT;
let directory = __dirname + "/public";

/* if not on heroku, adjust our port and directory */
if ((typeof port == 'undefined') || (port == NULL)) {
    port = 8080;
    directory = "./public";
}

/* set up static file web server to deliver files from the file system */
let file = new static.Server(directory);

let app = http.createServer(
    function (request, response) {
        request.addListener("end",
            function () {
                file.serve(request, response)
            }
        ).resume()
    }
).listen(port)

console.log("The server is running.")
