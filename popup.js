document.addEventListener("DOMContentLoaded", function () {
  const executeButton = document.getElementById("executeButton");
  const promptTextArea = document.getElementById("prompt");
  const codeDiffPre = document.getElementById("codeDiff");
  const savedPromptsSelect = document.getElementById("savedPrompts");
  const savePromptButton = document.getElementById("savePromptButton");
  const deletePromptButton = document.getElementById("deletePromptButton");
  const repoNameInput = document.getElementById("repoName");
  const githubTokenInput = document.getElementById("githubToken");
  const saveTokenButton = document.getElementById("saveTokenButton");
  const deleteTokenButton = document.getElementById("deleteTokenButton");
  const savedTokensSelect = document.getElementById("savedTokens");
  const editTokenButton = document.getElementById("editTokenButton");
  const tokenEditForm = document.getElementById("tokenEditForm");

  // 初期設定
  const defaultPrompt = "プロンプトを登録してください";
  const defaultTokenHint = "トークンを追加してください。";

  // トークン編集フォームの開閉
  editTokenButton.addEventListener("click", function () {
    if (tokenEditForm.style.display === "block") {
      tokenEditForm.style.display = "none";
    } else {
      tokenEditForm.style.display = "block";
    }
  });

  // 保存されたプロンプトを読み込む
  chrome.storage.sync.get(["savedPrompts"], function (result) {
    const savedPrompts = result.savedPrompts || [];
    if (savedPrompts.length > 0) {
      promptTextArea.value = savedPrompts[0];
      populateSavedPrompts(savedPrompts);
      savedPromptsSelect.style.display = "block";
    } else {
      promptTextArea.placeholder = defaultPrompt;
    }
  });

  // プロンプト選択時のイベント
  savedPromptsSelect.addEventListener("change", function () {
    promptTextArea.value = savedPromptsSelect.value;
  });

  // GitHubのPR差分を取得
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs[0];
    const tabUrl = tab.url;
    chrome.storage.sync.get(["githubTokens"], function (result) {
      const githubTokens = result.githubTokens || {};
      const repoMatch = tabUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      const repoKey = repoMatch ? `${repoMatch[1]}/${repoMatch[2]}` : null;
      const token = repoKey ? githubTokens[repoKey] : null;

      if (token) {
        chrome.runtime.sendMessage(
          { action: "getPRDiff", tabUrl: tabUrl },
          function (response) {
            if (response && response.prDiff) {
              const formattedDiff = formatDiff(response.prDiff);
              codeDiffPre.innerHTML = formattedDiff;
            } else {
              codeDiffPre.innerHTML =
                '<span class="error-text">コードの差分の読み込みに失敗しました。\nGitHubのPRページで実行してください。</span>';
            }
          }
        );
      } else {
        codeDiffPre.innerHTML =
          '<span class="error-text">トークンを保存してください。</span>';
      }
    });
  });

  // PRの差分とプロンプトを共にChatGPTに送信
  executeButton.addEventListener("click", function () {
    const prompt = promptTextArea.value;
    const prDiff = codeDiffPre.textContent;
    const fullPrompt = `${prompt}\n\nPR Diff:\n${prDiff}`;
    chrome.storage.local.set(
      { fullPrompt: fullPrompt, openChatGPT: true },
      function () {
        openChatGPT();
      }
    );
  });

  // プロンプトの保存
  savePromptButton.addEventListener("click", function () {
    const prompt = promptTextArea.value;
    chrome.storage.sync.get(["savedPrompts"], function (result) {
      let savedPrompts = result.savedPrompts || [];
      if (!savedPrompts.includes(prompt)) {
        if (savedPrompts.length >= 5) {
          savedPrompts.pop();
        }
        savedPrompts.unshift(prompt);
        chrome.storage.sync.set({ savedPrompts: savedPrompts }, function () {
          populateSavedPrompts(savedPrompts);
        });
      }
    });
  });

  // プロンプトの削除
  deletePromptButton.addEventListener("click", function () {
    const prompt = promptTextArea.value;
    chrome.storage.sync.get(["savedPrompts"], function (result) {
      let savedPrompts = result.savedPrompts || [];
      savedPrompts = savedPrompts.filter((p) => p !== prompt);
      chrome.storage.sync.set({ savedPrompts: savedPrompts }, function () {
        populateSavedPrompts(savedPrompts);
        promptTextArea.value = savedPrompts.length > 0 ? savedPrompts[0] : "";
        if (savedPrompts.length === 0) {
          promptTextArea.placeholder = defaultPrompt;
        }
      });
    });
  });

  function populateSavedPrompts(prompts) {
    savedPromptsSelect.innerHTML = "";
    prompts.forEach((prompt) => {
      const truncatedPrompt =
        prompt.length > 15 ? prompt.substring(0, 25) + "…" : prompt;
      const option = document.createElement("option");
      option.value = prompt;
      option.textContent = truncatedPrompt;
      savedPromptsSelect.appendChild(option);
    });
    if (prompts.length > 0) {
      savedPromptsSelect.value = prompts[0];
    }
  }

  function openChatGPT() {
    const url = `https://chatgpt.com/?oai-dm=1`;
    chrome.tabs.create({ url: url });
  }

  function formatDiff(diff) {
    const lines = diff.split("\n");
    return lines
      .map((line) => {
        if (line.startsWith("-")) {
          return `<span class="removed">${line}</span>`;
        } else if (line.startsWith("+")) {
          return `<span class="added">${line}</span>`;
        } else {
          return line;
        }
      })
      .join("\n");
  }

  // トークンの保存
  saveTokenButton.addEventListener("click", function () {
    const repo = repoNameInput.value;
    const token = githubTokenInput.value;
    if (repo && token) {
      chrome.storage.sync.get(["githubTokens"], function (result) {
        let githubTokens = result.githubTokens || {};
        githubTokens[repo] = token;
        chrome.storage.sync.set({ githubTokens: githubTokens }, function () {
          alert("トークンが保存されました！");
          repoNameInput.value = "";
          githubTokenInput.value = "";
          populateSavedTokens(githubTokens);
        });
      });
    } else {
      alert("リポジトリ名とトークンを入力してください。");
    }
  });

  // トークンの削除
  deleteTokenButton.addEventListener("click", function () {
    const repo = savedTokensSelect.value;
    if (repo) {
      chrome.storage.sync.get(["githubTokens"], function (result) {
        let githubTokens = result.githubTokens || {};
        delete githubTokens[repo];
        chrome.storage.sync.set({ githubTokens: githubTokens }, function () {
          alert("トークンが削除されました！");
          populateSavedTokens(githubTokens);
        });
      });
    } else {
      alert("削除するリポジトリを選択してください。");
    }
  });

  // 保存されたトークンを読み込む
  chrome.storage.sync.get(["githubTokens"], function (result) {
    const githubTokens = result.githubTokens || {};
    populateSavedTokens(githubTokens);
  });

  function populateSavedTokens(tokens) {
    savedTokensSelect.innerHTML = "";
    const tokenKeys = Object.keys(tokens);
    if (tokenKeys.length > 0) {
      tokenKeys.forEach((repo) => {
        const option = document.createElement("option");
        option.value = repo;
        option.textContent = repo;
        savedTokensSelect.appendChild(option);
      });
      savedTokensSelect.value = tokenKeys[0];
    } else {
      const hint = document.createElement("option");
      hint.textContent = defaultTokenHint;
      savedTokensSelect.appendChild(hint);
    }
  }
});
