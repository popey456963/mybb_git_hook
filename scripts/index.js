const express = require('express')
const body_parser = require('body-parser')
const app = express()

const REPO_NAME = "popey456963/mybb_git_hook"

app.use(bodyParser.json())

app.post('/', function (req, res) {
  if (req.body.repository.full_name == REPO_NAME) {
  	if (req.body.hook.events[0] == 'push') {
  		console.log(req.body)
  	}
  }
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})