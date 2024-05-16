chrome.storage.sync.get(["fullPrompt"], function (result) {
  if (result.fullPrompt) {
    const fullPrompt = result.fullPrompt;

    const checkTextarea = setInterval(() => {
      const textarea = document.querySelector("textarea#prompt-textarea");
      if (textarea) {
        textarea.value = fullPrompt;
        const event = new Event("input", { bubbles: true });
        textarea.dispatchEvent(event);

        // 送信ボタンを探してクリック
        const sendButtonCheck = setInterval(() => {
          const sendButton = document.querySelector(
            "button.mb-1.mr-1.flex.h-8.w-8.items-center.justify-center.rounded-full.bg-black.text-white"
          );
          if (sendButton) {
            sendButton.click();
            clearInterval(sendButtonCheck);
          }
        }, 100);

        clearInterval(checkTextarea);
      }
    }, 100);
  }
});
