# mybb_git_hook

Monitor and sync posts between MyBB and Github.  Allows you to have pull requests to update pages, history, etc.

### Usage

1. Create a `.env` file in the `scripts` folder.  It should have the following layout:

```
MYBB_USER=example_mybb_user_key
PHP_SESSION_ID=example_php_session_
SID=example_sid
MY_POST_KEY=example_post_key
GH_USERNAME=example@example.com
GH_PASSWORD=example123
```

2. Edit the constants at the top of `index.js` to match the repository you are using, as well as the MyBB forum URL.

3. Run `node index.js`.

4. Add each page to `pages/` with a title in the format of `post_id - Some Human Name.mybb`.  It should match the following regular expression:

```
const PAGE_REGEX = /^pages\/([0-9]+) - (.*)\.mybb$/
```