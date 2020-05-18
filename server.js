var http = require('http')
var port = 8080

var server = http.createServer(function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/html'})
  response.write('<html> <head> <title>Node Sample App</title> <style>body {margin-top: 40px; background-color: #422;} </style> </head><body> <div style=color:white;text-align:center> <h1>Node Sample App</h1> <h2>Congratulations!</h2> <p>This application is now running on a container in Amazon ECS.</p> </div></body></html>')
  response.end()
})

server.listen(port)

console.log('Server running at http://localhost:' + port)
