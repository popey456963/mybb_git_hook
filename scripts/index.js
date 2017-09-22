const express = require('express')
const body_parser = require('body-parser')
const fs = require('fs')
const btoa = require('btoa')
const app = express()

require('dotenv').config()

let request = require('request-promise')
const mybbuser = request.cookie(`mybbuser=${process.env.MYBB_USER}`)
const phpsess = request.cookie(`PHPSESSID=${process.env.PHP_SESSION_ID}`)
const sid = request.cookie(`sid=${process.env.SID}`)

let j = request.jar()
j.setCookie(mybbuser, 'https://clwo.eu')
j.setCookie(phpsess, 'https://clwo.eu')
j.setCookie(sid, 'https://clwo.eu')
request = request.defaults({ jar: j })

let headers = {
  'User-Agent': 'MyBB Hook, by popey456963'
}

const REPO_NAME = "popey456963/mybb_git_hook"

app.use(body_parser.json())

function check(name) {
  if (name.indexOf('pages/') == 0) {
    let file_name = name.split('/')[1].split('.')[0]
    let result = /([0-9]+) - (.*)/.exec(file_name)
    return [result[1], result[2], name]
  }
  return false
}

app.post('/', function (req, res) {
  if (req.body.repository.full_name == REPO_NAME) {
    let changed = []
    for (let commit of req.body.commits) {
      for (let added of commit.added) {
        changed.push(check(added))
      }

      for (let modified of commit.modified) {
        changed.push(check(added))
      }
    }
    changed.filter((item) => !!item)

    update_array(changed)
  }
})

async function update_array(changed) {
  for (let change of changed) {
    set_post(change[0], await request('https://raw.githubusercontent.com/popey456963/mybb_git_hook/master/' + change[2]))
  }
}

async function update_github() {
  for (let file of fs.readdirSync('../pages/')) {
    console.log(file)
    let file_name = `pages/${file}`
    console.log(`https://api.github.com/repos/${REPO_NAME}/contents/${file_name}`)
    request({
      method: 'PUT',
      uri: `https://api.github.com/repos/${REPO_NAME}/contents/${file_name}`,
      json: true,
      body: {
        message: "Mirror MyBB",
        content: btoa(fs.readFileSync('../pages/' + file, { encoding: 'utf-8'})),
        sha: (await request({ uri: `https://api.github.com/repos/${REPO_NAME}/contents/pages/${file}`, headers})).sha
      },
      headers
    })
  }
}

update_github()

async function get_post(post_id) {
  let html = await request(`https://clwo.eu/xmlhttp.php?action=edit_post&do=get_post&pid=${post_id}&id=pid_${post_id}`)
  return html
}

async function set_post(post_id, content) {
  let html = await request({
    uri: `https://clwo.eu/xmlhttp.php?action=edit_post&do=update_post&pid=${post_id}&my_post_key=${process.env.MY_POST_KEY}`,
    method: 'POST',
    formData: {
      value: content,
      id: `pid_${post_id}`,
      editreason: 'Automatic Edit'
    }
  })
}

;(async () => {
  console.log(await get_post('12240'))
  set_post('12240', JSON.parse(await get_post('12240')) + ' test');
})()

app.listen(7990, function () {
  console.log('Example app listening on port 7990!')
})