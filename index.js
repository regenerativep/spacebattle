var express = require("express");

var webserver = null;
function main()
{
    webserver = express();
    webserver.use(express.static("public"));
    let port = 8080;
    webserver.listen(port, () => { console.log("webserver listening on http://127.0.0.1:" + port); });
}
main();