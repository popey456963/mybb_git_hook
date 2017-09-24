const express = require('express')
const body_parser = require('body-parser')
const github_api = require('github')
const fs = require('fs')
const btoa = require('btoa')
const atob = require('atob')

require('dotenv').config()

const USER_AGENT = 'MyBB Syncer (Popey456963)'
const REPO_USER = 'popey456963'
const REPO_NAME = 'mybb_git_hook'
const MYBB_URL = 'https://clwo.eu'
const REPO_URL = `${REPO_USER}/${REPO_NAME}`
const PAGE_REGEX = /^pages\/([0-9]+) - (.*)\.mybb$/

const headers = {
  'User-Agent': USER_AGENT
}

// Handle Github API Login
const github = new github_api({ 'user-agent': USER_AGENT })
github.authenticate({ type: 'basic', username: process.env.GH_USERNAME, password: process.env.GH_PASSWORD })

// Setup Request with MyBB Cookies
let request = require('request-promise')
const mybbuser = request.cookie(`mybbuser=${process.env.MYBB_USER}`)
const phpsess = request.cookie(`PHPSESSID=${process.env.PHP_SESSION_ID}`)
const sid = request.cookie(`sid=${process.env.SID}`)

let j = request.jar()
j.setCookie(mybbuser, 'https://clwo.eu')
j.setCookie(phpsess, 'https://clwo.eu')
j.setCookie(sid, 'https://clwo.eu')
request = request.defaults({ jar: j })

const app = express()
app.use(body_parser.json())

app.post('/', function (req, res) {
  if (req.body.repository.full_name === REPO_URL) {
    for (let commit of req.body.commits) {
      commit.added
        .concat(commit.modified)
        .map((page) => PAGE_REGEX.exec(page))
        .filter((page) => page)
        .map((page) => {
          save_github_page_to_disk(page[0], page[1])
        })
    }
  }
})

function get_path_id(path) {
  return PAGE_REGEX.exec(page)[1]
}

// Saves a Github page to the disk.  Will only be called when a page has been modified.
async function save_github_page_to_disk(page, page_id) {
  let new_content = await request(`https://raw.githubusercontent.com/${REPO_URL}/master/${page[0]}`)
  fs.writeFileSync(page, new_content)
  upload_disk_to_mybb(page, page_id)
}

// Saves a MyBB page to the disk and updates Github if the file has changed.
async function save_mybb_page_to_disk(page, page_id) {
  let new_content = JSON.parse(await request(`${MYBB_URL}/xmlhttp.php?action=edit_post&do=get_post&pid=${page_id}&id=pid_${page_id}`))
  if (new_content != fs.readFileSync(`../pages/${page}`, { encoding: 'utf-8'})) {
    fs.writeFileSync(page, new_content)
    upload_disk_to_github(page)
  }
}

// Uploads a file from disk to Github, will still create a commit even if the file hasn't changed.
async function upload_disk_to_github(page) {
  let path = `pages/${page}`
  github.repos.updateFile({
    owner: REPO_USER,
    repo: REPO_NAME,
    path,
    message: 'Sync ' + page,
    content: btoa(fs.readFileSync(`../${path}`, { encoding: 'utf-8'})),
    sha: (JSON.parse(await request({ uri: `https://api.github.com/repos/${REPO_URL}/contents/${path}`, headers}))).sha
  })
}

// Uploads a file from disk to MyBB, will still edit even if the file hasn't changed.
async function upload_disk_to_mybb(page, page_id) {
  let content = fs.readFileSync(`../${file}`, { encoding: 'utf-8'})
  await request({
    uri: `${MYBB_URL}/xmlhttp.php?action=edit_post&do=update_post&pid=${post_id}&my_post_key=${process.env.MY_POST_KEY}`,
    method: 'POST',
    formData: {
      value: content,
      id: `pid_${page_id}`,
      editreason: 'Sync with Github'
    }
  })
}

;(async () => {
  setInterval(() => {
    for (let file of fs.readdirSync('../pages/')) {
      let path = `pages/${file}`
      save_mybb_page_to_disk(path, get_path_id(path))
    }
  }, 1000 * 60 * 5) // 5 minutes
})()

app.listen(7990, function () {
  console.log('Example app listening on port 7990!')
})