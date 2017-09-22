const express = require('express')
const body_parser = require('body-parser')
const github_api = require('github')
const fs = require('fs')
const btoa = require('btoa')
const atob = require('atob')
const app = express()
const github = new github_api({
  'user-agent': 'MyBB Syncer by Popey456963'
})

require('dotenv').config()

github.authenticate({
  type: 'basic',
  username: process.env.GH_USERNAME,
  password: process.env.GH_PASSWORD
})


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

async function update_github(file) {
  let path = `pages/${file}`
  github.repos.updateFile({
    owner: 'popey456963',
    repo: 'mybb_git_hook',
    path,
    message: 'Sync ' + file,
    content: btoa(fs.readFileSync(`../${path}`, { encoding: 'utf-8'})),
    sha: (JSON.parse(await request({ uri: `https://api.github.com/repos/${REPO_NAME}/contents/${path}`, headers}))).sha
  })
}

async function update_local(github) {
  for (let file of fs.readdirSync('../pages/')) {
    let path = `pages/${file}`
    post_id = /([0-9]+) - (.*)/.exec(file)[1]
    let post_html = github ? await get_github_file(path) : await get_post(post_id)
    let post_file = fs.readFileSync(`../${path}`, { encoding: 'utf-8'})
    if (post_html != post_file) {
      fs.writeFileSync('../pages/' + file, post_html)
      github ? update_mybb(file) : update_github(file)
    }
  }
}

async function get_post(post_id) {
  let html = await request(`https://clwo.eu/xmlhttp.php?action=edit_post&do=get_post&pid=${post_id}&id=pid_${post_id}`)
  return JSON.parse(html)
}

async function get_github_file(path) {
  let data = await github.repos.getContent({
    owner: 'popey456963',
    repo: 'mybb_git_hook',
    path
  })
  return atob(data.data.content)
}

async function update_mybb(file) {
  let post_file = fs.readFileSync(`../${file}`, { encoding: 'utf-8'})
  let file_name = file.split('/')[1].split('.')[0]
  let result = /([0-9]+) - (.*)/.exec(file_name)
  set_post(result[1], post_file)
}

async function set_post(post_id, content) {
  let html = await request({
    uri: `https://clwo.eu/xmlhttp.php?action=edit_post&do=update_post&pid=${post_id}&my_post_key=${process.env.MY_POST_KEY}`,
    method: 'POST',
    formData: {
      value: content,
      id: `pid_${post_id}`,
      editreason: 'Sync with Github'
    }
  })
}

;(async () => {
  setInterval(() => update_local(false), 1000 * 60 * 6)
  setTimeout(() => setInterval(() => update_local(true), 1000 * 60 * 6), 1000 * 60 * 3)
  console.log(await get_github_file('pages/12240 - Test Post.mybb'))
  // console.log(await get_post('12240'))
  // set_post('12240', await get_post('12240') + ' test');
})()

app.listen(7990, function () {
  console.log('Example app listening on port 7990!')
})