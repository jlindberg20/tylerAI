// gmailActions.js
// Master control module for DOM interactions with Gmail

const waitForElement = (selector, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const interval = 100;
    let elapsed = 0;
    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      elapsed += interval;
      if (elapsed >= timeout) return reject("Timeout waiting for element: " + selector);
      setTimeout(check, interval);
    };
    check();
  });
};

const GmailActions = {
  navigation: {
    openInbox: async () => {
      const inboxLink = await waitForElement("a[title^='Inbox']");
      inboxLink.click();
    },
    openSpam: async () => {
      const spamLink = await waitForElement("a[title^='Spam']");
      spamLink.click();
    },
    openTrash: async () => {
      const trashLink = await waitForElement("a[title^='Trash']");
      trashLink.click();
    },
    searchInbox: async (query) => {
      const searchBox = await waitForElement("input[name='q']");
      searchBox.focus();
      searchBox.value = query;
      searchBox.dispatchEvent(new InputEvent("input", { bubbles: true }));
      const searchButton = await waitForElement("button[aria-label='Search Mail']");
      searchButton.click();
    }
  },

  threads: {
    openLatestThread: async () => {
      const firstThread = await waitForElement("tr.zA");
      firstThread.click();
    },
    openThreadBySubject: async (subjectText) => {
      const threads = [...document.querySelectorAll("tr.zA")];
      const target = threads.find(row => row.innerText.includes(subjectText));
      if (target) target.click();
    }
  },

  compose: {
    openNew: async () => {
      const composeBtn = await waitForElement(".T-I.T-I-KE.L3");
      composeBtn.click();
    },
    insertTo: async (recipients) => {
      const toField = await waitForElement("textarea[name='to']");
      toField.value = recipients.join(", ");
      toField.dispatchEvent(new InputEvent("input", { bubbles: true }));
    },
    insertCc: async (recipients) => {
      const ccToggle = document.querySelector("span[aria-label='Add Cc recipients']");
      if (ccToggle) ccToggle.click();
      const ccField = await waitForElement("textarea[name='cc']");
      ccField.value = recipients.join(", ");
      ccField.dispatchEvent(new InputEvent("input", { bubbles: true }));
    },
    insertBcc: async (recipients) => {
      const bccToggle = document.querySelector("span[aria-label='Add Bcc recipients']");
      if (bccToggle) bccToggle.click();
      const bccField = await waitForElement("textarea[name='bcc']");
      bccField.value = recipients.join(", ");
      bccField.dispatchEvent(new InputEvent("input", { bubbles: true }));
    },
    insertSubject: async (subject) => {
      const subjectField = await waitForElement("input[name='subjectbox']");
      subjectField.value = subject;
      subjectField.dispatchEvent(new InputEvent("input", { bubbles: true }));
    },
    insertBody: async (text) => {
      const bodyField = await waitForElement("div[aria-label='Message Body']");
      bodyField.focus();
      document.execCommand("insertText", false, text);
    },
    clickSend: async () => {
      const sendBtn = await waitForElement("div[aria-label*='Send'][role='button']");
      sendBtn.click();
    },
    discardDraft: async () => {
      const closeBtn = document.querySelector("img.Ha");
      if (closeBtn) closeBtn.click();
    },
    addAttachment: async (fileInputElement) => {
      const attachBtn = await waitForElement("div[command='Files']");
      attachBtn.click();
      fileInputElement.click();
    }
  },

  messageActions: {
    markAsUnread: async () => {
      const moreBtn = await waitForElement("div[aria-label='More']");
      moreBtn.click();
      const markUnread = await waitForElement("div[act='10']"); // Gmail uses act='10' for mark unread
      markUnread.click();
    },
    deleteEmail: async () => {
      const deleteBtn = await waitForElement("div[aria-label='Delete']");
      deleteBtn.click();
    },
    archiveEmail: async () => {
      const archiveBtn = await waitForElement("div[aria-label='Archive']");
      archiveBtn.click();
    },
    moveTo: async (labelName) => {
      const moveBtn = await waitForElement("div[aria-label='Move to']");
      moveBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500)); // brief delay for dropdown
      const labelOption = [...document.querySelectorAll("div[role='menuitem']")]
        .find(el => el.innerText.includes(labelName));
      if (labelOption) labelOption.click();
    }
  }
};

export default GmailActions;




/* HERE IS HOW YOU CALL THIS FILE IN OTHER FILES 

import GmailActions from './gmailActions.js';

await GmailActions.compose.insertBody("Let's meet tomorrow at 3PM.");
await GmailActions.compose.clickSend();

*/

// TESTING SUPER BRIGHT GREEN GIT COMMIT COLORCODE CHART COMPARISON... TEST 2
