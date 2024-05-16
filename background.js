chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getPRDiff") {
    chrome.cookies.set({
      url: "https://api.github.com",
      name: "SameSite",
      value: "None",
      secure: true,
    });
    getPRDiff(message.tabUrl)
      .then((prDiff) => sendResponse({ prDiff }))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Indicates that the response will be sent asynchronously
  }
});

async function getPRDiff(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) throw new Error("PR情報を取得できませんでした。");

  const owner = match[1];
  const repo = match[2];
  const prNumber = match[3];

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;

  const token = await new Promise((resolve, reject) => {
    chrome.storage.sync.get(["githubTokens"], function (result) {
      const githubTokens = result.githubTokens || {};
      const token = githubTokens[`${owner}/${repo}`];
      if (token) {
        resolve(token);
      } else {
        reject(new Error("リポジトリに対応するトークンが保存されていません。"));
      }
    });
  });

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `token ${token}`,
    },
  });

  if (!response.ok) throw new Error("PRの差分を取得できませんでした。");

  const files = await response.json();
  let diff = "";
  files.forEach((file) => {
    diff += `File: ${file.filename}\n${file.patch}\n\n`;
  });
  return diff;
}
